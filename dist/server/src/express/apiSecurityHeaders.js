/**
 * Apply baseline response hardening headers to API responses.
 *
 * Avoid overriding an explicit downstream value if one has already been set.
 */
export const apiResponseSecurityHeaders = (_req, res, next) => {
    if (!res.getHeader("X-Content-Type-Options")) {
        res.setHeader("X-Content-Type-Options", "nosniff");
    }
    next();
};
//# sourceMappingURL=apiSecurityHeaders.js.map