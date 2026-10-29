#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.url);
const resources = path.join(path.dirname(script), "pstack");
const home = os.homedir();
const root = path.resolve(
  process.env.PSTACK_HOME ||
    (process.platform === "win32"
      ? path.join(
          process.env.LOCALAPPDATA || path.join(home, "AppData", "Local"),
          "pstack",
        )
      : process.platform === "darwin"
        ? path.join(home, "Library", "Application Support", "pstack")
        : path.join(
            process.env.XDG_DATA_HOME || path.join(home, ".local", "share"),
            "pstack",
          )),
);
const configPath = path.join(root, "config.json");
const managed = "<!-- pstack-managed: true -->";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readOptional(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

function atomicWrite(file, contents) {
  if (readOptional(file) === contents) {
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, contents, { flag: "wx", mode: 0o600 });
    fs.renameSync(temporary, file);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function config(required = true) {
  const contents = readOptional(configPath);
  if (contents === undefined) {
    if (required) {
      throw new Error(
        "pstack is not configured. Run shared-utils-pstack setup --source <installed-pstack-directory>.",
      );
    }
    return undefined;
  }
  const value = JSON.parse(contents);
  if (
    value?.version !== 1 ||
    typeof value.source !== "string" ||
    !path.isAbsolute(value.source) ||
    typeof value.promptDirectory !== "string" ||
    !path.isAbsolute(value.promptDirectory) ||
    !validUpgradeCommand(value.upgradeCommand)
  ) {
    throw new Error(`Invalid pstack configuration: ${configPath}`);
  }
  return value;
}

function validUpgradeCommand(value) {
  return (
    value === null ||
    (Array.isArray(value) &&
      value.length > 0 &&
      value.every((arg) => typeof arg === "string" && arg.length > 0))
  );
}

function withLock(action) {
  fs.mkdirSync(root, { recursive: true });
  const lock = path.join(root, "operation.lock");
  let descriptor;
  try {
    descriptor = fs.openSync(lock, "wx", 0o600);
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new Error(
        `Another pstack operation holds ${lock}. Check its recorded PID before removing an abandoned lock.`,
      );
    }
    throw error;
  }
  try {
    fs.writeFileSync(
      descriptor,
      JSON.stringify({ pid: process.pid, host: os.hostname() }),
    );
    return action();
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}

function command(executable, args, directory, timeout = 10000) {
  const result = spawnSync(executable, args, {
    cwd: directory,
    encoding: "utf8",
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `${path.basename(executable)} failed: ${result.error?.message || result.stderr?.trim() || `exit ${result.status}`}`,
    );
  }
  return result.stdout.trim();
}

function git(directory, args, timeout) {
  return command(
    "git",
    ["-c", `core.hooksPath=${path.join(root, "empty-hooks")}`, ...args],
    directory,
    timeout,
  );
}

function field(source, name) {
  const header = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if (!header) {
    throw new Error("Missing skill front matter");
  }
  const lines = header.split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith(`${name}:`));
  if (index < 0) {
    throw new Error(`Missing skill ${name}`);
  }
  let value = lines[index].slice(name.length + 1).trim();
  if (/^[>|][-+]?\s*$/.test(value)) {
    const continuation = [];
    for (const line of lines.slice(index + 1)) {
      if (line.trim() && !/^\s/.test(line)) {
        break;
      }
      continuation.push(line.trim());
    }
    value = continuation.join(" ").trim();
  } else if (value.startsWith('"')) {
    value = JSON.parse(value);
  } else if (value.startsWith("'") && value.endsWith("'")) {
    value = value.slice(1, -1).replaceAll("''", "'");
  }
  if (!value) {
    throw new Error(`Empty skill ${name}`);
  }
  return value;
}

function inside(directory, file) {
  const actual = fs.realpathSync(file);
  const relative = path.relative(fs.realpathSync(directory), actual);
  if (
    relative.startsWith(`..${path.sep}`) ||
    relative === ".." ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Resource escapes installation: ${file}`);
  }
  return actual;
}

function sourceRoot(source) {
  const directory = path.resolve(source);
  for (const candidate of [directory, path.join(directory, "pstack")]) {
    if (
      fs.existsSync(path.join(candidate, "skills", "poteto-mode", "SKILL.md"))
    ) {
      return fs.realpathSync(candidate);
    }
  }
  throw new Error(
    `No pstack installation found at ${directory}. Install pstack normally or use a regular upstream Git checkout, then configure its pstack directory.`,
  );
}

function skill(directory, name) {
  if (!slugPattern.test(name)) {
    throw new Error(`Invalid pstack skill name: ${name}`);
  }
  const file = path.join(directory, "skills", name, "SKILL.md");
  if (!fs.existsSync(file)) {
    throw new Error(
      `Unknown pstack skill: ${name}. Use help to list installed workflows.`,
    );
  }
  const actual = inside(directory, file);
  const source = fs.readFileSync(actual, "utf8");
  field(source, "name");
  return { name, purpose: field(source, "description"), file: actual };
}

function skills(directory) {
  return fs
    .readdirSync(path.join(directory, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && slugPattern.test(entry.name))
    .map((entry) => skill(directory, entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function revision(directory) {
  let current = directory;
  while (!fs.existsSync(path.join(current, ".git"))) {
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
  const marker = path.join(current, ".git");
  const pointer = fs.statSync(marker).isDirectory()
    ? undefined
    : readOptional(marker)
        ?.trim()
        .match(/^gitdir: (.+)$/)?.[1];
  const gitDirectory = pointer ? path.resolve(current, pointer) : marker;
  const head = readOptional(path.join(gitDirectory, "HEAD"))?.trim();
  if (!head) {
    return null;
  }
  if (/^[a-f0-9]{40,64}$/.test(head)) {
    return head;
  }
  const reference = head.match(/^ref: (refs\/[A-Za-z0-9._/-]+)$/)?.[1];
  if (!reference || reference.includes("..")) {
    throw new Error(`Invalid Git HEAD metadata in ${gitDirectory}`);
  }
  const common = readOptional(path.join(gitDirectory, "commondir"))?.trim();
  const commonDirectory = common
    ? path.resolve(gitDirectory, common)
    : gitDirectory;
  const loose =
    readOptional(path.join(gitDirectory, reference)) ||
    readOptional(path.join(commonDirectory, reference));
  if (loose && /^[a-f0-9]{40,64}$/.test(loose.trim())) {
    return loose.trim();
  }
  const packed = readOptional(path.join(commonDirectory, "packed-refs")) || "";
  const entry = packed
    .split(/\r?\n/)
    .map((line) => line.split(" "))
    .find(
      ([hash, name]) => /^[a-f0-9]{40,64}$/.test(hash) && name === reference,
    );
  return entry?.[0] || null;
}

function promptDirectory() {
  if (process.env.PSTACK_PROMPTS_DIR) {
    return path.resolve(process.env.PSTACK_PROMPTS_DIR);
  }
  const candidates = [
    path.join(home, ".vscode-server", "data", "User", "prompts"),
    path.join(
      process.env.APPDATA || path.join(home, "AppData", "Roaming"),
      "Code",
      "User",
      "prompts",
    ),
    path.join(
      process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
      "Code",
      "User",
      "prompts",
    ),
    path.join(
      home,
      "Library",
      "Application Support",
      "Code",
      "User",
      "prompts",
    ),
  ];
  return (
    candidates.find((candidate) => fs.existsSync(candidate)) ||
    (process.platform === "win32"
      ? candidates[1]
      : process.platform === "darwin"
        ? candidates[3]
        : candidates[2])
  );
}

function deployment(value) {
  const source = path.join(value.promptDirectory, "pstack.prompt.md");
  const nativeSkill = path.join(
    home,
    ".agents",
    "skills",
    "pstack",
    "SKILL.md",
  );
  const legacySkill = path.join(
    process.env.CODEX_HOME || path.join(home, ".codex"),
    "skills",
    "pstack",
    "SKILL.md",
  );
  const prompt = fs.readFileSync(
    path.join(resources, "pstack.prompt.md"),
    "utf8",
  );
  const compatibility = fs.readFileSync(
    path.join(resources, "compatibility.md"),
    "utf8",
  );
  const native = `---\nname: pstack\ndescription: Run an installed pstack workflow, show help, or upgrade pstack.\n---\n\n<!-- spec-kit-bridge-managed: global -->\n<!-- spec-kit-bridge-owner: user-global -->\n<!-- spec-kit-bridge-prompt-id: pstack -->\n<!-- spec-kit-bridge-source: ${source} -->\n${managed}\n\nRead the complete [source prompt](<${source.split(path.sep).join("/")}>). Follow its body with the text after pstack as its arguments. Keep repository instructions in force. If the source is missing, report that the global prompt is unavailable.\n`;
  for (const [file, marker] of [
    [source, managed],
    [nativeSkill, `<!-- spec-kit-bridge-source: ${source} -->`],
  ]) {
    if (
      fs.existsSync(file) &&
      (!fs.lstatSync(file).isFile() ||
        (file === source && !fs.readFileSync(file, "utf8").includes(marker)) ||
        (file === nativeSkill && !managedNativeSkill(file, source)))
    ) {
      throw new Error(`Preserving unmanaged entry: ${file}`);
    }
  }
  if (
    fs.existsSync(path.dirname(nativeSkill)) &&
    fs.lstatSync(path.dirname(nativeSkill)).isSymbolicLink()
  ) {
    throw new Error(
      `Preserving symlinked skill directory: ${path.dirname(nativeSkill)}`,
    );
  }
  if (fs.existsSync(legacySkill)) {
    throw new Error(
      `An existing legacy pstack skill would duplicate the shared entry: ${legacySkill}. Resolve that collision before setup.`,
    );
  }
  return { source, nativeSkill, prompt, compatibility, native };
}

function managedNativeSkill(file, source) {
  const contents = fs.readFileSync(file, "utf8");
  const recorded = contents.match(
    /^<!-- spec-kit-bridge-source: (.+) -->$/m,
  )?.[1];
  return (
    contents.includes("<!-- spec-kit-bridge-managed: global -->") &&
    contents.includes("<!-- spec-kit-bridge-owner: user-global -->") &&
    contents.includes("<!-- spec-kit-bridge-prompt-id: pstack -->") &&
    (recorded === source ||
      (recorded &&
        fs.existsSync(recorded) &&
        fs.existsSync(source) &&
        fs.realpathSync(recorded) === fs.realpathSync(source)))
  );
}

function deploy(value) {
  const target = deployment(value);
  atomicWrite(path.join(root, "pstack.mjs"), fs.readFileSync(script, "utf8"));
  atomicWrite(path.join(root, "pstack", "pstack.prompt.md"), target.prompt);
  atomicWrite(
    path.join(root, "pstack", "compatibility.md"),
    target.compatibility,
  );
  if (!fs.existsSync(path.join(root, "overrides.md"))) {
    atomicWrite(
      path.join(root, "overrides.md"),
      "# Machine-specific pstack overrides\n\nAdd local tool or environment adjustments here.\n",
    );
  }
  atomicWrite(target.source, target.prompt);
  if (!fs.existsSync(target.nativeSkill)) {
    atomicWrite(target.nativeSkill, target.native);
  }
}

function upgrade(value) {
  const directory = sourceRoot(value.source);
  const before = revision(directory);
  if (value.upgradeCommand) {
    console.log(
      command(
        value.upgradeCommand[0],
        value.upgradeCommand.slice(1),
        directory,
        180000,
      ),
    );
  } else {
    if (!before) {
      throw new Error(
        "This plugin installation has no Git checkout. Configure --upgrade-command with its normal plugin manager command.",
      );
    }
    if (git(directory, ["status", "--porcelain"])) {
      throw new Error(
        "The pstack source checkout has local changes; preserving them. Resolve those changes before upgrading.",
      );
    }
    git(directory, ["symbolic-ref", "--quiet", "HEAD"]);
    git(directory, ["pull", "--ff-only"], 180000);
  }
  const current = sourceRoot(value.source);
  skills(current);
  deploy(value);
  console.log(
    `pstack source updated through its normal manager: ${before || "plugin"} -> ${revision(current) || "plugin"}`,
  );
}

function help(value, selected) {
  console.log("pstack <skill> [task] | run <skill> [task]\n");
  console.log(
    "help [skill]  List arguments and workflows, or describe one workflow.\nlist          List installed workflows and their purposes.\nstatus        Show the upstream source, revision, and local adapter paths.\nupgrade       Update through Git or the configured normal plugin manager.\nsync          Refresh managed entry points without upgrading upstream.\nsetup         Point at an existing installation: --source DIRECTORY [--prompts DIRECTORY] [--upgrade-command JSON_ARRAY].\n",
  );
  if (!value) {
    console.log(
      "No source configured. Install pstack normally, then run shared-utils-pstack setup --source <pstack-directory>.",
    );
    return;
  }
  const entries = skills(sourceRoot(value.source));
  if (selected) {
    const entry = entries.find((candidate) => candidate.name === selected);
    if (!entry) {
      throw new Error(`Unknown pstack skill: ${selected}`);
    }
    console.log(`${entry.name}: ${entry.purpose}`);
  } else {
    for (const entry of entries) {
      console.log(`${entry.name}: ${entry.purpose}`);
    }
  }
}

function main(args) {
  const [requestedAction = "help", ...rest] = args;
  const action = ["--help", "-h"].includes(requestedAction)
    ? "help"
    : requestedAction;
  if (["help", "list"].includes(action)) {
    if (rest.length > (action === "help" ? 1 : 0)) {
      throw new Error("Usage: help [skill] | list");
    }
    help(config(false), rest[0]);
    return;
  }
  if (action === "setup") {
    const options = {};
    for (let i = 0; i < rest.length; i += 2) {
      if (
        !["--source", "--prompts", "--upgrade-command"].includes(rest[i]) ||
        !rest[i + 1] ||
        options[rest[i]]
      ) {
        throw new Error(
          "Usage: setup --source DIRECTORY [--prompts DIRECTORY] [--upgrade-command JSON_ARRAY]",
        );
      }
      options[rest[i]] = rest[i + 1];
    }
    withLock(() => {
      const previous = config(false);
      if (!options["--source"] && !previous) {
        throw new Error(
          "Provide --source with an existing pstack installation. This adapter does not install or clone pstack.",
        );
      }
      const source = sourceRoot(options["--source"] || previous.source);
      skills(source);
      const upgradeCommand = options["--upgrade-command"]
        ? JSON.parse(options["--upgrade-command"])
        : previous?.upgradeCommand || null;
      if (!validUpgradeCommand(upgradeCommand)) {
        throw new Error(
          "--upgrade-command must be a nonempty JSON array of executable and arguments; shell command strings are not accepted.",
        );
      }
      const value = {
        version: 1,
        source,
        promptDirectory: path.resolve(
          options["--prompts"] ||
            previous?.promptDirectory ||
            promptDirectory(),
        ),
        upgradeCommand,
      };
      deploy(value);
      atomicWrite(configPath, `${JSON.stringify(value, null, 2)}\n`);
      console.log(`Configured existing pstack source: ${source}`);
    });
    return;
  }
  if (
    action === "sync" &&
    rest[0] === "--if-installed" &&
    rest.length === 1 &&
    !config(false)
  ) {
    return;
  }
  const value = config();
  if (action === "status" && !rest.length) {
    const directory = sourceRoot(value.source);
    console.log(
      JSON.stringify(
        {
          ...value,
          revision: revision(directory),
          installationRoot: directory,
          manager: path.join(root, "pstack.mjs"),
          localOverridesPath: path.join(root, "overrides.md"),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (action === "resolve" && rest.length === 1) {
    const directory = sourceRoot(value.source);
    const entry = skill(directory, rest[0]);
    console.log(
      JSON.stringify(
        {
          revision: revision(directory),
          installationRoot: directory,
          skillPath: entry.file,
          compatibilityPath: path.join(root, "pstack", "compatibility.md"),
          localOverridesPath: path.join(root, "overrides.md"),
          promptDirectory: value.promptDirectory,
        },
        null,
        2,
      ),
    );
    return;
  }
  if (
    action === "sync" &&
    (!rest.length || (rest.length === 1 && rest[0] === "--if-installed"))
  ) {
    withLock(() => {
      const current = config();
      sourceRoot(current.source);
      deploy(current);
    });
    return;
  }
  if (action === "upgrade" && !rest.length) {
    withLock(() => upgrade(config()));
    return;
  }
  throw new Error(
    `Unknown command or invalid arguments: ${action}. Use help. Skill source paths are available through resolve <skill>.`,
  );
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`pstack: ${error.message}`);
  process.exitCode = 1;
}
