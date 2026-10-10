#!/usr/bin/env node

import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const tools = [
  {
    command: "specify",
    distribution: "specify-cli",
    label: "Spec-Kit",
    manual: "Update it with its original installer; for uv, run: uv tool upgrade specify-cli",
  },
  {
    command: "graphify",
    distribution: "graphifyy",
    label: "Graphify",
    manual: "Update it with its original installer; install SQL support into its managed environment with 'graphifyy[sql]'",
  },
];

const usage = "Usage: upgrade-devtools [--dry-run] [--project-root <path>]\n\n"
  + "Upgrade existing, safely identified Spec-Kit and Graphify CLI installations.\n"
  + "Refresh project integrations/graphs when needed and add Graphify's SQL parser extra.\n"
  + "Missing tools are skipped; unrecognized installations are left for manual updates.\n"
  + "This command does not install missing tools or update Node/Yarn dependencies.";

const parseArgs = (args) => {
  const options = { dryRun: false, projectRoot: process.cwd() };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
      continue;
    }

    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (argument === "--project-root") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("--project-root requires a path.");
      }
      options.projectRoot = path.resolve(value);
      index += 1;
      continue;
    }

    if (argument.startsWith("--project-root=")) {
      options.projectRoot = path.resolve(argument.slice("--project-root=".length));
      continue;
    }

    throw new Error("Unknown option: " + argument);
  }

  options.projectRoot = path.resolve(options.projectRoot);
  if (!existsSync(options.projectRoot)) {
    throw new Error("Project root does not exist: " + options.projectRoot);
  }

  return options;
};

const canonicalPath = (target) => {
  try {
    return realpathSync.native(target);
  } catch {
    return path.resolve(target);
  }
};

const isInside = (parent, child) => {
  const relative = path.relative(canonicalPath(parent), canonicalPath(child));
  return relative === "" || (relative !== ".." && !relative.startsWith(".." + path.sep) && !path.isAbsolute(relative));
};

const executableExtensions = process.platform === "win32"
  ? (process.env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";")
  : [""];

const findExecutable = (name) => {
  for (const directory of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!directory) {
      continue;
    }
    for (const extension of executableExtensions) {
      const candidate = path.join(
        directory,
        process.platform === "win32" && !path.extname(name) ? name + extension : name,
      );
      try {
        accessSync(candidate, constants.X_OK);
        return { path: candidate, realPath: canonicalPath(candidate) };
      } catch {
        // Continue searching PATH.
      }
    }
  }
  return null;
};

const runCaptured = (command, args, cwd = process.cwd(), timeout = 30000) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    shell: false,
    timeout,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    ...result,
    output: ((result.stdout ?? "") + (result.stderr ?? "")).trim(),
  };
};

const runInherited = (command, args, cwd, dryRun) => {
  const rendered = [command, ...args].join(" ");
  if (dryRun) {
    console.log("  dry-run: " + rendered);
    return { status: 0 };
  }

  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    shell: false,
    stdio: "inherit",
  });

  if (result.error) {
    console.error("  Could not run " + command + ": " + result.error.message);
  } else if (result.signal) {
    console.error("  " + command + " terminated by signal " + result.signal + ".");
  }

  return result;
};

const getVersion = (executable) => {
  if (!executable) {
    return null;
  }
  const result = runCaptured(executable, ["--version"]);
  if (result.status !== 0) {
    return null;
  }
  const command = path.basename(executable).replace(/\.exe$/i, "");
  const escapedCommand = command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const versionPattern = /v?(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)/;
  const commandLine = new RegExp("^\\s*" + escapedCommand + "\\s+" + versionPattern.source + "\\s*$", "i");
  for (const line of result.output.split(/\r?\n/)) {
    const match = line.match(commandLine);
    if (match) {
      return match[1].replace(/^v/i, "");
    }
  }

  const exactVersions = result.output.split(/\r?\n/)
    .map((line) => line.trim().match(new RegExp("^" + versionPattern.source + "$")))
    .filter(Boolean)
    .map((match) => match[1].replace(/^v/i, ""));
  return new Set(exactVersions).size === 1 ? exactVersions[0] : null;
};

const parseUvToolList = (output, tool) => {
  let distribution = null;
  for (const line of output.split(/\r?\n/)) {
    const packageMatch = line.match(/^([^\s]+)\s+v[^\s]+(?:\s+\(.+\))?\s*$/);
    if (packageMatch) {
      distribution = packageMatch[1];
      continue;
    }

    const executableMatch = line.match(/^\s*-\s+([^\s]+)\s+\((.+)\)\s*$/);
    if (
      executableMatch
      && distribution === tool.distribution
      && executableMatch[1] === tool.command
      && canonicalPath(executableMatch[2]) === tool.executable.realPath
    ) {
      return true;
    }
  }
  return false;
};

const detectUvManager = (tool) => {
  const uv = findExecutable("uv");
  if (!uv) {
    return null;
  }

  const listing = runCaptured(uv.path, ["tool", "list", "--show-paths"]);
  if (listing.status === 0 && parseUvToolList(listing.output, tool)) {
    const venv = findVirtualEnvironment(tool.executable.realPath, tool);
    const sqlArgs = tool.command === "graphify" && venv?.python
      ? ["pip", "install", "--python", venv.python, "--upgrade", tool.distribution + "[sql]"]
      : null;
    return {
      kind: "uv",
      command: uv.path,
      args: ["tool", "upgrade", tool.distribution],
      python: venv?.python,
      sqlCommand: tool.command === "graphify" ? uv.path : null,
      sqlArgs,
    };
  }

  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share");
  const toolRoots = [
    process.env.UV_TOOL_DIR,
    path.join(dataHome, "uv", "tools"),
  ].filter(Boolean);

  if (toolRoots.some((root) => isInside(path.join(root, tool.distribution), tool.executable.realPath))) {
    const venv = findVirtualEnvironment(tool.executable.realPath, tool);
    const sqlArgs = tool.command === "graphify" && venv?.python
      ? ["pip", "install", "--python", venv.python, "--upgrade", tool.distribution + "[sql]"]
      : null;
    return {
      kind: "uv",
      command: uv.path,
      args: ["tool", "upgrade", tool.distribution],
      python: venv?.python,
      sqlCommand: tool.command === "graphify" ? uv.path : null,
      sqlArgs,
    };
  }

  return null;
};

const detectPipxManager = (tool) => {
  const pipx = findExecutable("pipx");
  if (!pipx) {
    return null;
  }

  const roots = [
    process.env.PIPX_LOCAL_VENVS,
    process.env.PIPX_HOME ? path.join(process.env.PIPX_HOME, "venvs") : null,
    path.join(os.homedir(), ".local", "share", "pipx", "venvs"),
    path.join(os.homedir(), ".local", "pipx", "venvs"),
  ].filter(Boolean);

  const managed = roots.some((root) => isInside(path.join(root, tool.distribution), tool.executable.realPath));
  if (!managed) {
    return null;
  }

  const venv = findVirtualEnvironment(tool.executable.realPath, tool);
  return {
    kind: "pipx",
    command: pipx.path,
    args: ["upgrade", tool.distribution],
    python: venv?.python,
    sqlCommand: tool.command === "graphify"
      ? pipx.path
      : null,
    sqlArgs: tool.command === "graphify"
      ? ["runpip", tool.distribution, "install", "--upgrade", tool.distribution + "[sql]"]
      : null,
  };
};

const findVirtualEnvironment = (executable, tool) => {
  let current = path.dirname(executable);
  while (current !== path.dirname(current)) {
    if (existsSync(path.join(current, "pyvenv.cfg"))) {
      const baseName = path.basename(current).toLowerCase().replace(/[_-]?venv$/, "");
      const allowedNames = [tool.command, tool.distribution].map((name) => name.toLowerCase());
      if (!allowedNames.includes(baseName)) {
        return null;
      }

      const pythonCandidates = process.platform === "win32"
        ? [path.join(current, "Scripts", "python.exe")]
        : [path.join(current, "bin", "python"), path.join(current, "bin", "python3")];
      const python = pythonCandidates.find((candidate) => existsSync(candidate));
      if (!python || !isInside(current, executable)) {
        return null;
      }
      return { root: current, python };
    }
    current = path.dirname(current);
  }
  return null;
};

const detectVenvManager = (tool) => {
  const venv = findVirtualEnvironment(tool.executable.realPath, tool);
  if (!venv) {
    return null;
  }

  const packageInfo = runCaptured(venv.python, ["-m", "pip", "show", tool.distribution]);
  const location = packageInfo.output.match(/^Location:\s*(.+)$/im)?.[1]?.trim();
  if (packageInfo.status !== 0 || !location || !isInside(venv.root, location)) {
    return null;
  }

  return {
    kind: "dedicated Python venv",
    command: venv.python,
    args: [
      "-m",
      "pip",
      "install",
      "--upgrade",
      tool.command === "graphify" ? tool.distribution + "[sql]" : tool.distribution,
    ],
    python: venv.python,
  };
};

const detectManager = (tool) => detectUvManager(tool)
  ?? detectPipxManager(tool)
  ?? detectVenvManager(tool);

const readJsonObject = (output) => {
  const firstBrace = output.indexOf("{");
  const lastBrace = output.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return null;
  }
  try {
    const value = JSON.parse(output.slice(firstBrace, lastBrace + 1));
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};

const findingText = (finding) => [
  finding.message,
  finding.suggestion ? "Suggestion: " + finding.suggestion : null,
].filter(Boolean).join("\n    ");

const refreshSpecKitProject = (tool, projectRoot, dryRun = false) => {
  const integrationFile = path.join(projectRoot, ".specify", "integration.json");
  if (!existsSync(integrationFile)) {
    console.log("  Project refresh: skipped; no .specify/integration.json is present.");
    return true;
  }

  const status = runCaptured(tool.executable.path, ["integration", "status", "--json"], projectRoot);
  const report = readJsonObject(status.output);
  if (!report) {
    console.error("  Project refresh: skipped; specify integration status --json returned unreadable output.");
    console.error("  Check the integration manually with: specify integration status");
    return false;
  }

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const errors = findings.filter((finding) => finding?.severity === "error");
  const integration = report.default_integration;
  const installed = Array.isArray(report.installed_integrations) ? report.installed_integrations : [];
  const unsafeInstallErrors = errors.filter((finding) => finding.code === "unsafe-multi-install");
  const otherErrors = errors.filter((finding) => finding.code !== "unsafe-multi-install");
  const unsafeIntegrationKeys = unsafeInstallErrors.flatMap((finding) => {
    const separator = typeof finding.message === "string" ? finding.message.indexOf(":") : -1;
    return separator < 0
      ? []
      : finding.message.slice(separator + 1).split(",").map((key) => key.trim()).filter(Boolean);
  });
  const selectedIntegrationIsAligned = typeof integration === "string"
    && installed.includes(integration)
    && report.shared_templates_target_alignment === integration;
  const onlyNonDefaultInstallIsUnsafe = unsafeInstallErrors.length > 0
    && otherErrors.length === 0
    && unsafeIntegrationKeys.length > 0
    && !unsafeIntegrationKeys.includes(integration)
    && selectedIntegrationIsAligned;
  const statusHasError = status.status !== 0
    || report.status === "error"
    || errors.length > 0
    || report.multi_install_safe === false;

  if (statusHasError && !onlyNonDefaultInstallIsUnsafe) {
    console.error("  Project refresh: skipped because Spec-Kit reported an unsafe integration state.");
    for (const finding of errors) {
      console.error("    - " + findingText(finding));
    }
    if (errors.length === 0) {
      console.error("    Review specify integration status and resolve its errors before upgrading the project integration.");
    }
    return false;
  }

  if (onlyNonDefaultInstallIsUnsafe) {
    console.log(
      "  Status reports unsafe coexistence for " + unsafeIntegrationKeys.join(", ")
      + "; selected default " + integration + " is safe and aligned, so only that integration will be upgraded.",
    );
  }

  if (typeof integration !== "string" || !installed.includes(integration)) {
    console.error("  Project refresh: skipped; status did not identify an installed default integration.");
    console.error("  Check the integration manually with: specify integration status");
    return false;
  }

  console.log("  Project refresh: " + (dryRun ? "would run" : "running") + " specify integration upgrade " + integration + " (without --force).");
  const result = runInherited(
    tool.executable.path,
    ["integration", "upgrade", integration],
    path.resolve(path.dirname(integrationFile), ".."),
    dryRun,
  );
  if (!dryRun && result.status !== 0) {
    console.error("  Project integration upgrade failed. Review the output and run the command above manually.");
    return false;
  }
  return true;
};

const refreshGraphifyProject = (tool, projectRoot, dryRun = false) => {
  const graphFile = path.join(projectRoot, "graphify-out", "graph.json");
  if (!existsSync(graphFile)) {
    console.log("  Project refresh: skipped; no graphify-out/graph.json is present.");
    return true;
  }

  console.log("  Project refresh: " + (dryRun ? "would run" : "running") + " graphify update " + projectRoot + ".");
  const result = runInherited(tool.executable.path, ["update", projectRoot], projectRoot, dryRun);
  if (!dryRun && result.status !== 0) {
    console.error("  Graph refresh failed. Review the output and run graphify update . from the project root.");
    return false;
  }
  return true;
};

const parseVersion = (version) => {
  const match = typeof version === "string"
    ? version.match(/^\s*v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?\s*$/)
    : null;
  return match
    ? { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), prerelease: match[4] ?? null }
    : null;
};

const compareVersions = (left, right) => {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) {
    return null;
  }

  for (const component of ["major", "minor", "patch"]) {
    if (leftVersion[component] !== rightVersion[component]) {
      return leftVersion[component] < rightVersion[component] ? -1 : 1;
    }
  }
  if (leftVersion.prerelease === rightVersion.prerelease) {
    return 0;
  }
  if (leftVersion.prerelease === null) {
    return 1;
  }
  if (rightVersion.prerelease === null) {
    return -1;
  }

  const leftParts = leftVersion.prerelease.split(".");
  const rightParts = rightVersion.prerelease.split(".");
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    if (leftParts[index] === undefined) {
      return -1;
    }
    if (rightParts[index] === undefined) {
      return 1;
    }
    if (leftParts[index] === rightParts[index]) {
      continue;
    }
    const leftNumeric = /^\d+$/.test(leftParts[index]);
    const rightNumeric = /^\d+$/.test(rightParts[index]);
    if (leftNumeric && rightNumeric) {
      return Number(leftParts[index]) < Number(rightParts[index]) ? -1 : 1;
    }
    if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    }
    return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return 0;
};

const graphifySqlAvailable = (manager, projectRoot) => {
  if (!manager.python || !existsSync(manager.python)) {
    return null;
  }
  const result = runCaptured(manager.python, ["-c", "import tree_sitter_sql"], projectRoot, 10000);
  return result.status === 0;
};

const copilotSkillHasSymlinks = (directory) => {
  try {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        return true;
      }
      if (entry.isDirectory() && copilotSkillHasSymlinks(entryPath)) {
        return true;
      }
    }
  } catch {
    return true;
  }
  return false;
};

const readCopilotSkillVersion = (skillDirectory) => {
  const marker = path.join(skillDirectory, ".graphify_version");
  try {
    if (!lstatSync(marker).isFile()) {
      return null;
    }
    const version = readFileSync(marker, "utf8").trim();
    return parseVersion(version) ? version : null;
  } catch {
    return null;
  }
};

const refreshCopilotGraphifySkill = (tool, version, projectRoot, dryRun = false) => {
  const skillsRoot = path.join(os.homedir(), ".copilot", "skills");
  const skillDirectory = path.join(skillsRoot, "graphify");
  if (!existsSync(skillDirectory)) {
    console.log("  Copilot skill refresh: skipped; no global Graphify skill is installed.");
    return true;
  }

  let skillStat;
  try {
    skillStat = lstatSync(skillDirectory);
  } catch {
    console.error("  Copilot skill refresh: could not inspect " + skillDirectory + ".");
    return false;
  }
  if (!skillStat.isDirectory() || skillStat.isSymbolicLink()) {
    console.error("  Copilot skill refresh: destination is not a regular skill directory; update it manually with: graphify install --platform copilot");
    return false;
  }

  const markerVersion = readCopilotSkillVersion(skillDirectory);
  if (!markerVersion) {
    console.error("  Copilot skill refresh: no valid Graphify version stamp was found; preserve the custom/unmanaged skill and update it manually with: graphify install --platform copilot");
    return false;
  }

  const comparison = compareVersions(markerVersion, version);
  if (comparison === null) {
    console.error("  Copilot skill refresh: could not compare skill version " + markerVersion + " with CLI version " + version + ".");
    return false;
  }
  if (comparison >= 0) {
    console.log("  Copilot skill refresh: already current (" + markerVersion + ").");
    return true;
  }
  if (!existsSync(path.join(skillDirectory, "SKILL.md")) || copilotSkillHasSymlinks(skillDirectory)) {
    console.error("  Copilot skill refresh: skill files are incomplete or contain symlinks; update it manually with: graphify install --platform copilot");
    return false;
  }

  if (dryRun) {
    console.log("  Copilot skill refresh: would back up version " + markerVersion + " and run graphify install --platform copilot for " + version + ".");
    return true;
  }

  const backupRoot = path.join(skillsRoot, ".graphify-upgrade-backups");
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "").replace("T", "-").replace(/Z$/, "");
  const backupBase = "graphify-" + markerVersion + "-to-" + version + "-" + timestamp;
  let backupDirectory = path.join(backupRoot, backupBase);
  let suffix = 1;
  while (existsSync(backupDirectory)) {
    backupDirectory = path.join(backupRoot, backupBase + "-" + suffix);
    suffix += 1;
  }

  try {
    const skillsRootStat = lstatSync(skillsRoot);
    if (!skillsRootStat.isDirectory() || skillsRootStat.isSymbolicLink()) {
      throw new Error("Copilot skills root is not a regular directory.");
    }
    mkdirSync(backupRoot, { recursive: true });
    const backupRootStat = lstatSync(backupRoot);
    if (!backupRootStat.isDirectory() || backupRootStat.isSymbolicLink()) {
      throw new Error("Graphify backup directory is not a regular directory.");
    }
    cpSync(skillDirectory, backupDirectory, {
      recursive: true,
      errorOnExist: true,
      force: false,
      dereference: false,
      preserveTimestamps: true,
    });
  } catch (error) {
    console.error("  Copilot skill refresh: could not preserve a backup before updating: " + error.message);
    return false;
  }

  console.log("  Copilot skill backup: " + backupDirectory);
  console.log("  Copilot skill refresh: running graphify install --platform copilot.");
  const result = runInherited(tool.executable.path, ["install", "--platform", "copilot"], projectRoot, false);
  if (result.error || result.status !== 0) {
    console.error("  Copilot skill refresh failed. The previous skill is backed up at " + backupDirectory + ". Retry manually with: graphify install --platform copilot");
    return false;
  }

  const refreshedVersion = readCopilotSkillVersion(skillDirectory);
  if (!refreshedVersion || compareVersions(refreshedVersion, version) < 0) {
    console.error("  Copilot skill refresh did not install the expected version. Restore the backup if needed: " + backupDirectory);
    return false;
  }

  console.log("  Copilot skill refreshed to " + refreshedVersion + ". Backup retained at " + backupDirectory + ".");
  return true;
};

const upgradeGraphifyPip = (manager, projectRoot, dryRun) => {
  if (manager.kind !== "dedicated Python venv") {
    return true;
  }

  const pipVersion = runCaptured(manager.python, ["-m", "pip", "--version"], projectRoot)
    .output.match(/^pip\s+([^\s]+)/m)?.[1];
  console.log("  Pip in Graphify's dedicated venv" + (pipVersion ? " (" + pipVersion + ")" : "") + ": checking for an update.");
  const args = ["-m", "pip", "install", "--upgrade", "pip"];
  const result = runInherited(manager.python, args, projectRoot, dryRun);
  if (!dryRun && (result.error || result.status !== 0)) {
    console.error("  Pip upgrade failed in the managed Graphify venv; continuing with its current pip.");
    console.error("  Retry manually with: " + manager.python + " -m pip install --upgrade pip");
    return false;
  }

  return true;
};

const upgradeTool = (tool, projectRoot, dryRun) => {
  const executable = findExecutable(tool.command);
  if (!executable) {
    console.log("- " + tool.label + ": not installed; skipped.");
    return { complete: true };
  }

  tool.executable = executable;
  const manager = detectManager(tool);
  if (!manager) {
    console.error("- " + tool.label + ": found at " + executable.realPath + ", but its installation is not safely managed by uv, pipx, or a dedicated tool venv.");
    console.error("  " + tool.manual);
    return { complete: dryRun };
  }

  const before = getVersion(executable.path);
  console.log("- " + tool.label + ": detected " + manager.kind + " installation" + (before ? " (" + before + ")" : "") + ".");
  const graphifySqlBefore = tool.command === "graphify" ? graphifySqlAvailable(manager, projectRoot) : true;
  if (tool.command === "graphify") {
    console.log("  SQL parser: " + (graphifySqlBefore === null ? "could not inspect the managed environment" : graphifySqlBefore ? "available" : "missing") + ".");
  }
  const pipComplete = tool.command === "graphify"
    ? upgradeGraphifyPip(manager, projectRoot, dryRun)
    : true;
  const upgradeResult = runInherited(manager.command, manager.args, projectRoot, dryRun);
  if (!dryRun && (upgradeResult.error || upgradeResult.status !== 0)) {
    console.error("  Upgrade failed. To retry manually: " + manager.command + " " + manager.args.join(" "));
    return { complete: false };
  }
  if (dryRun) {
    console.log("  Project refresh preflight:");
    if (tool.command === "specify") {
      refreshSpecKitProject(tool, projectRoot, true);
    } else {
      if (graphifySqlBefore === false && manager.sqlCommand && manager.sqlArgs) {
        console.log("  SQL parser repair preflight:");
        runInherited(manager.sqlCommand, manager.sqlArgs, projectRoot, true);
      } else if (graphifySqlBefore === false && !manager.sqlArgs) {
        console.error("  SQL parser repair needs the managed Graphify environment's Python executable; verify the environment manually.");
      } else if (graphifySqlBefore === null) {
        console.error("  SQL parser repair needs the managed Graphify environment's Python executable; verify the environment manually.");
      }
      refreshGraphifyProject(tool, projectRoot, true);
      if (before) {
        refreshCopilotGraphifySkill(tool, before, projectRoot, true);
      }
    }
    return { complete: true };
  }

  const after = getVersion(executable.path);
  if (!before || !after) {
    console.error("  Could not compare tool versions; project-specific refresh was skipped for safety.");
    return { complete: false };
  }
  if (before === after) {
    console.log("  Already current (" + after + ").");
  } else {
    console.log("  Upgraded: " + before + " -> " + after + ".");
  }

  if (tool.command === "specify") {
    if (before === after) {
      console.log("  No project integration refresh is needed.");
      return { complete: true };
    }
    return { complete: refreshSpecKitProject(tool, projectRoot) };
  }

  let sqlComplete = true;
  const graphifySqlAfter = graphifySqlAvailable(manager, projectRoot);
  if (graphifySqlAfter === null) {
    console.error("  Could not verify tree_sitter_sql in the managed Graphify environment.");
    console.error("  Install 'graphifyy[sql]' into that environment, then rerun yarn upgrade:devtools.");
    sqlComplete = false;
  } else if (!graphifySqlAfter) {
    if (manager.sqlCommand && manager.sqlArgs) {
      const sqlResult = runInherited(manager.sqlCommand, manager.sqlArgs, projectRoot, false);
      if (sqlResult.error || sqlResult.status !== 0) {
        console.error("  SQL extra installation failed. Retry it in the managed Graphify environment with the package-manager command above.");
        sqlComplete = false;
      }
    } else {
      console.error("  The Graphify SQL extra was requested by the package manager but tree_sitter_sql is still unavailable.");
      sqlComplete = false;
    }

    if (sqlComplete && !graphifySqlAvailable(manager, projectRoot)) {
      console.error("  tree_sitter_sql is still unavailable after installing graphifyy[sql]. Check the package-manager output and retry manually.");
      sqlComplete = false;
    }
  }

  // Running the incremental updater also catches optional parsers installed
  // outside this command since the last graph refresh.
  const projectComplete = refreshGraphifyProject(tool, projectRoot);

  const skillComplete = refreshCopilotGraphifySkill(tool, after, projectRoot);
  return { complete: pipComplete && sqlComplete && projectComplete && skillComplete };
};

const main = () => {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(usage);
    return 2;
  }

  if (options.help) {
    console.log(usage);
    return 0;
  }

  console.log("Dev tool upgrade for " + options.projectRoot + (options.dryRun ? " (dry run)" : ""));
  console.log("Only existing, identified tool installations are updated; missing tools are not installed.");

  let complete = true;
  for (const tool of tools) {
    const result = upgradeTool(tool, options.projectRoot, options.dryRun);
    complete = complete && result.complete;
  }

  if (complete || options.dryRun) {
    console.log(options.dryRun ? "Dry run complete." : "Dev tool upgrade complete.");
    return 0;
  }

  console.error("Upgrade is incomplete. Follow the manual steps above, then rerun yarn upgrade:devtools.");
  return 1;
};

process.exitCode = main();
