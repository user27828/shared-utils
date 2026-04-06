import path from "path";

export const createReactAppResolveAliases = (dirname: string) => {
  return [
    { find: "@", replacement: "/src" },
    {
      find: "@user27828/shared-utils/cms/client",
      replacement: path.resolve(dirname, "../../dist/client/src/cms/index.js"),
    },
    {
      find: "@user27828/shared-utils/fm/client",
      replacement: path.resolve(dirname, "../../dist/client/src/fm/index.js"),
    },
    {
      find: /^@user27828\/shared-utils\/(.*)/,
      replacement: path.resolve(dirname, "../../dist/$1"),
    },
    {
      find: "@user27828/shared-utils",
      replacement: path.resolve(dirname, "../../dist/utils/index.js"),
    },
  ];
};
