import type { FmServerConfig } from "../config.js";
import type { FmStorageAdapter } from "./FmStorageAdapter.js";
export type FmS3StorageFactory = (config: FmServerConfig) => FmStorageAdapter | Promise<FmStorageAdapter>;
/**
 * Create an FM storage adapter from a parsed server configuration.
 *
 * Supply createFmS3Storage from fm/server/s3 for S3 configurations.
 *
 * @param config - A parsed FmServerConfig (from `parseFmServerConfig`).
 * @param createS3Storage - Explicit optional S3 factory; never used for local storage.
 * @returns A configured FmStorageAdapter instance.
 * @throws If config validation fails or an S3 factory was not supplied.
 */
export declare const createFmStorage: (config: FmServerConfig, createS3Storage?: FmS3StorageFactory) => Promise<FmStorageAdapter>;
