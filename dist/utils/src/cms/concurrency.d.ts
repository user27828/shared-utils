/**
 * Parse an HTTP If-Match header into a list of ETag values.
 * Supports `*` wildcard and comma-separated values.
 */
export declare const parseIfMatchHeader: (header: string | null | undefined) => string[];
/**
 * Assert that an If-Match header is present and satisfies the current ETag.
 *
 * CMS writes MUST include an If-Match header. If the provided ETag(s)
 * do not match the current row's ETag, a 412 (Precondition Failed) is thrown.
 *
 * @throws CmsValidationError if If-Match header is missing
 * @throws CmsPreconditionFailedError if ETag does not match
 */
export declare const assertIfMatchSatisfied: (input: {
    ifMatchHeader: string | null | undefined;
    currentEtag: string | null | undefined;
}) => void;
/**
 * Compute a deterministic CMS ETag.
 * Format: `cms:{uid}:v{version}`
 */
export declare const computeCmsEtag: (uid: string, version: number) => string;
//# sourceMappingURL=concurrency.d.ts.map