/**
 * FM Storage Factory — shared-utils
 *
 * Async factory that creates the correct storage adapter based on the
 * parsed FmServerConfig. S3 creation is injected by hosts that opt into it.
 *
 * Usage:
 *   const config = parseFmServerConfig(process.env);
 *   const storage = await createFmStorage(config);
 *
 * Extracted & refactored from: db-supabase/server/fm/storage/fmStorageFactory.ts
 * (original was synchronous and relied on config singletons)
 */
import {
  assertValidFmServerConfig,
  resolveFmLocalUploadRootAbsPath,
} from "../config.js";
import type { FmServerConfig } from "../config.js";
import type { FmStorageAdapter } from "./FmStorageAdapter.js";
import { FmStorageLocal } from "./FmStorageLocal.js";
import { FmValidationError } from "../../../../utils/src/fm/errors.js";

export type FmS3StorageFactory = (
  config: FmServerConfig,
) => FmStorageAdapter | Promise<FmStorageAdapter>;

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
export const createFmStorage = async (
  config: FmServerConfig,
  createS3Storage?: FmS3StorageFactory,
): Promise<FmStorageAdapter> => {
  assertValidFmServerConfig(config);

  if (config.provider === "local") {
    return new FmStorageLocal({
      dataRootAbsPath: resolveFmLocalUploadRootAbsPath(config),
    });
  }

  if (!createS3Storage) {
    throw new FmValidationError(
      "S3 storage requires an explicit factory: import createFmS3Storage from " +
        "@user27828/shared-utils/fm/server/s3 and pass it to createFmStorage(config, createFmS3Storage). " +
        "Install peers with yarn add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner.",
    );
  }
  return createS3Storage(config);
};
