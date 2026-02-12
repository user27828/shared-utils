/**
 * CMS Concurrency — shared-utils
 *
 * ETag/If-Match enforcement for optimistic concurrency control.
 */
import { CmsPreconditionFailedError, CmsValidationError } from "./errors.js";
/**
 * Parse an HTTP If-Match header into a list of ETag values.
 * Supports `*` wildcard and comma-separated values.
 */
export const parseIfMatchHeader = (header) => {
    const raw = String(header || "").trim();
    if (!raw) {
        return [];
    }
    if (raw === "*") {
        return ["*"];
    }
    return raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
};
/**
 * Assert that an If-Match header is present and satisfies the current ETag.
 *
 * CMS writes MUST include an If-Match header. If the provided ETag(s)
 * do not match the current row's ETag, a 412 (Precondition Failed) is thrown.
 *
 * @throws CmsValidationError if If-Match header is missing
 * @throws CmsPreconditionFailedError if ETag does not match
 */
export const assertIfMatchSatisfied = (input) => {
    const tags = parseIfMatchHeader(input.ifMatchHeader);
    if (tags.length === 0) {
        throw new CmsValidationError("If-Match header is required for CMS writes", {
            "If-Match": "Missing required header",
        });
    }
    // Wildcard always matches
    if (tags.includes("*")) {
        return;
    }
    const current = String(input.currentEtag || "").trim();
    if (!current) {
        // No etag stored yet — allow
        return;
    }
    const matched = tags.some((t) => t === current);
    if (!matched) {
        throw new CmsPreconditionFailedError(`ETag mismatch: expected "${current}", got "${tags.join(", ")}"`);
    }
};
/**
 * Compute a deterministic CMS ETag.
 * Format: `cms:{uid}:v{version}`
 */
export const computeCmsEtag = (uid, version) => {
    return `cms:${uid}:v${version}`;
};
