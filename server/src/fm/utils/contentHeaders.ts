import type { Response } from "express";

const DANGEROUS_INLINE_MIME_RE =
  /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/xml|application\/xml)/i;

export const isDangerousInlineMimeType = (
  contentType?: string | null,
): boolean => {
  if (!contentType) {
    return false;
  }
  return DANGEROUS_INLINE_MIME_RE.test(contentType);
};

export const buildAttachmentContentDisposition = (filename: string): string => {
  return `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

export const applyFmContentHeaders = (input: {
  res: Response;
  cacheControl: string;
  contentType?: string;
  sha256?: string | null;
  filename: string;
  download?: boolean;
}): void => {
  const { res, cacheControl, contentType, sha256, filename, download } = input;

  res.setHeader("Cache-Control", cacheControl);
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (contentType) {
    res.type(contentType);
  }

  if (sha256) {
    res.setHeader("ETag", `"${sha256}"`);
  }

  if (download || isDangerousInlineMimeType(contentType)) {
    res.setHeader(
      "Content-Disposition",
      buildAttachmentContentDisposition(filename),
    );
    return;
  }

  res.removeHeader("Content-Disposition");
};
