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
/**
 * Base FM error class.
 *
 * Carries a machine-readable `code` field for structured API responses.
 * Use typed subclasses (FmNotFoundError, FmValidationError, etc.) for
 * specific scenarios.
 */
export declare class FmError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
/** 404 — File, variant, or other entity not found. */
export declare class FmNotFoundError extends FmError {
    constructor(entity: string, uid: string);
}
/** 400 — Request validation failure (malformed input). */
export declare class FmValidationError extends FmError {
    readonly details: Record<string, string>;
    constructor(message: string, details?: Record<string, string>);
}
/** 409 — Conflict (e.g., duplicate UID, concurrent modification). */
export declare class FmConflictError extends FmError {
    constructor(message: string);
}
/** 403 — Forbidden (user lacks permission for this operation). */
export declare class FmAuthorizationError extends FmError {
    constructor(message?: string);
}
/** 401 — Authentication required (no valid session/token). */
export declare class FmAuthenticationError extends FmError {
    constructor(message?: string);
}
/** 502 — Storage backend error (S3, local filesystem, etc.). */
export declare class FmStorageError extends FmError {
    readonly cause?: Error;
    constructor(message: string, cause?: Error);
}
/** 422 — Upload policy violation (extension, MIME, size). */
export declare class FmPolicyError extends FmError {
    constructor(message: string);
}
/**
 * Type guard for FmError instances.
 * @param err - unknown value to check
 * @returns true if `err` is an instance of FmError
 */
export declare function isFmError(err: unknown): err is FmError;
/**
 * Convert an error to a structured JSON response suitable for Express.
 * Handles both FmError subclasses and unexpected errors.
 *
 * @param res - Express-compatible response object (status + json methods)
 * @param err - The error to convert
 */
export declare function sendFmError(res: {
    status(code: number): {
        json(body: unknown): void;
    };
}, err: unknown): void;
/**
 * Get the HTTP status code for an FmError code string.
 * Returns 500 for unknown codes.
 *
 * @param code - The FmError code string (e.g., "FM_NOT_FOUND")
 * @returns HTTP status code
 */
export declare function fmErrorToStatus(code: string): number;
//# sourceMappingURL=errors.d.ts.map