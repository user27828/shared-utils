import "../../utils/src/options-manager.js";
/**
 * Attach the shared logger to globalThis when no logger is already present.
 * Importing this entrypoint calls the function once; callers may also invoke
 * it again if the global logger has since been cleared.
 */
export declare const initializeServerLogging: () => import("../../utils/src/log.js").Log;
