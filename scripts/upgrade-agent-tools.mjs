#!/usr/bin/env node

import { lstatSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scripts = path.dirname(fileURLToPath(import.meta.url));
const devtools = path.join(scripts, "upgrade-devtools.mjs");
const pstack = path.join(scripts, "pstack.mjs");
const thermos = path.join(scripts, "thermos.mjs");
const speckitSync = path.join(scripts, "speckit-sync.mjs");
const skillRelativePath = path.join(
  "thermos",
  "skills",
  "thermo-nuclear-code-quality-review",
  "SKILL.md",
);
const usage =
  "Usage: shared-utils-upgrade-agent-tools [--dry-run] [--project-root <path>]\n\n" +
  "Upgrade Spec-Kit and Graphify, the shared pstack/Thermos checkout and adapters,\n" +
  "and Spec-Kit/Codex entry points. Project root defaults to the current directory.";

function parseArgs(args) {
  const options = { dryRun: false, projectRoot: process.cwd(), help: false };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--project-root") {
      if (!args[i + 1] || args[i + 1].startsWith("--")) {
        throw new Error("--project-root requires a directory.");
      }
      options.projectRoot = path.resolve(args[++i]);
    } else if (arg.startsWith("--project-root=")) {
      options.projectRoot = path.resolve(arg.slice("--project-root=".length));
    } else {
      throw new Error("Unknown option: " + arg);
    }
  }
  return options;
}

function capture(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) {
    throw new Error("Unable to start " + command + ": " + result.error.message);
  }
  return {
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function requireSuccess(result, label) {
  if (result.status !== 0) {
    throw new Error(label + " failed: " + (result.stderr || result.stdout).trim());
  }
  return result.stdout.trim();
}

function runStep(label, command, args, cwd) {
  console.log("\n== " + label);
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(label + " could not start: " + result.error.message);
  }
  if (result.status !== 0) {
    throw new Error(label + " failed with exit code " + result.status);
  }
}

function pstackStatus(projectRoot) {
  const output = requireSuccess(
    capture(process.execPath, [pstack, "status"], projectRoot),
    "pstack status",
  );
  const status = JSON.parse(output);
  if (!status || !path.isAbsolute(status.installationRoot || "")) {
    throw new Error("pstack status did not return an absolute installationRoot.");
  }
  return status;
}

function repositoryRoot(installationRoot) {
  return path.resolve(
    requireSuccess(
      capture(
        "git",
        ["-C", installationRoot, "rev-parse", "--show-toplevel"],
        installationRoot,
      ),
      "pstack checkout discovery",
    ),
  );
}

function ensurePstackCanUpgrade(status, root) {
  if (status.upgradeCommand) {
    return;
  }
  const dirty = capture("git", ["-C", root, "status", "--porcelain"], root);
  if (dirty.status !== 0) {
    throw new Error("Could not inspect the pstack checkout before upgrading.");
  }
  if (dirty.stdout.trim()) {
    throw new Error("The pstack source checkout has local changes. Resolve them before upgrading.");
  }
  if (capture("git", ["-C", root, "symbolic-ref", "--quiet", "HEAD"], root).status !== 0) {
    throw new Error("The pstack source checkout is detached. Check out its normal branch before upgrading.");
  }
}

function ensureThermosSource(root, dryRun) {
  const sparse = capture("git", ["-C", root, "sparse-checkout", "list"], root);
  if (sparse.status === 0) {
    const includesThermos = sparse.stdout
      .split(/\r?\n/)
      .some((entry) => entry.trim() === "thermos" || entry.trim().startsWith("thermos/"));
    if (!includesThermos) {
      if (dryRun) {
        console.log("Dry run: would add thermos to the pstack checkout's sparse paths.");
        return false;
      }
      runStep("Include Thermos source in sparse checkout", "git", ["-C", root, "sparse-checkout", "add", "thermos"], root);
    }
  }

  const file = path.join(root, skillRelativePath);
  let sourceStat;
  try {
    sourceStat = lstatSync(file);
  } catch (error) {
    if (error.code === "ENOENT" && dryRun) {
      console.log("Dry run: Thermos source is not materialized; a real run will include it.");
      return false;
    }
    if (error.code === "ENOENT") {
      throw new Error("Thermos source is missing at " + file + ". Use the cursor/plugins checkout containing the thermos plugin.");
    }
    throw error;
  }
  if (!sourceStat.isFile() || sourceStat.isSymbolicLink()) {
    throw new Error("Thermos skill source is not a regular file: " + file);
  }
  const contents = readFileSync(file, "utf8");
  if (!/^name:\s*thermo-nuclear-code-quality-review\s*$/m.test(contents)) {
    throw new Error("Unexpected Thermos skill name in " + file);
  }
  return true;
}

function main(args) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(usage);
    return;
  }
  const projectStat = statSync(options.projectRoot);
  if (!projectStat.isDirectory()) {
    throw new Error("--project-root must be a directory.");
  }

  const initialStatus = pstackStatus(options.projectRoot);
  const root = repositoryRoot(initialStatus.installationRoot);
  ensurePstackCanUpgrade(initialStatus, root);
  ensureThermosSource(root, options.dryRun);
  if (!options.dryRun) {
    runStep(
      "Preflight pstack and Thermos adapter refresh",
      process.execPath,
      [pstack, "sync", "--dry-run"],
      options.projectRoot,
    );
  }

  const devtoolsArgs = [devtools];
  if (options.dryRun) {
    devtoolsArgs.push("--dry-run");
  }
  devtoolsArgs.push("--project-root", options.projectRoot);
  runStep(
    options.dryRun ? "Preview Spec-Kit and Graphify" : "Upgrade Spec-Kit and Graphify",
    process.execPath,
    devtoolsArgs,
    options.projectRoot,
  );

  if (options.dryRun) {
    console.log("\nDry run: would upgrade the shared pstack/Thermos checkout and refresh both workflow adapters.");
    console.log("Dry run: would refresh the global Thermos code-quality skill and synchronize Spec-Kit/Codex adapters.");
    return;
  }

  runStep("Upgrade shared pstack/Thermos checkout", process.execPath, [pstack, "upgrade"], options.projectRoot);
  runStep("Synchronize Thermos workflows", process.execPath, [thermos, "sync", "--if-installed"], options.projectRoot);
  runStep(
    "Synchronize Spec-Kit and Codex adapters",
    process.execPath,
    [speckitSync],
    options.projectRoot,
  );
  console.log("\nAgent tooling update complete.");
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(
    "upgrade-agent-tools: " +
      (error instanceof Error ? error.message : String(error)),
  );
  process.exitCode = 1;
}
