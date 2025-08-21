type MaybeRequest = {
    headers?: Record<string, any>;
    secure?: boolean;
} | unknown;
declare const env: Record<string, any>;
/**
 * Dynamically determine the client URL
 * @param {MaybeRequest} req
 * @returns {string} The client URL
 */
export declare const getClientUrl: (req: MaybeRequest) => any;
export default env;
//# sourceMappingURL=env.d.ts.map