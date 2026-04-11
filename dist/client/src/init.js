"use strict";
/**
 * Client-side initialization: disables MUI X telemetry and attaches the
 * shared-utils logger to window.log. Import this module once in your app entry
 * point to set up the global logger and telemetry opt-out.
 *
 * This is separated from the client barrel (client/index.ts) so that the barrel
 * remains side-effect-free and tree-shakeable.
 */
Object.defineProperty(globalThis, "__MUI_X_TELEMETRY_DISABLED__", {
    value: true,
    configurable: true,
    writable: true,
});
if (typeof window !== "undefined" &&
    typeof window.log === "undefined") {
    import("../../utils/src/log.js").then(({ default: log }) => {
        window.log = log;
    });
}
