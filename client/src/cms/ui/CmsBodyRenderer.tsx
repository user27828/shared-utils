/**
 * CMS Body Renderer — shared-utils
 *
 * Renders CMS content based on its content_type.
 * Supports: text/html, text/markdown, application/json, text/plain.
 */
import React from "react";
import { Box, Typography } from "@mui/material";
import type { CmsPublicPayload } from "../../../../utils/src/cms/types.js";

export interface CmsBodyRendererProps {
  /** The CMS payload whose body should be rendered. */
  payload: CmsPublicPayload;
  /** Optional sx overrides for the outermost wrapper. */
  sx?: Record<string, unknown>;
}

/**
 * Pure function that returns a React node for the given CMS payload,
 * dispatching on `content_type`.
 */
export const renderCmsBody = (payload: CmsPublicPayload): React.ReactNode => {
  const contentType = String(payload.content_type || "");

  if (contentType === "text/html") {
    const html = String(payload.sanitized_html || "");
    return <Box dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (contentType === "text/markdown") {
    const html = String(payload.markdown_html || "");
    return <Box dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (contentType === "application/json") {
    return (
      <Box component="pre" sx={{ overflowX: "auto", m: 0 }}>
        {JSON.stringify(payload.json, null, 2)}
      </Box>
    );
  }

  // Default: plain text
  const text = String(payload.text || "");
  return <Typography sx={{ whiteSpace: "pre-wrap" }}>{text}</Typography>;
};

/**
 * React component wrapper around `renderCmsBody`.
 */
const CmsBodyRenderer: React.FC<CmsBodyRendererProps> = ({ payload, sx }) => {
  return <Box sx={sx}>{renderCmsBody(payload)}</Box>;
};

export default CmsBodyRenderer;
