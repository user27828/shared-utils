/**
 * FM Error Types — shared-utils
 *
 * Typed error classes for the File Manager system. Each carries a machine-readable
 * `code` for structured API responses. Mirrors the CMS error pattern in
 * utils/src/cms/errors.ts.
 *
 * Error → HTTP status mapping:
 *   FM_NOT_FOUND       → 404
 *   FM_VALIDATION      → 400
 *   FM_POLICY          → 422
 *   FM_CONFLICT        → 409
 *   FM_AUTHORIZATION   → 403
 *   FM_AUTHENTICATION  → 401
 *   FM_STORAGE         → 502
 */
// ── Base class ────────────────────────────────────────────────────────────
/**
 * Base FM error class.
 *
 * Carries a machine-readable `code` field for structured API responses.
 * Use typed subclasses (FmNotFoundError, FmValidationError, etc.) for
 * specific scenarios.
 */
export class FmError extends Error {
    constructor(message, code) {
        super(message);
        this.name = "FmError";
        this.code = code;
    }
}
// ── Subclasses ────────────────────────────────────────────────────────────
/** 404 — File, variant, or other entity not found. */
export class FmNotFoundError extends FmError {
    constructor(entity, uid) {
        super(`${entity} not found: ${uid}`, "FM_NOT_FOUND");
        this.name = "FmNotFoundError";
    }
}
/** 400 — Request validation failure (malformed input). */
export class FmValidationError extends FmError {
    constructor(message, details = {}) {
        super(message, "FM_VALIDATION");
        this.name = "FmValidationError";
        this.details = details;
    }
}
/** 409 — Conflict (e.g., duplicate UID, concurrent modification). */
export class FmConflictError extends FmError {
    constructor(message) {
        super(message, "FM_CONFLICT");
        this.name = "FmConflictError";
    }
}
/** 403 — Forbidden (user lacks permission for this operation). */
export class FmAuthorizationError extends FmError {
    constructor(message = "Not authorized") {
        super(message, "FM_AUTHORIZATION");
        this.name = "FmAuthorizationError";
    }
}
/** 401 — Authentication required (no valid session/token). */
export class FmAuthenticationError extends FmError {
    constructor(message = "Authentication required") {
        super(message, "FM_AUTHENTICATION");
        this.name = "FmAuthenticationError";
    }
}
/** 502 — Storage backend error (S3, local filesystem, etc.). */
export class FmStorageError extends FmError {
    constructor(message, cause) {
        super(message, "FM_STORAGE");
        this.name = "FmStorageError";
        this.cause = cause;
    }
}
/** 422 — Upload policy violation (extension, MIME, size). */
export class FmPolicyError extends FmError {
    constructor(message) {
        super(message, "FM_POLICY");
        this.name = "FmPolicyError";
    }
}
// ── Type guard ────────────────────────────────────────────────────────────
/**
 * Type guard for FmError instances.
 * @param err - unknown value to check
 * @returns true if `err` is an instance of FmError
 */
export function isFmError(err) {
    return err instanceof FmError;
}
// ── HTTP status mapping ───────────────────────────────────────────────────
const FM_ERROR_STATUS = {
    FM_NOT_FOUND: 404,
    FM_VALIDATION: 400,
    FM_POLICY: 422,
    FM_CONFLICT: 409,
    FM_AUTHORIZATION: 403,
    FM_AUTHENTICATION: 401,
    FM_STORAGE: 502,
};
/**
 * Convert an error to a structured JSON response suitable for Express.
 * Handles both FmError subclasses and unexpected errors.
 *
 * @param res - Express-compatible response object (status + json methods)
 * @param err - The error to convert
 */
export function sendFmError(res, err) {
    if (isFmError(err)) {
        const status = FM_ERROR_STATUS[err.code] ?? 500;
        res.status(status).json({
            success: false,
            message: err.message,
            code: err.code,
            ...(err instanceof FmValidationError ? { details: err.details } : {}),
        });
    }
    else {
        console.error("[FM] Unhandled error in sendFmError:", err);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            code: "FM_INTERNAL",
        });
    }
}
/**
 * Get the HTTP status code for an FmError code string.
 * Returns 500 for unknown codes.
 *
 * @param code - The FmError code string (e.g., "FM_NOT_FOUND")
 * @returns HTTP status code
 */
export function fmErrorToStatus(code) {
    return FM_ERROR_STATUS[code] ?? 500;
}
