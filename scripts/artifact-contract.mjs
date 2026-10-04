import fs from "node:fs";
import path from "node:path";

/** Concrete entrypoints plus wildcard targets, derived from the installed manifest. */
export function artifactTargets(manifest) {
  const targets = new Set([manifest.main, manifest.types].filter(Boolean));
  function visit(value) {
    if (typeof value === "string") {
      if (value.startsWith("./")) {
        targets.add(value);
      }
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  }
  visit(manifest.exports);
  for (const target of Object.values(manifest.bin ?? {})) {
    targets.add(target);
  }
  for (const target of manifest.files ?? []) {
    if (/^(?:dist|scripts|bin)\//.test(target) && !target.includes("*")) {
      targets.add(target);
    }
  }
  return [...targets].map((target) => target.replace(/^\.\//, "")).sort();
}

/** Wildcards must match shipped files; concrete contracts must exist verbatim. */
export function missingArtifacts(root, manifest) {
  const missing = [];
  for (const target of artifactTargets(manifest)) {
    if (!target.includes("*")) {
      if (!fs.existsSync(path.join(root, target))) {
        missing.push(target);
      }
      continue;
    }
    const prefix = target.slice(0, target.indexOf("*"));
    const directory = path.dirname(prefix);
    const expression = new RegExp(
      `^${target
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    const base = path.join(root, directory);
    const matches =
      fs.existsSync(base) &&
      fs
        .readdirSync(base, { recursive: true })
        .some((entry) =>
          expression.test(
            path.posix.join(directory, String(entry).split(path.sep).join("/")),
          ),
        );
    if (!matches) {
      missing.push(target);
    }
  }
  return missing;
}
