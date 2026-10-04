/** Dependency-free CMS values shared by schemas and consumers. */
export const CMS_POST_TYPES = [
  "post",
  "page",
  "general",
  "faq",
  "blog",
  "embed",
  "data",
  "docs",
  "kb",
  "other",
] as const;

export const CMS_STATUS = ["draft", "published", "trash"] as const;

export const CMS_CONTENT_TYPES = [
  "text/html",
  "text/markdown",
  "application/json",
  "text/plain",
] as const;
