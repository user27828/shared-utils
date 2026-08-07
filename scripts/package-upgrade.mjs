#!/usr/bin/env node

/**
 * Deterministic, audit-first dependency upgrade helper.
 *
 * This intentionally consumes only structured registry and audit JSON. It never
 * evaluates package metadata, package scripts, changelog text, or shell input.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAX_SNAPSHOT_BYTES = 64 * 1024 * 1024;
const SUPPORTED_MANAGERS = new Set(["yarn", "npm", "pnpm"]);
const SUPPORTED_VERIFICATIONS = new Set(["test", "lint", "build"]);
const PLANNING_FIELDS = ["time", "dist-tags", "versions"];
const INSPECTION_FIELDS = [
  "time",
  "dist-tags",
  "versions",
  "version",
  "deprecated",
  "engines",
  "peerDependencies",
  "dependencies",
  "dist",
];
const MAX_INSPECTION_RECORD_ENTRIES = 64;
const MAX_INSPECTION_VALUE_LENGTH = 256;
const PACKAGE_NAME_PATTERN =
  /^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/;
const VERSION_PATTERN =
  /^v?\d+\.\d+\.\d+(?:-[0-9a-z][0-9a-z.-]*)?(?:\+[0-9a-z][0-9a-z.-]*)?$/i;
const ADVISORY_PATTERN =
  /^(?:CVE-\d{4}-\d{4,}|GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4})$/i;

const usage = `Usage: package-upgrade [options] [package[@version] ...]

Plans direct-dependency upgrades by default and changes nothing unless --apply
is present. Each package is pinned to a concrete published version in the plan.

Options:
  --manager <yarn|npm|pnpm>  Package manager to invoke (default: yarn)
  --project-dir <path>       Caller project or a directory inside it (default: cwd)
  --apply                    Apply the approved plan with lifecycle scripts disabled
  --inspect                  Inspect one package version without writing files
  --audit                    Return a compact current-advisory summary without writing files
  --verify <test|lint|build> Run a standard project verification after applying (repeatable)
  --security-exception <package@version=advisory>
                             Allow one age-gated version only when the current audit
                             reports the supplied high/critical CVE or GHSA; it must
                             disappear from the post-upgrade audit
  --upgrade-package-manager  Upgrade package.json's packageManager pin under the
                             same age gate; cannot be combined with package arguments
  --json                     Emit compact structured output (recommended for inspection/audit)
  --help                     Show this help

Compatibility: Yarn 3+, npm 10+, and pnpm 9+. The current and immediately
previous major releases use the same non-interactive, lockfile-only-safe paths.
`;

export const parsePackageSpec = (value) => {
  if (typeof value !== "string" || value.length === 0 || value.length > 214) {
    throw new Error(
      "Package specifications must be non-empty and at most 214 characters.",
    );
  }

  const separator = value.lastIndexOf("@");
  const name = separator > 0 ? value.slice(0, separator) : value;
  const version = separator > 0 ? value.slice(separator + 1) : "latest";

  if (!PACKAGE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid package name: ${value}`);
  }
  if (version !== "latest" && !VERSION_PATTERN.test(version)) {
    throw new Error(
      `Only published exact versions or latest are allowed: ${value}`,
    );
  }

  return { name, version: version.replace(/^v/i, "") };
};

const parseSecurityException = (value) => {
  const separator = value.lastIndexOf("=");
  if (separator <= 0) {
    throw new Error(
      "Security exceptions must use package@version=GHSA-... or package@version=CVE-....",
    );
  }

  const spec = parsePackageSpec(value.slice(0, separator));
  const advisory = value.slice(separator + 1).toUpperCase();
  if (spec.version === "latest" || !ADVISORY_PATTERN.test(advisory)) {
    throw new Error(
      "Security exceptions require an exact package version and a valid CVE or GHSA identifier.",
    );
  }

  return { ...spec, advisory };
};

export const parseArgs = (argv) => {
  const options = {
    apply: false,
    audit: false,
    inspect: false,
    json: false,
    manager: "yarn",
    projectDir: process.cwd(),
    securityExceptions: [],
    upgradePackageManager: false,
    verifications: [],
    packages: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length || argv[index].startsWith("--")) {
        throw new Error(`${value} requires a value.`);
      }
      return argv[index];
    };

    if (value === "--apply") {
      options.apply = true;
    } else if (value === "--audit") {
      options.audit = true;
    } else if (value === "--inspect") {
      options.inspect = true;
    } else if (value === "--json") {
      options.json = true;
    } else if (value === "--manager") {
      options.manager = next();
    } else if (value === "--project-dir") {
      options.projectDir = next();
    } else if (value === "--verify") {
      options.verifications.push(next());
    } else if (value === "--security-exception") {
      options.securityExceptions.push(parseSecurityException(next()));
    } else if (value === "--upgrade-package-manager") {
      options.upgradePackageManager = true;
    } else if (value === "--skip-server") {
      // Compatibility with the previous interactive wrapper. This tool is always
      // single-project, so it never traverses into a server workspace.
    } else if (value === "--help" || value === "-h") {
      options.help = true;
    } else if (value.startsWith("-")) {
      throw new Error(`Unknown option: ${value}`);
    } else {
      options.packages.push(parsePackageSpec(value));
    }
  }

  if (!SUPPORTED_MANAGERS.has(options.manager)) {
    throw new Error("--manager must be yarn, npm, or pnpm.");
  }
  if (options.projectDir.includes("\0")) {
    throw new Error("--project-dir must not contain a null byte.");
  }
  for (const verification of options.verifications) {
    if (!SUPPORTED_VERIFICATIONS.has(verification)) {
      throw new Error("--verify only accepts test, lint, or build.");
    }
  }
  if (options.upgradePackageManager && options.packages.length > 0) {
    throw new Error(
      "--upgrade-package-manager cannot be combined with package arguments.",
    );
  }
  if (options.upgradePackageManager && options.securityExceptions.length > 0) {
    throw new Error(
      "--security-exception is only available for dependency upgrades.",
    );
  }
  if (
    options.audit &&
    (options.apply || options.inspect || options.packages.length > 0)
  ) {
    throw new Error(
      "--audit cannot be combined with --apply, --inspect, or package arguments.",
    );
  }
  if (options.inspect) {
    if (
      options.apply ||
      options.upgradePackageManager ||
      options.securityExceptions.length > 0 ||
      options.verifications.length > 0
    ) {
      throw new Error(
        "--inspect cannot be combined with write, verification, or security-exception options.",
      );
    }
    if (options.packages.length !== 1) {
      throw new Error("--inspect requires exactly one package specification.");
    }
  }

  return options;
};

export const resolveProjectRoot = (startDirectory) => {
  const initialPath = path.resolve(startDirectory);
  let directory;
  try {
    directory = fs.realpathSync(initialPath);
  } catch {
    throw new Error(`Project directory does not exist: ${initialPath}`);
  }

  if (!fs.statSync(directory).isDirectory()) {
    throw new Error(`Project directory is not a directory: ${initialPath}`);
  }

  while (true) {
    const manifest = path.join(directory, "package.json");
    if (fs.existsSync(manifest) && fs.statSync(manifest).isFile()) {
      return directory;
    }
    const parent = path.dirname(directory);
    if (parent === directory) {
      throw new Error(
        "Could not find a package.json by walking up from --project-dir.",
      );
    }
    directory = parent;
  }
};

const readJson = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read ${label}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

export const parseAgeGate = (projectRoot) => {
  const yarnrcPath = path.join(projectRoot, ".yarnrc.yml");
  if (!fs.existsSync(yarnrcPath)) {
    return 0;
  }

  const configuredLine = fs
    .readFileSync(yarnrcPath, "utf8")
    .match(/^\s*npmMinimalAgeGate\s*:\s*(.*?)\s*(?:#.*)?$/m);
  if (!configuredLine) {
    return 0;
  }

  const value = configuredLine[1];
  const match = value.match(/^["']?(\d+)["']?$/);
  if (!match) {
    throw new Error("npmMinimalAgeGate must be an integer number of minutes.");
  }
  const minutes = Number.parseInt(match[1], 10);
  if (!Number.isSafeInteger(minutes) || minutes > 10_000_000) {
    throw new Error(
      "npmMinimalAgeGate must be a safe integer no greater than 10000000 minutes.",
    );
  }
  return minutes;
};

const safeEnvironment = () => ({
  ...process.env,
  COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
  YARN_ENABLE_SCRIPTS: "0",
  npm_config_ignore_scripts: "true",
  npm_config_audit: "false",
  npm_config_fund: "false",
});

const run = (command, args, cwd, allowFailure = false) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: safeEnvironment(),
    maxBuffer: 8 * 1024 * 1024,
    shell: false,
    timeout: 60_000,
    windowsHide: true,
  });

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || "command failed")
      .trim()
      .split("\n")[0];
    throw new Error(`${command} failed: ${detail.slice(0, 500)}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
};

const parseVersionMajor = (versionOutput) => {
  const match = versionOutput.trim().match(/(?:^|\s)v?(\d+)\./);
  if (!match) {
    throw new Error("Could not determine the package-manager version.");
  }
  return Number.parseInt(match[1], 10);
};

const assertManagerVersion = (manager, projectRoot) => {
  const version = run(manager, ["--version"], projectRoot).stdout.trim();
  const major = parseVersionMajor(version);
  const minimums = { yarn: 3, npm: 10, pnpm: 9 };
  if (major < minimums[manager]) {
    throw new Error(
      `${manager}@${version} is unsupported; use ${manager} ${minimums[manager]} or newer.`,
    );
  }
  return version;
};

export const registryInfoArgs = (
  manager,
  packageSpecifier,
  fields = PLANNING_FIELDS,
) => {
  if (manager === "yarn") {
    return [
      "npm",
      "info",
      packageSpecifier,
      "--fields",
      fields.join(","),
      "--json",
    ];
  }
  return ["view", packageSpecifier, ...fields, "--json"];
};

export const parseRegistryMetadata = (output, packageName) => {
  const normalized = output.trim();
  try {
    const value = JSON.parse(normalized);
    if (value && typeof value === "object") {
      return value;
    }
  } catch {
    // Yarn may emit a non-JSON progress line before its structured response.
  }

  const lines = normalized.split("\n").filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      const value = JSON.parse(line);
      if (value && typeof value === "object") {
        return value;
      }
    } catch {
      // Yarn may emit a non-JSON progress line before its structured response.
    }
  }
  throw new Error(`Registry metadata for ${packageName} was not valid JSON.`);
};

const getPackageMetadata = (
  manager,
  packageSpecifier,
  projectRoot,
  fields = PLANNING_FIELDS,
) => {
  const result = run(
    manager,
    registryInfoArgs(manager, packageSpecifier, fields),
    projectRoot,
  );
  return parseRegistryMetadata(result.stdout, packageSpecifier);
};

const selectPublishedVersion = (spec, metadata) => {
  const candidate =
    spec.version === "latest" ? metadata?.["dist-tags"]?.latest : spec.version;
  if (typeof candidate !== "string" || !VERSION_PATTERN.test(candidate)) {
    throw new Error(
      `Registry did not provide a stable published version for ${spec.name}.`,
    );
  }
  const version = candidate.replace(/^v/i, "");
  const versions = Array.isArray(metadata?.versions)
    ? metadata.versions
    : Object.keys(metadata?.time || {});
  if (!versions.includes(version)) {
    throw new Error(
      `${spec.name}@${version} was not found in registry metadata.`,
    );
  }
  const publishedAt = metadata?.time?.[version];
  if (
    typeof publishedAt !== "string" ||
    !Number.isFinite(Date.parse(publishedAt))
  ) {
    throw new Error(
      `Registry did not provide a valid publication time for ${spec.name}@${version}.`,
    );
  }
  return {
    name: spec.name,
    version,
    publishedAt,
    dependencyType: spec.dependencyType,
  };
};

const toBoundedStringRecord = (value, maxEntries) => {
  const record = {};
  let truncated = false;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { record, truncated };
  }

  for (const [key, entry] of Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (Object.keys(record).length >= maxEntries) {
      truncated = true;
      break;
    }
    if (
      typeof key !== "string" ||
      key.length > 214 ||
      typeof entry !== "string" ||
      entry.length > MAX_INSPECTION_VALUE_LENGTH
    ) {
      truncated = true;
      continue;
    }
    record[key] = entry;
  }
  return { record, truncated };
};

export const createInspection = (
  candidate,
  metadata,
  ageGateMinutes,
  ageMinutes,
) => {
  const engines = toBoundedStringRecord(metadata?.engines, 16);
  const peerDependencies = toBoundedStringRecord(
    metadata?.peerDependencies,
    MAX_INSPECTION_RECORD_ENTRIES,
  );
  const dependencies = toBoundedStringRecord(
    metadata?.dependencies,
    MAX_INSPECTION_RECORD_ENTRIES,
  );
  const truncatedFields = [];
  if (engines.truncated) {
    truncatedFields.push("engines");
  }
  if (peerDependencies.truncated) {
    truncatedFields.push("peerDependencies");
  }
  if (dependencies.truncated) {
    truncatedFields.push("dependencies");
  }

  const dist = {};
  if (
    typeof metadata?.dist?.integrity === "string" &&
    metadata.dist.integrity.length <= 1024 &&
    /^sha(?:1|256|384|512)-[A-Za-z0-9+/=]+$/.test(metadata.dist.integrity)
  ) {
    dist.integrity = metadata.dist.integrity;
  }
  if (
    typeof metadata?.dist?.shasum === "string" &&
    /^[a-f0-9]{40}$/i.test(metadata.dist.shasum)
  ) {
    dist.shasum = metadata.dist.shasum;
  }

  return {
    name: candidate.name,
    version: candidate.version,
    publishedAt: candidate.publishedAt,
    ageGateStatus:
      ageMinutes < ageGateMinutes ? "rejected-age-gate" : "eligible",
    deprecated: Boolean(metadata?.deprecated),
    engines: engines.record,
    peerDependencies: peerDependencies.record,
    dependencies: dependencies.record,
    ...(Object.keys(dist).length > 0 ? { dist } : {}),
    ...(truncatedFields.length > 0 ? { truncatedFields } : {}),
  };
};

const isRegistryDependency = (range) => {
  if (typeof range !== "string" || range.length === 0) {
    return false;
  }
  return !/^(?:file:|git\+|github:|git:|https?:|link:|npm:|patch:|portal:|workspace:)/i.test(
    range,
  );
};

export const packageSpecsFromManifest = (manifest) => {
  const groups = ["dependencies", "devDependencies", "optionalDependencies"];
  const specs = new Map();
  for (const group of groups) {
    for (const [name, range] of Object.entries(manifest[group] || {})) {
      if (PACKAGE_NAME_PATTERN.test(name) && isRegistryDependency(range)) {
        specs.set(name, { name, version: "latest", dependencyType: group });
      }
    }
  }
  return [...specs.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
};

const dependencyTypeFor = (manifest, packageName) => {
  const groups = ["dependencies", "devDependencies", "optionalDependencies"];
  return (
    groups.find((group) => Object.hasOwn(manifest[group] || {}, packageName)) ??
    "dependencies"
  );
};

const readAudit = (manager, projectRoot) => {
  const args =
    manager === "yarn"
      ? ["npm", "audit", "--all", "--json"]
      : ["audit", "--json"];
  const result = run(manager, args, projectRoot, true);
  const output = result.stdout.trim();
  if (!output) {
    throw new Error(`${manager} audit produced no JSON output.`);
  }
  try {
    return JSON.parse(output);
  } catch {
    const findings = [];
    for (const line of output.split("\n").filter(Boolean)) {
      try {
        const finding = JSON.parse(line);
        if (finding && typeof finding === "object") {
          findings.push(finding);
        }
      } catch {
        throw new Error(`${manager} audit produced invalid JSON.`);
      }
    }
    if (findings.length === 0) {
      throw new Error(`${manager} audit produced invalid JSON.`);
    }
    return { findings };
  }
};

const findingSeverity = (value) => {
  const severity = value?.severity ?? value?.Severity;
  return typeof severity === "string" ? severity.toLowerCase() : "";
};

const advisoryIdentifiers = (value) => {
  const identifiers = new Set();
  const visit = (current) => {
    if (typeof current === "string") {
      for (const identifier of current
        .toUpperCase()
        .matchAll(
          /(?:CVE-\d{4}-\d{4,}|GHSA-[23456789CFGHJMPQRVWX]{4}-[23456789CFGHJMPQRVWX]{4}-[23456789CFGHJMPQRVWX]{4})/g,
        )) {
        identifiers.add(identifier[0]);
      }
      return;
    }
    if (current && typeof current === "object") {
      for (const entry of Object.values(current)) {
        visit(entry);
      }
    }
  };
  visit(value);
  return identifiers;
};

export const summarizeAudit = (audit) => {
  const counts = audit?.metadata?.vulnerabilities;
  const vulnerabilities = {};
  for (const severity of [
    "info",
    "low",
    "moderate",
    "high",
    "critical",
    "total",
  ]) {
    if (Number.isSafeInteger(counts?.[severity]) && counts[severity] >= 0) {
      vulnerabilities[severity] = counts[severity];
    }
  }

  const majorAdvisories = new Set();
  const countedSeverities = new Map();
  const visit = (value) => {
    if (!value || typeof value !== "object") {
      return;
    }
    const severity = findingSeverity(value);
    if (["info", "low", "moderate", "high", "critical"].includes(severity)) {
      countedSeverities.set(
        severity,
        (countedSeverities.get(severity) || 0) + 1,
      );
    }
    if (severity === "high" || severity === "critical") {
      for (const identifier of advisoryIdentifiers(value)) {
        if (majorAdvisories.size < 100) {
          majorAdvisories.add(identifier);
        }
      }
    }
    for (const entry of Object.values(value)) {
      visit(entry);
    }
  };
  visit(audit);

  if (Object.keys(vulnerabilities).length === 0) {
    for (const [severity, count] of countedSeverities) {
      vulnerabilities[severity] = count;
    }
    vulnerabilities.total = [...countedSeverities.values()].reduce(
      (total, count) => total + count,
      0,
    );
  }

  return {
    vulnerabilities,
    highCriticalAdvisories: [...majorAdvisories].sort(),
    advisoryListTruncated: majorAdvisories.size >= 100,
  };
};

const auditIncludesMajorAdvisory = (audit, advisory) => {
  const visit = (value) => {
    if (!value || typeof value !== "object") {
      return false;
    }
    const severity = findingSeverity(value);
    if (
      (severity === "high" || severity === "critical") &&
      JSON.stringify(value).toUpperCase().includes(advisory)
    ) {
      return true;
    }
    return Object.values(value).some(visit);
  };
  return visit(audit);
};

const lockFileNames = ["yarn.lock", "package-lock.json", "pnpm-lock.yaml"];

const snapshotProjectState = (projectRoot) => {
  const fileNames = ["package.json", ...lockFileNames];
  const files = new Map();
  let totalBytes = 0;
  for (const name of fileNames) {
    const filePath = path.join(projectRoot, name);
    if (!fs.existsSync(filePath)) {
      files.set(filePath, null);
      continue;
    }
    const content = fs.readFileSync(filePath);
    totalBytes += content.length;
    if (totalBytes > MAX_SNAPSHOT_BYTES) {
      throw new Error(
        "Project manifest and lockfiles exceed the 64 MiB safe rollback limit.",
      );
    }
    files.set(filePath, content);
  }
  return files;
};

const restoreProjectState = (snapshot, projectRoot) => {
  for (const [filePath, content] of snapshot) {
    if (
      path.dirname(filePath) !== projectRoot ||
      !["package.json", ...lockFileNames].includes(path.basename(filePath))
    ) {
      throw new Error("Refusing to restore an unexpected path.");
    }
    if (content === null) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      fs.writeFileSync(filePath, content, { mode: 0o600 });
    }
  }
};

export const upgradeArgs = (
  manager,
  candidates,
  dependencyType = "dependencies",
) => {
  const specs = candidates.map(({ name, version }) => `${name}@${version}`);
  if (manager === "yarn") {
    return ["up", "--mode=skip-build", ...specs];
  }
  if (manager === "npm") {
    const saveFlag = {
      dependencies: "--save-prod",
      devDependencies: "--save-dev",
      optionalDependencies: "--save-optional",
    }[dependencyType];
    if (!saveFlag) {
      throw new Error(`Unsupported npm dependency type: ${dependencyType}`);
    }
    return [
      "install",
      "--ignore-scripts",
      "--package-lock-only",
      "--no-audit",
      "--no-fund",
      "--save-exact",
      saveFlag,
      ...specs,
    ];
  }
  return [
    "update",
    "--ignore-scripts",
    "--lockfile-only",
    "--save-exact",
    ...specs,
  ];
};

const upgradeCommands = (manager, candidates) => {
  if (manager !== "npm") {
    return [upgradeArgs(manager, candidates)];
  }
  const groups = new Map();
  for (const candidate of candidates) {
    const dependencyType = candidate.dependencyType || "dependencies";
    const group = groups.get(dependencyType) || [];
    group.push(candidate);
    groups.set(dependencyType, group);
  }
  return [...groups].map(([dependencyType, group]) =>
    upgradeArgs(manager, group, dependencyType),
  );
};

const runVerification = (manager, verification, projectRoot) =>
  run(manager, ["run", verification], projectRoot);

const formatResult = (result, json) => {
  if (json) {
    return JSON.stringify(result);
  }
  const lines = [
    `project: ${result.projectRoot}`,
    `manager: ${result.manager}@${result.managerVersion}`,
    `age gate: ${result.ageGateMinutes} minutes`,
  ];
  if (result.audit) {
    const { high = 0, critical = 0, total = 0 } = result.audit.vulnerabilities;
    lines.push(`audit: ${total} total, ${high} high, ${critical} critical`);
    lines.push(
      `high/critical advisory IDs: ${result.audit.highCriticalAdvisories.length}`,
    );
    return lines.join("\n");
  }
  if (result.inspection) {
    lines.push(
      `${result.inspection.name}@${result.inspection.version} ${result.inspection.ageGateStatus}`,
    );
    lines.push(
      `dependencies: ${Object.keys(result.inspection.dependencies).length}, peers: ${Object.keys(result.inspection.peerDependencies).length}`,
    );
    return lines.join("\n");
  }
  for (const candidate of result.candidates) {
    lines.push(`${candidate.name}@${candidate.version} ${candidate.status}`);
  }
  lines.push(
    result.applied
      ? "result: applied"
      : "result: plan only (pass --apply to change files)",
  );
  return lines.join("\n");
};

const updatePackageManagerPin = (projectRoot, manager, candidate) => {
  const manifestPath = path.join(projectRoot, "package.json");
  const manifest = readJson(manifestPath, "package.json");
  manifest.packageManager = `${manager}@${candidate.version}`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  return candidate;
};

export const execute = (options, dependencies = {}) => {
  const projectRoot = resolveProjectRoot(options.projectDir);
  const managerVersion = assertManagerVersion(options.manager, projectRoot);
  const manifest = readJson(
    path.join(projectRoot, "package.json"),
    "package.json",
  );
  const ageGateMinutes = parseAgeGate(projectRoot);
  const now = dependencies.now ?? Date.now();

  if (options.audit) {
    return {
      projectRoot,
      manager: options.manager,
      managerVersion,
      ageGateMinutes,
      candidates: [],
      audit: summarizeAudit(readAudit(options.manager, projectRoot)),
      applied: false,
    };
  }

  if (options.inspect) {
    const spec = options.packages[0];
    const packageSpecifier =
      spec.version === "latest" ? spec.name : `${spec.name}@${spec.version}`;
    const metadata = getPackageMetadata(
      options.manager,
      packageSpecifier,
      projectRoot,
      INSPECTION_FIELDS,
    );
    const candidate = selectPublishedVersion(spec, metadata);
    const ageMinutes = Math.floor(
      (now - Date.parse(candidate.publishedAt)) / 60_000,
    );
    return {
      projectRoot,
      manager: options.manager,
      managerVersion,
      ageGateMinutes,
      candidates: [],
      inspection: createInspection(
        candidate,
        metadata,
        ageGateMinutes,
        ageMinutes,
      ),
      applied: false,
    };
  }

  if (options.upgradePackageManager) {
    const metadata = getPackageMetadata(
      options.manager,
      options.manager,
      projectRoot,
    );
    const candidate = selectPublishedVersion(
      { name: options.manager, version: "latest" },
      metadata,
    );
    const ageMinutes = Math.floor(
      (now - Date.parse(candidate.publishedAt)) / 60_000,
    );
    if (ageMinutes < ageGateMinutes) {
      throw new Error(
        `${options.manager}@${candidate.version} is younger than npmMinimalAgeGate.`,
      );
    }
    if (options.apply) {
      updatePackageManagerPin(projectRoot, options.manager, candidate);
    }
    return {
      projectRoot,
      manager: options.manager,
      managerVersion,
      ageGateMinutes,
      candidates: [
        {
          ...candidate,
          status: ageMinutes < ageGateMinutes ? "rejected" : "eligible",
        },
      ],
      applied: options.apply,
    };
  }

  const requested =
    options.packages.length > 0
      ? options.packages.map((spec) => ({
          ...spec,
          dependencyType: dependencyTypeFor(manifest, spec.name),
        }))
      : packageSpecsFromManifest(manifest);
  if (requested.length === 0) {
    throw new Error(
      "No direct dependencies were found; specify package names explicitly.",
    );
  }

  const audit =
    options.securityExceptions.length > 0
      ? readAudit(options.manager, projectRoot)
      : null;
  const exceptions = new Map(
    options.securityExceptions.map((item) => [
      `${item.name}@${item.version}`,
      item,
    ]),
  );
  const candidates = requested.map((spec) => {
    const candidate = selectPublishedVersion(
      spec,
      getPackageMetadata(options.manager, spec.name, projectRoot),
    );
    const ageMinutes = Math.floor(
      (now - Date.parse(candidate.publishedAt)) / 60_000,
    );
    const exception = exceptions.get(`${candidate.name}@${candidate.version}`);
    const exceptionIsValid =
      exception && auditIncludesMajorAdvisory(audit, exception.advisory);
    if (ageMinutes < ageGateMinutes && !exceptionIsValid) {
      return { ...candidate, status: "rejected-age-gate", ageMinutes };
    }
    return {
      ...candidate,
      status: exceptionIsValid ? "eligible-security-exception" : "eligible",
      ageMinutes,
      advisory: exception?.advisory,
    };
  });

  const rejected = candidates.filter(
    (candidate) => candidate.status === "rejected-age-gate",
  );
  if (rejected.length > 0) {
    throw new Error(
      `Age gate rejected: ${rejected.map(({ name, version }) => `${name}@${version}`).join(", ")}`,
    );
  }
  const requestedCandidateKeys = new Set(
    candidates.map(({ name, version }) => `${name}@${version}`),
  );
  const unusedException = options.securityExceptions.find(
    ({ name, version }) => !requestedCandidateKeys.has(`${name}@${version}`),
  );
  if (unusedException) {
    throw new Error(
      `Security exception did not match a selected candidate: ${unusedException.name}@${unusedException.version}`,
    );
  }

  if (!options.apply) {
    return {
      projectRoot,
      manager: options.manager,
      managerVersion,
      ageGateMinutes,
      candidates,
      applied: false,
    };
  }

  const snapshot = snapshotProjectState(projectRoot);
  try {
    for (const args of upgradeCommands(options.manager, candidates)) {
      run(options.manager, args, projectRoot);
    }
    const postAudit = readAudit(options.manager, projectRoot);
    for (const candidate of candidates) {
      if (
        candidate.advisory &&
        auditIncludesMajorAdvisory(postAudit, candidate.advisory)
      ) {
        throw new Error(
          `${candidate.advisory} remains after upgrading ${candidate.name}@${candidate.version}.`,
        );
      }
    }
    for (const verification of options.verifications) {
      runVerification(options.manager, verification, projectRoot);
    }
  } catch (error) {
    restoreProjectState(snapshot, projectRoot);
    throw new Error(
      `Upgrade was rolled back: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  return {
    projectRoot,
    manager: options.manager,
    managerVersion,
    ageGateMinutes,
    candidates,
    applied: true,
  };
};

const isExecutedDirectly = () => {
  const entrypoint = process.argv[1];
  return (
    Boolean(entrypoint) &&
    import.meta.url === pathToFileURL(path.resolve(entrypoint)).href
  );
};

if (isExecutedDirectly()) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(usage);
    } else {
      process.stdout.write(`${formatResult(execute(options), options.json)}\n`);
    }
  } catch (error) {
    process.stderr.write(
      `package-upgrade: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
