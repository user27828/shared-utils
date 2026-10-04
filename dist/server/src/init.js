import "../../utils/src/options-manager.js";
import log from "../../utils/src/log.js";
/**
 * Attach the shared logger to globalThis when no logger is already present.
 * Importing this entrypoint calls the function once; callers may also invoke
 * it again if the global logger has since been cleared.
 */
export const initializeServerLogging = () => {
    const serverGlobal = globalThis;
    if (typeof serverGlobal.log === "undefined") {
        serverGlobal.log = log;
    }
    return serverGlobal.log;
};
initializeServerLogging();
//# sourceMappingURL=init.js.map