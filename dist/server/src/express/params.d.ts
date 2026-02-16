/**
 * Express parameter helpers — shared-utils
 *
 * Express v5 types model route params as `string | string[]`.
 * For this codebase, all route params are expected to be single values.
 */
export type ExpressParamValue = string | string[] | undefined;
export declare const getSingleParam: (value: ExpressParamValue) => string | null;
//# sourceMappingURL=params.d.ts.map