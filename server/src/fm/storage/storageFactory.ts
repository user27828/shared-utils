/**
 * FM Storage Factory — shared-utils
 *
 * Async factory that creates the correct storage adapter based on the
 * parsed FmServerConfig. Uses dynamic import for FmStorageS3 to avoid
 * forcing @aws-sdk dependencies on consumers who only need local storage.
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
export const createFmStorage = async (
  config: FmServerConfig,
): Promise<FmStorageAdapter> => {
  assertValidFmServerConfig(config);

  if (config.provider === "local") {
    return new FmStorageLocal({
      dataRootAbsPath: resolveFmLocalUploadRootAbsPath(config),
    });
  }

  // Dynamic import: only loads @aws-sdk when S3 is actually needed.
  // This allows consumers using local storage to skip installing the SDK.
  let FmStorageS3: any;
  try {
    const mod = await import("./FmStorageS3.js");
    FmStorageS3 = mod.FmStorageS3;
  } catch (err: any) {
    const isModuleNotFound =
      err?.code === "MODULE_NOT_FOUND" ||
      err?.code === "ERR_MODULE_NOT_FOUND" ||
      (err?.message && err.message.includes("Cannot find module"));
    if (isModuleNotFound) {
      throw new Error(
        "FM S3 storage requires @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner. " +
          "Install them: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner",
      );
    }
    throw err;
  }

  return new FmStorageS3({
    endpoint: config.s3Endpoint!,
    region: config.s3Region,
    accessKeyId: config.s3AccessKeyId!,
    secretAccessKey: config.s3SecretAccessKey!,
    forcePathStyle: config.s3ForcePathStyle,
    publicBaseUrl: config.s3PublicBaseUrl,
  });
};
