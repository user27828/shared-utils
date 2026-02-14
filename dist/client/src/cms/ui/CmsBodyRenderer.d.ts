/**
 * CMS Body Renderer — shared-utils
 *
 * Renders CMS content based on its content_type.
 * Supports: text/html, text/markdown, application/json, text/plain.
 */
import React from "react";
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
export declare const renderCmsBody: (payload: CmsPublicPayload) => React.ReactNode;
/**
 * React component wrapper around `renderCmsBody`.
 */
declare const CmsBodyRenderer: React.FC<CmsBodyRendererProps>;
export default CmsBodyRenderer;
//# sourceMappingURL=CmsBodyRenderer.d.ts.map