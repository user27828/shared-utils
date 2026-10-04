import { describe, expect, it } from "@jest/globals";
import {
  CMS_POST_TYPES,
  CMS_STATUS,
  CMS_CONTENT_TYPES,
} from "../src/cms/constants.js";
import {
  CmsPostTypeSchema,
  CmsStatusSchema,
  CmsContentTypeSchema,
} from "../src/cms/types.js";
import {
  FM_PURPOSES,
  FM_VISIBILITY,
  FM_VARIANT_KINDS,
} from "../src/fm/constants.js";
import {
  FmPurposeSchema,
  FmVisibilitySchema,
  FmVariantKindSchema,
} from "../src/fm/types.js";

describe("Shared domain constants and schema enums", () => {
  it.each([
    ["CMS post types", CMS_POST_TYPES, CmsPostTypeSchema],
    ["CMS status", CMS_STATUS, CmsStatusSchema],
    ["CMS content types", CMS_CONTENT_TYPES, CmsContentTypeSchema],
    ["FM purposes", FM_PURPOSES, FmPurposeSchema],
    ["FM visibility", FM_VISIBILITY, FmVisibilitySchema],
    ["FM variants", FM_VARIANT_KINDS, FmVariantKindSchema],
  ] as const)(
    "%s preserve accepted values and reject invalid input",
    (_name, values, schema) => {
      expect(schema.options).toEqual(values);
      for (const value of values) {
        expect(schema.parse(value)).toBe(value);
      }
      for (const invalid of ["invalid", "", null, 1]) {
        expect(schema.safeParse(invalid).success).toBe(false);
      }
    },
  );
});
