/**
 * Client-side initialization: attaches the shared-utils logger to window.log.
 * Import this module once in your app entry point to set up the global logger.
 *
 * This is separated from the client barrel (client/index.ts) so that the barrel
 * remains side-effect-free and tree-shakeable.
 */
if (
  typeof window !== "undefined" &&
  typeof (window as any).log === "undefined"
) {
  import("../../utils/src/log.js").then(({ default: log }) => {
    (window as any).log = log;
  });
}
