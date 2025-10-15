/**
 * Helper functions
 */
/**
 * Check if the current environment is development (server-side)
 * @param options.xCriteria - eXtra criteria to check if the environment is development - additional check to default
 */
export const isDev = ({ xCriteria = null } = {}) => {
    const nodeEnv = process.env.NODE_ENV;
    const isDevelopmentEnv = nodeEnv === "development";
    const isDevEnv = process.env.DEV === "true" || process.env.DEV === "1";
    let result = isDevelopmentEnv || isDevEnv;
    if (typeof xCriteria === "function") {
        result = result || xCriteria();
    }
    return result;
};
//# sourceMappingURL=functions.js.map