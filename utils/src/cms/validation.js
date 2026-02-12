"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertAllowedStatus = exports.assertAllowedPostType = exports.assertAllowedContentType = exports.assertValidSlug = exports.isValidSlug = exports.canonicalizeSlug = exports.normalizeLocale = void 0;
const types_js_1 = require("./types.js");
const errors_js_1 = require("./errors.js");
const normalizeLocale = (raw) => {
    const str = String(raw || "")
        .trim()
        .replace(/_/g, "-");
    const parts = str.split("-");
    if (parts.length === 1) {
        return parts[0].toLowerCase();
    }
    return [parts[0].toLowerCase(), ...parts.slice(1).map((p) => p.toUpperCase())].join("-");
};
exports.normalizeLocale = normalizeLocale;
const canonicalizeSlug = (raw) => {
    return String(raw || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_]+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-{2,}/g, "-")
        .replace(/^-+|-+$/g, "");
};
exports.canonicalizeSlug = canonicalizeSlug;
const isValidSlug = (slug) => {
    if (!slug || slug.includes("/") || slug.includes("\\") || slug.includes("..")) {
        return false;
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
};
exports.isValidSlug = isValidSlug;
const assertValidSlug = (slug, reservedSlugs = []) => {
    if (!(0, exports.isValidSlug)(slug)) {
        throw new errors_js_1.CmsValidationError(`Invalid slug: "${slug}"`, {
            slug: "Slug must contain only lowercase alphanumeric characters and hyphens",
        });
    }
    if (reservedSlugs.includes(slug)) {
        throw new errors_js_1.CmsValidationError(`Reserved slug: "${slug}"`, {
            slug: `"${slug}" is reserved and cannot be used`,
        });
    }
};
exports.assertValidSlug = assertValidSlug;
const assertAllowedContentType = (contentType) => {
    const result = types_js_1.CmsContentTypeSchema.safeParse(contentType);
    if (!result.success) {
        throw new errors_js_1.CmsValidationError(`Invalid content type: "${contentType}"`, {
            content_type: `Must be one of: ${types_js_1.CmsContentTypeSchema.options.join(", ")}`,
        });
    }
};
exports.assertAllowedContentType = assertAllowedContentType;
const assertAllowedPostType = (postType) => {
    const result = types_js_1.CmsPostTypeSchema.safeParse(postType);
    if (!result.success) {
        throw new errors_js_1.CmsValidationError(`Invalid post type: "${postType}"`, {
            post_type: `Must be one of: ${types_js_1.CmsPostTypeSchema.options.join(", ")}`,
        });
    }
};
exports.assertAllowedPostType = assertAllowedPostType;
const assertAllowedStatus = (status) => {
    const result = types_js_1.CmsStatusSchema.safeParse(status);
    if (!result.success) {
        throw new errors_js_1.CmsValidationError(`Invalid status: "${status}"`, {
            status: `Must be one of: ${types_js_1.CmsStatusSchema.options.join(", ")}`,
        });
    }
};
exports.assertAllowedStatus = assertAllowedStatus;
//# sourceMappingURL=validation.js.map