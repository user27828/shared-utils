/**
 * Express parameter helpers — shared-utils
 *
 * Express v5 types model route params as `string | string[]`.
 * For this codebase, all route params are expected to be single values.
 */

export type ExpressParamValue = string | string[] | undefined;

export const getSingleParam = (value: ExpressParamValue): string | null => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 1 && typeof value[0] === "string") {
      return value[0];
    }
    return null;
  }
  return null;
};
