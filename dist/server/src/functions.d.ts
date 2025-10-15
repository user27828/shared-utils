/**
 * Helper functions
 */
export interface IsDevOptions {
    xCriteria?: (() => boolean) | null;
}
/**
 * Check if the current environment is development (server-side)
 * @param options.xCriteria - eXtra criteria to check if the environment is development - additional check to default
 */
export declare const isDev: ({ xCriteria }?: IsDevOptions) => boolean;
//# sourceMappingURL=functions.d.ts.map