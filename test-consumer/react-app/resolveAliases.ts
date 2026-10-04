import fs from "node:fs";
import path from "path";

export const createReactAppResolveAliases = (dirname: string) => {
  const packageRoot = path.resolve(dirname, "../../");
  const packageMetadata = JSON.parse(
    fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
  );
  const packageName = packageMetadata.name as string;
  const entries = Object.entries(
    packageMetadata.exports as Record<string, unknown>,
  );
  const exactAliases = entries
    .filter(([subpath]) => !subpath.includes("*"))
    .map(([subpath, conditions]) => {
      const target =
        typeof conditions === "string"
          ? conditions
          : ((conditions as { import?: string; default?: string }).import ??
            (conditions as { default?: string }).default);

      if (!target) {
        throw new Error(`No import target for package export ${subpath}`);
      }

      const request =
        subpath === "." ? packageName : `${packageName}/${subpath.slice(2)}`;
      return {
        find: request,
        replacement: path.resolve(packageRoot, target),
      };
    })
    .sort((left, right) => right.find.length - left.find.length);
  const wildcardAliases = entries
    .filter(
      ([subpath, target]) =>
        subpath.includes("*") && typeof target === "string",
    )
    .map(([subpath, target]) => {
      const splitAt = subpath.indexOf("*");
      const requestPrefix = `${packageName}/${subpath.slice(2, splitAt)}`;
      const requestSuffix = subpath.slice(splitAt + 1);
      const targetString = target as string;
      const targetSplitAt = targetString.indexOf("*");
      if (targetSplitAt === -1) {
        throw new Error(`Wildcard export ${subpath} has no target wildcard`);
      }

      const targetPrefix = targetString.slice(0, targetSplitAt);
      const targetSuffix = targetString.slice(targetSplitAt + 1);
      const resolvedTargetPrefix = path.resolve(packageRoot, targetPrefix);
      const targetPathPrefix = targetPrefix.endsWith("/")
        ? `${resolvedTargetPrefix}${path.sep}`
        : resolvedTargetPrefix;
      const escapeRegExp = (value: string) =>
        value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      return {
        find: new RegExp(
          `^${escapeRegExp(requestPrefix)}(.+)${escapeRegExp(requestSuffix)}$`,
        ),
        replacement: `${targetPathPrefix}$1${targetSuffix}`,
      };
    });

  return [
    { find: "@", replacement: "/src" },
    ...exactAliases,
    ...wildcardAliases,
  ];
};
