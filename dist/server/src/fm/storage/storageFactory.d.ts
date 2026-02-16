import type { FmServerConfig } from "../config.js";
import type { FmStorageAdapter } from "./FmStorageAdapter.js";
/**
 * Create an FM storage adapter from a parsed server configuration.
 *
 * This is an async function because the S3 adapter module is loaded
 * dynamically to avoid requiring @aws-sdk when using local storage.
 *
 * @param config - A parsed FmServerConfig (from `parseFmServerConfig`).
 * @returns A configured FmStorageAdapter instance.
 * @throws If config validation fails or the S3 SDK is not installed.
 */
export declare const createFmStorage: (config: FmServerConfig) => Promise<FmStorageAdapter>;
//# sourceMappingURL=storageFactory.d.ts.map