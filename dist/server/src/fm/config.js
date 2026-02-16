/**
 * FM Server Configuration — shared-utils
 *
 * Pure-function configuration parser for FM server settings.
 * Accepts a flat env-like record instead of depending on a `getConfiguration()` singleton.
 *
 * The db-supabase adapter calls `parseFmServerConfig(envFromConfiguration())`
 * to bridge the gap.
 *
 * Extracted & refactored from: db-supabase/server/fm/config.ts
 */
import path from "path";
/**
 * The env keys that `parseFmServerConfig` reads.
 * Callers can use this to request exactly the right keys from their config layer.
 */
export const FM_SERVER_CONFIG_KEYS = [
    "FM_STORAGE_PROVIDER",
    "DATA_ROOT_PATH",
    "FM_UPLOAD_ROOT_PATH",
    "FM_UPLOAD_PATH_PRESETS",
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "S3_FORCE_PATH_STYLE",
    "S3_PUBLIC_BASE_URL",
    "FM_SIGNED_URL_TTL_SECS",
    "S3_BUCKET_CMS",
    "S3_BUCKET_USER_UPLOADS",
    "CLIENT_URL",
];
// ── Helpers ───────────────────────────────────────────────────────────────
/**
 * Parse a positive integer from a raw config value.
 * Returns undefined for falsy, NaN, zero, or negative values.
 */
const parsePositiveInt = (v) => {
    if (!v) {
        return undefined;
    }
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) {
        return undefined;
    }
    return Math.floor(n);
};
// ── Parser ────────────────────────────────────────────────────────────────
/**
 * Parse upload path presets from a raw config value.
 * Accepts an array of objects or a JSON string.
 */
const parsePresets = (v) => {
    if (!v) {
        return undefined;
    }
    if (Array.isArray(v)) {
        return v
            .filter(Boolean)
            .map((p) => ({
            relativePath: String(p.relativePath || "").trim(),
            name: p.name ? String(p.name) : undefined,
        }))
            .filter((p) => Boolean(p.relativePath));
    }
    if (typeof v === "string") {
        try {
            const parsed = JSON.parse(v);
            if (Array.isArray(parsed)) {
                return parsed
                    .filter(Boolean)
                    .map((p) => ({
                    relativePath: String(p.relativePath || "").trim(),
                    name: p.name ? String(p.name) : undefined,
                }))
                    .filter((p) => Boolean(p.relativePath));
            }
        }
        catch {
            // ignore malformed JSON
        }
    }
    return undefined;
};
/**
 * Parse an FM server configuration from a flat env-like record.
 *
 * This is a **pure function** — no singletons, no side effects.
 * db-supabase (or any consumer) should pass in the relevant env values.
 *
 * @param env - A flat key-value record (e.g. from `process.env` or `getConfiguration()`).
 * @returns The parsed FmServerConfig.
 */
export const parseFmServerConfig = (env) => {
    const provider = (env.FM_STORAGE_PROVIDER || "local");
    return {
        provider,
        dataRootPath: env.DATA_ROOT_PATH || undefined,
        uploadRootPath: env.FM_UPLOAD_ROOT_PATH || undefined,
        uploadPathPresets: parsePresets(env.FM_UPLOAD_PATH_PRESETS),
        s3Endpoint: env.S3_ENDPOINT || undefined,
        s3Region: env.S3_REGION || undefined,
        s3AccessKeyId: env.S3_ACCESS_KEY_ID || undefined,
        s3SecretAccessKey: env.S3_SECRET_ACCESS_KEY || undefined,
        s3ForcePathStyle: typeof env.S3_FORCE_PATH_STYLE === "boolean"
            ? env.S3_FORCE_PATH_STYLE
            : undefined,
        s3PublicBaseUrl: env.S3_PUBLIC_BASE_URL || undefined,
        signedUrlTtlSeconds: parsePositiveInt(env.FM_SIGNED_URL_TTL_SECS),
        bucketCms: env.S3_BUCKET_CMS || undefined,
        bucketUserUploads: env.S3_BUCKET_USER_UPLOADS || undefined,
        clientUrl: env.CLIENT_URL || undefined,
    };
};
// ── Validation ────────────────────────────────────────────────────────────
/**
 * Assert that an FM server configuration is valid for its declared provider.
 *
 * For `"local"` provider: requires `dataRootPath` or `uploadRootPath`.
 * For `"s3"` provider: requires `s3Endpoint`, `s3AccessKeyId`, and `s3SecretAccessKey`.
 *
 * @param cfg - The configuration object to validate.
 * @throws If any required configuration values are missing for the provider.
 */
export const assertValidFmServerConfig = (cfg) => {
    if (cfg.provider === "local") {
        if (!cfg.dataRootPath && !cfg.uploadRootPath) {
            throw new Error("FM local storage requires DATA_ROOT_PATH or FM_UPLOAD_ROOT_PATH to be set (absolute path recommended)");
        }
        if (cfg.uploadRootPath &&
            !path.isAbsolute(cfg.uploadRootPath) &&
            !cfg.dataRootPath) {
            throw new Error("FM local storage: FM_UPLOAD_ROOT_PATH is relative but DATA_ROOT_PATH is not set");
        }
        return;
    }
    if (!cfg.s3Endpoint) {
        throw new Error("FM s3 storage requires S3_ENDPOINT");
    }
    if (!cfg.s3AccessKeyId) {
        throw new Error("FM s3 storage requires S3_ACCESS_KEY_ID");
    }
    if (!cfg.s3SecretAccessKey) {
        throw new Error("FM s3 storage requires S3_SECRET_ACCESS_KEY");
    }
};
// ── Path resolution ───────────────────────────────────────────────────────
const resolveDataRootToAbsolute = (dataRootPath) => {
    if (path.isAbsolute(dataRootPath)) {
        return dataRootPath;
    }
    return path.resolve(process.cwd(), dataRootPath);
};
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
export const resolveFmLocalUploadRootAbsPath = (cfg) => {
    assertValidFmServerConfig(cfg);
    if (cfg.provider !== "local") {
        throw new Error("FM local upload root requested for non-local provider");
    }
    const dataRootAbs = cfg.dataRootPath
        ? resolveDataRootToAbsolute(cfg.dataRootPath)
        : undefined;
    if (cfg.uploadRootPath) {
        if (path.isAbsolute(cfg.uploadRootPath)) {
            return path.resolve(cfg.uploadRootPath);
        }
        if (!dataRootAbs) {
            throw new Error("FM_UPLOAD_ROOT_PATH is relative but DATA_ROOT_PATH is not configured");
        }
        return path.resolve(dataRootAbs, cfg.uploadRootPath);
    }
    if (!dataRootAbs) {
        throw new Error("DATA_ROOT_PATH is required for local FM storage");
    }
    return path.resolve(dataRootAbs, "uploads");
};
/**
 * Return sanitized upload path presets from a config.
 *
 * Each preset's `relativePath` must be a single segment (no slashes or
 * path traversals). The `name` field defaults to `relativePath` when absent.
 *
 * @param cfg - A parsed FmServerConfig.
 * @returns Array of validated upload path presets.
 */
export const getFmUploadPathPresetsFromConfig = (cfg) => {
    const presets = cfg.uploadPathPresets || [];
    return presets
        .map((p) => {
        const relativePath = String(p.relativePath || "").trim();
        const name = p.name ? String(p.name).trim() : undefined;
        return { relativePath, name };
    })
        .filter((p) => Boolean(p.relativePath))
        .filter((p) => !p.relativePath.includes("/"))
        .filter((p) => !p.relativePath.includes("\\"))
        .filter((p) => !p.relativePath.includes(".."))
        .map((p) => ({
        relativePath: p.relativePath,
        name: p.name || p.relativePath,
    }));
};
//# sourceMappingURL=config.js.map