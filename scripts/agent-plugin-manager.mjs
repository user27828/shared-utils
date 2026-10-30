#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(import.meta.url);
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
const profiles = Object.freeze({
  pstack: {
    id: "pstack",
    label: "pstack",
    sourceMarker: "poteto-mode",
    adapterSkill: "pstack",
    description: "Run an installed pstack workflow, show help, or upgrade pstack.",
    promptFile: "pstack.prompt.md",
    compatibilityFile: "compatibility.md",
    managedPrompt: "<!-- pstack-managed: true -->",
    managerFile: "pstack.mjs",
  },
  thermos: {
    id: "thermos",
    label: "Thermos",
    sourceMarker: "thermos",
    adapterSkill: "thermos",
    description: "Run Thermos workflows, show help, or manage the installed plugin.",
    promptFile: "thermos.prompt.md",
    compatibilityFile: "compatibility.md",
    managedPrompt: "<!-- thermos-managed: true -->",
    managerFile: "thermos.mjs",
    mirroredSkill: "thermo-nuclear-code-quality-review",
  },
});
const managedSkillMarker = /^<!-- shared-utils-agent-tools-source-sha256: ([a-f0-9]{64}) -->\r?\n/m;
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

function config(required = true, pluginName = "pstack") {
  const contents = readOptional(configPath);
  if (contents === undefined) {
    if (required) {
      throw new Error(
        `${pluginName} is not configured. Run shared-utils-${pluginName} setup --source <installed-plugin-directory>.`,
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

function sourceRoot(source, pluginName = "pstack") {
  const profile = profiles[pluginName];
  const directory = path.resolve(source);
  for (const candidate of [directory, path.join(directory, profile.id)]) {
    if (
      fs.existsSync(
        path.join(candidate, "skills", profile.sourceMarker, "SKILL.md"),
      )
    ) {
      return fs.realpathSync(candidate);
    }
  }
  throw new Error(
    `No ${profile.label} installation found at ${directory}. Install the plugin normally or use a regular upstream Git checkout, then configure its source directory.`,
  );
}

function checkoutRoot(directory) {
  let current = path.resolve(directory);
  while (!fs.existsSync(path.join(current, ".git"))) {
    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
  return fs.realpathSync(current);
}

function pluginSource(value, pluginName) {
  if (pluginName === "pstack") {
    return sourceRoot(value.source, "pstack");
  }
  const pstackDirectory = sourceRoot(value.source, "pstack");
  const repository = checkoutRoot(pstackDirectory) || path.dirname(pstackDirectory);
  return sourceRoot(path.join(repository, pluginName), pluginName);
}

function configuredPstackSource(source, pluginName) {
  if (pluginName === "pstack") {
    return sourceRoot(source, "pstack");
  }
  const pluginDirectory = sourceRoot(source, pluginName);
  const repository = checkoutRoot(pluginDirectory) || path.dirname(pluginDirectory);
  return sourceRoot(path.join(repository, "pstack"), "pstack");
}

function skill(directory, name, pluginName = "pstack") {
  if (!slugPattern.test(name)) {
    throw new Error(`Invalid ${profiles[pluginName].label} skill name: ${name}`);
  }
  const file = path.join(directory, "skills", name, "SKILL.md");
  if (!fs.existsSync(file)) {
    throw new Error(
      `Unknown ${profiles[pluginName].label} skill: ${name}. Use help to list installed workflows.`,
    );
  }
  const actual = inside(directory, file);
  const source = fs.readFileSync(actual, "utf8");
  field(source, "name");
  return { name, purpose: field(source, "description"), file: actual };
}

function skills(directory, pluginName = "pstack") {
  return fs
    .readdirSync(path.join(directory, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && slugPattern.test(entry.name))
    .map((entry) => skill(directory, entry.name, pluginName))
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

const previousThermosAdapter = Object.freeze({
  adapterSkill: "thermos-manager",
  description: "Run or manage installed Thermos review workflows.",
  promptFile: "thermos-manager.prompt.md",
  managedPrompt: "<!-- thermos-manager-managed: true -->",
});
// Only retire the exact generated prompt from the previous adapter name.
const previousThermosPromptSha256 =
  "82cf9fde35f8225bee09dfb60147d8051028fd9f62ea4284620ef9555fda2803";

function nativeSkillContents(profile, source) {
  return `---\nname: ${profile.adapterSkill}\ndescription: ${profile.description}\n---\n\n<!-- spec-kit-bridge-managed: global -->\n<!-- spec-kit-bridge-owner: user-global -->\n<!-- spec-kit-bridge-prompt-id: ${profile.adapterSkill} -->\n<!-- spec-kit-bridge-source: ${source.split(path.sep).join("/")} -->\n${profile.managedPrompt}\n\nRead the complete [source prompt](<${source.split(path.sep).join("/")}>). Follow its body with the text after ${profile.id} as its arguments. Keep repository instructions in force. If the source is missing, report that the global prompt is unavailable.\n`;
}

function previousThermosAdapterTargets(value, pluginName) {
  if (pluginName !== "thermos") {
    return undefined;
  }
  const source = path.join(value.promptDirectory, previousThermosAdapter.promptFile);
  const nativeSkill = path.join(
    home,
    ".agents",
    "skills",
    previousThermosAdapter.adapterSkill,
    "SKILL.md",
  );
  return {
    source,
    nativeSkill,
    expectedNative: nativeSkillContents(
      { ...previousThermosAdapter, id: "thermos" },
      source,
    ),
  };
}

function retirePreviousThermosAdapter(previous) {
  if (!previous) {
    return;
  }
  const sourceExists = fs.existsSync(previous.source);
  const skillExists = fs.existsSync(previous.nativeSkill);
  if (!sourceExists && !skillExists) {
    return;
  }
  const sourceMatches =
    !sourceExists ||
    (fs.lstatSync(previous.source).isFile() &&
      sourceHash(fs.readFileSync(previous.source, "utf8")) ===
        previousThermosPromptSha256);
  const skillDirectory = path.dirname(previous.nativeSkill);
  const skillDirectorySafe =
    !fs.existsSync(skillDirectory) || !fs.lstatSync(skillDirectory).isSymbolicLink();
  const skillMatches =
    !skillExists ||
    (skillDirectorySafe &&
      fs.lstatSync(previous.nativeSkill).isFile() &&
      fs.readFileSync(previous.nativeSkill, "utf8") === previous.expectedNative);
  if (!sourceMatches || !skillMatches) {
    console.warn(
      `Preserving customized legacy Thermos adapter entries: ${previous.source} and ${previous.nativeSkill}`,
    );
    return;
  }
  if (sourceExists) {
    fs.unlinkSync(previous.source);
  }
  if (skillExists) {
    fs.unlinkSync(previous.nativeSkill);
    try {
      fs.rmdirSync(path.dirname(previous.nativeSkill));
    } catch (error) {
      if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) {
        throw error;
      }
    }
  }
}

function deployment(value, pluginName = "pstack") {
  const profile = profiles[pluginName];
  const source = path.join(value.promptDirectory, profile.promptFile);
  const nativeSkill = path.join(
    home,
    ".agents",
    "skills",
    profile.adapterSkill,
    "SKILL.md",
  );
  const legacySkill = path.join(
    process.env.CODEX_HOME || path.join(home, ".codex"),
    "skills",
    profile.adapterSkill,
    "SKILL.md",
  );
  const resourceDirectory = path.join(path.dirname(script), profile.id);
  const prompt = fs.readFileSync(
    path.join(resourceDirectory, profile.promptFile),
    "utf8",
  );
  const compatibility = fs.readFileSync(
    path.join(resourceDirectory, profile.compatibilityFile),
    "utf8",
  );
  const native = nativeSkillContents(profile, source);
  for (const [file, marker] of [
    [source, profile.managedPrompt],
    [nativeSkill, `<!-- spec-kit-bridge-source: ${source} -->`],
  ]) {
    if (
      fs.existsSync(file) &&
      (!fs.lstatSync(file).isFile() ||
        (file === source && !fs.readFileSync(file, "utf8").includes(marker)) ||
        (file === nativeSkill && !managedNativeSkill(file, source, profile)))
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
      `An existing legacy ${profile.adapterSkill} skill would duplicate the shared entry: ${legacySkill}. Resolve that collision before setup.`,
    );
  }
  return {
    source,
    nativeSkill,
    prompt,
    compatibility,
    native,
    profile,
    previous: previousThermosAdapterTargets(value, pluginName),
  };
}

function managedNativeSkill(file, source, profile) {
  const contents = fs.readFileSync(file, "utf8");
  const recorded = contents.match(
    /^<!-- spec-kit-bridge-source: (.+) -->$/m,
  )?.[1];
  return (
    contents.includes("<!-- spec-kit-bridge-managed: global -->") &&
    contents.includes("<!-- spec-kit-bridge-owner: user-global -->") &&
    contents.includes(`<!-- spec-kit-bridge-prompt-id: ${profile.adapterSkill} -->`) &&
    (recorded === source ||
      (recorded &&
        fs.existsSync(recorded) &&
        fs.existsSync(source) &&
        fs.realpathSync(recorded) === fs.realpathSync(source)))
  );
}

function deploy(value, pluginName = "pstack", target = deployment(value, pluginName)) {
  const profile = target.profile;
  atomicWrite(path.join(root, "agent-plugin-manager.mjs"), fs.readFileSync(script, "utf8"));
  atomicWrite(
    path.join(root, profile.managerFile),
    `#!/usr/bin/env node\n\nimport { main } from "./agent-plugin-manager.mjs";\n\nmain(process.argv.slice(2), "${pluginName}");\n`,
  );
  atomicWrite(
    path.join(root, profile.id, profile.compatibilityFile),
    target.compatibility,
  );
  if (!fs.existsSync(path.join(root, "overrides.md"))) {
    atomicWrite(
      path.join(root, "overrides.md"),
      "# Machine-specific agent workflow overrides\n\nAdd local tool or environment adjustments here.\n",
    );
  }
  atomicWrite(target.source, target.prompt);
  if (!fs.existsSync(target.nativeSkill)) {
    atomicWrite(target.nativeSkill, target.native);
  }
  retirePreviousThermosAdapter(target.previous);
}


function sourceHash(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function managedSkillSource(contents, target) {
  const match = managedSkillMarker.exec(contents);
  if (!match) {
    return undefined;
  }
  const source = contents.slice(0, match.index) + contents.slice(match.index + match[0].length);
  if (sourceHash(source) !== match[1]) {
    throw new Error(`The installed Thermos skill has local edits; preserving ${target}`);
  }
  return source;
}

function thermosSkillTargets(directory, acceptedUnmanaged = new Map()) {
  const entry = skill(directory, profiles.thermos.mirroredSkill, "thermos");
  return [entry].map((workflow) => {
    const targetDirectory = path.join(home, ".agents", "skills", workflow.name);
    const target = path.join(targetDirectory, "SKILL.md");
    let directoryStat;
    let targetStat;
    try {
      directoryStat = fs.lstatSync(targetDirectory);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    if (directoryStat && (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())) {
      throw new Error(`Preserving non-directory or symlinked skill path: ${targetDirectory}`);
    }
    try {
      targetStat = fs.lstatSync(target);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    if (targetStat && (!targetStat.isFile() || targetStat.isSymbolicLink())) {
      throw new Error(`Preserving non-file or symlinked skill: ${target}`);
    }
    const source = fs.readFileSync(workflow.file, "utf8");
    const current = targetStat ? fs.readFileSync(target, "utf8") : undefined;
    const managed = current === undefined ? undefined : managedSkillSource(current, target);
    if (
      current !== undefined &&
      managed === undefined &&
      current !== source &&
      current !== acceptedUnmanaged.get(target)
    ) {
      throw new Error(`The installed Thermos skill differs from its plugin source; preserving ${target}`);
    }
    const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    if (!frontmatter) {
      throw new Error(`Thermos skill is missing frontmatter; refusing to sync ${workflow.file}`);
    }
    const marker = `<!-- shared-utils-agent-tools-source-sha256: ${sourceHash(source)} -->\n`;
    const updated = source.slice(0, frontmatter[0].length) + marker + source.slice(frontmatter[0].length);
    return { name: workflow.name, targetDirectory, target, current, updated };
  });
}

function syncThermosSkills(directory, dryRun = false) {
  const targets = thermosSkillTargets(directory);
  if (dryRun) {
    console.log("Dry run: would sync the Thermos code-quality skill to the global skill directory.");
    return;
  }
  installThermosSkillTargets(targets);
}

function installThermosSkillTargets(targets) {
  for (const item of targets) {
    let directoryStat;
    try {
      directoryStat = fs.lstatSync(item.targetDirectory);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    if (directoryStat && (!directoryStat.isDirectory() || directoryStat.isSymbolicLink())) {
      throw new Error(`Preserving non-directory or symlinked skill path: ${item.targetDirectory}`);
    }

    let current;
    let targetStat;
    try {
      targetStat = fs.lstatSync(item.target);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
    if (targetStat && (!targetStat.isFile() || targetStat.isSymbolicLink())) {
      throw new Error(`Preserving non-file or symlinked skill: ${item.target}`);
    }
    current = targetStat ? fs.readFileSync(item.target, "utf8") : undefined;
    if (current !== item.current) {
      throw new Error(`Thermos skill changed during sync; preserving ${item.target}`);
    }
    if (current === item.updated) {
      continue;
    }
    fs.mkdirSync(item.targetDirectory, { recursive: true });
    const temporary = `${item.target}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, item.updated, { encoding: "utf8", flag: "wx", mode: 0o644 });
      fs.renameSync(temporary, item.target);
    } finally {
      fs.rmSync(temporary, { force: true });
    }
    console.log(`Updated global Thermos workflow: ${item.target}`);
  }
}

function thermosSourceIfAvailable(value) {
  const pstackDirectory = sourceRoot(value.source, "pstack");
  const repository = checkoutRoot(pstackDirectory) || path.dirname(pstackDirectory);
  const candidate = path.join(repository, "thermos");
  if (!fs.existsSync(candidate)) {
    return undefined;
  }
  return sourceRoot(candidate, "thermos");
}

function connectedPluginPlan(value, acceptedThermosSkills = new Map()) {
  const pstackDirectory = sourceRoot(value.source, "pstack");
  skills(pstackDirectory, "pstack");
  const pstackAdapter = deployment(value, "pstack");
  const thermosDirectory = thermosSourceIfAvailable(value);
  let thermosAdapter;
  let thermosSkillCopies;
  if (thermosDirectory) {
    skills(thermosDirectory, "thermos");
    thermosAdapter = deployment(value, "thermos");
    thermosSkillCopies = thermosSkillTargets(thermosDirectory, acceptedThermosSkills);
  }
  return { pstackAdapter, thermosDirectory, thermosAdapter, thermosSkillCopies };
}

function deployConnectedPlugins(value, acceptedThermosSkills = new Map(), plan = connectedPluginPlan(value, acceptedThermosSkills)) {
  deploy(value, "pstack", plan.pstackAdapter);
  if (plan.thermosDirectory && plan.thermosAdapter && plan.thermosSkillCopies) {
    deploy(value, "thermos", plan.thermosAdapter);
    installThermosSkillTargets(plan.thermosSkillCopies);
  }
}

function upgrade(value, pluginName = "pstack") {
  const directory = pluginSource(value, pluginName);
  const updateDirectory = sourceRoot(value.source, "pstack");
  const before = revision(directory);
  const priorThermosDirectory = thermosSourceIfAvailable(value);
  const acceptedThermosSkills = priorThermosDirectory
    ? new Map(
        thermosSkillTargets(priorThermosDirectory).map((item) => [item.target, item.current]),
      )
    : new Map();
  if (value.upgradeCommand) {
    console.log(
      command(
        value.upgradeCommand[0],
        value.upgradeCommand.slice(1),
        updateDirectory,
        180000,
      ),
    );
  } else {
    if (!before) {
      throw new Error(
        `This ${profiles[pluginName].label} installation has no Git checkout. Configure --upgrade-command with its normal plugin manager command.`,
      );
    }
    if (git(updateDirectory, ["status", "--porcelain"])) {
      throw new Error(
        `The ${profiles[pluginName].label} source checkout has local changes; preserving them. Resolve those changes before upgrading.`,
      );
    }
    git(updateDirectory, ["symbolic-ref", "--quiet", "HEAD"]);
    git(updateDirectory, ["pull", "--ff-only"], 180000);
  }
  const current = pluginSource(value, pluginName);
  skills(current, pluginName);
  deployConnectedPlugins(value, acceptedThermosSkills);
  console.log(
    `${profiles[pluginName].label} source updated through its normal manager: ${before || "plugin"} -> ${revision(current) || "plugin"}`,
  );
}

function help(value, selected, pluginName = "pstack") {
  const profile = profiles[pluginName];
  console.log(`${profile.id} <skill> [task] | run <skill>\n`);
  console.log(
    `help [skill]  List arguments and workflows, or describe one workflow.\nlist          List installed workflows and their purposes.\nstatus        Show the installed source, revision, and adapter paths.\nupgrade       Update through Git or the configured normal plugin manager.\nsync          Refresh managed entry points without upgrading upstream.\nsetup         Point at an existing installation: --source DIRECTORY [--prompts DIRECTORY] [--upgrade-command JSON_ARRAY].\n`,
  );
  if (!value) {
    console.log(
      `No source configured. Install pstack through its normal plugin manager or use a regular upstream Git checkout, then run shared-utils-${pluginName} setup --source <${pluginName}-directory>.`,
    );
    return;
  }
  const directory = pluginSource(value, pluginName);
  const entries = skills(directory, pluginName);
  if (selected) {
    const entry = entries.find((candidate) => candidate.name === selected);
    if (!entry) {
      throw new Error(`Unknown ${profile.label} skill: ${selected}`);
    }
    console.log(`${entry.name}: ${entry.purpose}`);
  } else {
    for (const entry of entries) {
      console.log(`${entry.name}: ${entry.purpose}`);
    }
  }
}

function pluginAdapterInstalled(value, pluginName) {
  const profile = profiles[pluginName];
  const prompt = path.join(value.promptDirectory, profile.promptFile);
  const skillFile = path.join(home, ".agents", "skills", profile.adapterSkill, "SKILL.md");
  return fs.existsSync(prompt) || fs.existsSync(skillFile);
}

function runManager(args, pluginName = "pstack") {
  if (!profiles[pluginName]) {
    throw new Error(`Unknown plugin manager: ${pluginName}`);
  }
  const profile = profiles[pluginName];
  const [requestedAction = "help", ...rest] = args;
  const action = ["--help", "-h"].includes(requestedAction)
    ? "help"
    : requestedAction;
  if (["help", "list"].includes(action)) {
    if (rest.length > (action === "help" ? 1 : 0)) {
      throw new Error("Usage: help [skill] | list");
    }
    help(config(false, pluginName), rest[0], pluginName);
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
          "Usage: setup [--source DIRECTORY] [--prompts DIRECTORY] [--upgrade-command JSON_ARRAY]",
        );
      }
      options[rest[i]] = rest[i + 1];
    }
    withLock(() => {
      const previous = config(false, pluginName);
      if (!options["--source"] && !previous) {
        throw new Error(
          `Provide --source with an existing ${pluginName} installation. This adapter does not install or clone plugins.`,
        );
      }
      const source = options["--source"]
        ? configuredPstackSource(options["--source"], pluginName)
        : sourceRoot(previous.source, "pstack");
      const value = {
        version: 1,
        source,
        promptDirectory: path.resolve(
          options["--prompts"] ||
            previous?.promptDirectory ||
            promptDirectory(),
        ),
        upgradeCommand: options["--upgrade-command"]
          ? JSON.parse(options["--upgrade-command"])
          : previous?.upgradeCommand || null,
      };
      if (!validUpgradeCommand(value.upgradeCommand)) {
        throw new Error(
          "--upgrade-command must be a nonempty JSON array of executable and arguments; shell command strings are not accepted.",
        );
      }
      const directory = pluginSource(value, pluginName);
      skills(directory, pluginName);
      const plan = connectedPluginPlan(value);
      atomicWrite(configPath, `${JSON.stringify(value, null, 2)}\n`);
      deployConnectedPlugins(value, new Map(), plan);
      console.log(`Configured existing ${profile.label} source: ${directory}`);
    });
    return;
  }
  if (
    action === "sync" &&
    rest[0] === "--if-installed" &&
    rest.length === 1 &&
    !config(false, pluginName)
  ) {
    return;
  }
  if (
    action === "sync" &&
    rest[0] === "--if-installed" &&
    rest.length === 1 &&
    pluginName === "thermos"
  ) {
    const current = config(false, pluginName);
    if (!current || !pluginAdapterInstalled(current, pluginName)) {
      return;
    }
  }
  if (action === "sync" && rest.includes("--dry-run")) {
    if (rest.some((arg) => !["--dry-run", "--if-installed"].includes(arg))) {
      throw new Error("Usage: sync [--if-installed] [--dry-run]");
    }
    const current = config(false, pluginName);
    if (!current && rest.includes("--if-installed")) {
      return;
    }
    withLock(() => {
      const value = config(true, pluginName);
      const directory = pluginSource(value, pluginName);
      skills(directory, pluginName);
      deployment(value, pluginName);
      if (pluginName === "thermos") {
        syncThermosSkills(directory, true);
      } else {
        const thermosDirectory = thermosSourceIfAvailable(value);
        if (thermosDirectory) {
          deployment(value, "thermos");
          syncThermosSkills(thermosDirectory, true);
        }
      }
      console.log(`Dry run: ${profile.label} source and adapters are ready to sync.`);
    });
    return;
  }
  const value = config(true, pluginName);
  if (action === "status" && !rest.length) {
    const directory = pluginSource(value, pluginName);
    console.log(
      JSON.stringify(
        {
          ...value,
          plugin: pluginName,
          revision: revision(directory),
          installationRoot: directory,
          manager: path.join(root, profile.managerFile),
          localOverridesPath: path.join(root, "overrides.md"),
        },
        null,
        2,
      ),
    );
    return;
  }
  if (
    (action === "resolve" && rest.length === 1) ||
    (action === "run" && rest.length === 1)
  ) {
    const directory = pluginSource(value, pluginName);
    const entry = skill(directory, rest[0], pluginName);
    console.log(
      JSON.stringify(
        {
          revision: revision(directory),
          installationRoot: directory,
          skillPath: entry.file,
          compatibilityPath: path.join(root, profile.id, profile.compatibilityFile),
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
      const current = config(true, pluginName);
      const directory = pluginSource(current, pluginName);
      skills(directory, pluginName);
      deployConnectedPlugins(current);
    });
    return;
  }
  if (action === "upgrade" && !rest.length) {
    withLock(() => upgrade(config(true, pluginName), pluginName));
    return;
  }
  throw new Error(
    `Unknown command or invalid arguments: ${action}. Use help. Skill source paths are available through resolve <skill>.`,
  );
}

export function main(args, pluginName = "pstack") {
  try {
    runManager(args, pluginName);
  } catch (error) {
    console.error(`${pluginName}: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
