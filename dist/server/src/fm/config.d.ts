/** An allowed upload destination path preset (exposed in upload UI as folder shortcuts). */
export interface FmUploadPathPreset {
    relativePath: string;
    name?: string;
}
/**
 * FM server configuration parsed from environment variables.
 *
 * Supports local filesystem and S3-compatible storage providers.
 * Use {@link parseFmServerConfig} to create from a flat env record.
 */
export interface FmServerConfig {
    provider: "local" | "s3";
    dataRootPath?: string;
    uploadRootPath?: string;
    uploadPathPresets?: FmUploadPathPreset[];
    s3Endpoint?: string;
    s3Region?: string;
    s3AccessKeyId?: string;
    s3SecretAccessKey?: string;
    s3ForcePathStyle?: boolean;
    s3PublicBaseUrl?: string;
    /** Presigned URL TTL in seconds (default 300). */
    signedUrlTtlSeconds?: number;
    /** Bucket name for CMS assets (default "cms"). */
    bucketCms?: string;
    /** Bucket name for user uploads (default "user-uploads"). */
    bucketUserUploads?: string;
    /** Public client URL for canonical media URL generation. */
    clientUrl?: string;
}
/**
 * The env keys that `parseFmServerConfig` reads.
 * Callers can use this to request exactly the right keys from their config layer.
 */
export declare const FM_SERVER_CONFIG_KEYS: readonly ["FM_STORAGE_PROVIDER", "DATA_ROOT_PATH", "FM_UPLOAD_ROOT_PATH", "FM_UPLOAD_PATH_PRESETS", "S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_FORCE_PATH_STYLE", "S3_PUBLIC_BASE_URL", "FM_SIGNED_URL_TTL_SECS", "S3_BUCKET_CMS", "S3_BUCKET_USER_UPLOADS", "CLIENT_URL"];
/** Union type of all environment variable keys read by {@link parseFmServerConfig}. */
export type FmServerConfigKey = (typeof FM_SERVER_CONFIG_KEYS)[number];
/**
 * Parse an FM server configuration from a flat env-like record.
 *
 * This is a **pure function** — no singletons, no side effects.
 * db-supabase (or any consumer) should pass in the relevant env values.
 *
 * @param env - A flat key-value record (e.g. from `process.env` or `getConfiguration()`).
 * @returns The parsed FmServerConfig.
 */
export declare const parseFmServerConfig: (env: Record<string, unknown>) => FmServerConfig;
/**
 * Assert that an FM server configuration is valid for its declared provider.
 *
 * For `"local"` provider: requires `dataRootPath` or `uploadRootPath`.
 * For `"s3"` provider: requires `s3Endpoint`, `s3AccessKeyId`, and `s3SecretAccessKey`.
 *
 * @param cfg - The configuration object to validate.
 * @throws If any required configuration values are missing for the provider.
 */
export declare const assertValidFmServerConfig: (cfg: FmServerConfig) => void;
/**
 * Resolve the local filesystem root directory used by the FM subsystem.
 *
 * Default behavior:
 *   `${resolved(DATA_ROOT_PATH)}/uploads`
 *
 * Override behavior (`FM_UPLOAD_ROOT_PATH`):
 * - Absolute path: used as-is
 * - Relative path: resolved relative to `resolved(DATA_ROOT_PATH)`
 *
 * @param cfg - A parsed FmServerConfig (must be provider="local").
 * @returns The absolute filesystem path to the local upload root.
 * @throws If the provider is not `"local"`, or required paths are missing.
 */
export declare const resolveFmLocalUploadRootAbsPath: (cfg: FmServerConfig) => string;
/**
 * Return sanitized upload path presets from a config.
 *
 * Each preset's `relativePath` must be a single segment (no slashes or
 * path traversals). The `name` field defaults to `relativePath` when absent.
 *
 * @param cfg - A parsed FmServerConfig.
 * @returns Array of validated upload path presets.
 */
export declare const getFmUploadPathPresetsFromConfig: (cfg: FmServerConfig) => FmUploadPathPreset[];
//# sourceMappingURL=config.d.ts.map