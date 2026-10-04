/** Dependency-free FM values shared by schemas and consumers. */
export const FM_PURPOSES = [
  "resume",
  "job",
  "cms_asset",
  "cms_b64",
  "avatar",
  "generic",
] as const;

export const FM_VISIBILITY = ["private", "public"] as const;

export const FM_VARIANT_KINDS = [
  "original",
  "thumb",
  "preview",
  "web",
] as const;
