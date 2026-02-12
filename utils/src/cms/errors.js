"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cmsErrorToResponse = exports.isCmsError = exports.CmsAuthorizationError = exports.CmsAuthenticationError = exports.CmsLockedError = exports.CmsValidationError = exports.CmsNotFoundError = exports.CmsConflictError = exports.CmsPreconditionFailedError = exports.CmsError = void 0;
class CmsError extends Error {
    constructor(message, statusCode, code) {
        super(message);
        this.name = "CmsError";
        this.statusCode = statusCode;
        this.code = code;
    }
}
exports.CmsError = CmsError;
class CmsPreconditionFailedError extends CmsError {
    constructor(message = "ETag mismatch: content has been modified") {
        super(message, 412, "PRECONDITION_FAILED");
        this.name = "CmsPreconditionFailedError";
    }
}
exports.CmsPreconditionFailedError = CmsPreconditionFailedError;
class CmsConflictError extends CmsError {
    constructor(message = "Slug change on published content requires confirmation") {
        super(message, 409, "CONFLICT");
        this.name = "CmsConflictError";
    }
}
exports.CmsConflictError = CmsConflictError;
class CmsNotFoundError extends CmsError {
    constructor(message = "Content not found") {
        super(message, 404, "NOT_FOUND");
        this.name = "CmsNotFoundError";
    }
}
exports.CmsNotFoundError = CmsNotFoundError;
class CmsValidationError extends CmsError {
    constructor(message = "Validation error", details) {
        super(message, 400, "VALIDATION_ERROR");
        this.name = "CmsValidationError";
        this.details = details;
    }
}
exports.CmsValidationError = CmsValidationError;
class CmsLockedError extends CmsError {
    constructor(message = "Content is locked by another user", lockedBy, lockedAt) {
        super(message, 423, "LOCKED");
        this.name = "CmsLockedError";
        this.lockedBy = lockedBy;
        this.lockedAt = lockedAt;
    }
}
exports.CmsLockedError = CmsLockedError;
class CmsAuthenticationError extends CmsError {
    constructor(message = "Authentication required") {
        super(message, 401, "AUTHENTICATION_REQUIRED");
        this.name = "CmsAuthenticationError";
    }
}
exports.CmsAuthenticationError = CmsAuthenticationError;
class CmsAuthorizationError extends CmsError {
    constructor(message = "Insufficient permissions") {
        super(message, 403, "AUTHORIZATION_FAILED");
        this.name = "CmsAuthorizationError";
    }
}
exports.CmsAuthorizationError = CmsAuthorizationError;
const isCmsError = (err) => {
    return err instanceof CmsError;
};
exports.isCmsError = isCmsError;
const cmsErrorToResponse = (err) => {
    const resp = {
        success: false,
        message: err.message,
        code: err.code,
    };
    if (err instanceof CmsValidationError && err.details) {
        resp.details = err.details;
    }
    return resp;
};
exports.cmsErrorToResponse = cmsErrorToResponse;
//# sourceMappingURL=errors.js.map