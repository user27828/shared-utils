/**
 * CMS Edit Page — shared-utils
 *
 * Portable, two-column edit page with:
 *  - Left: history drawer + metadata form + body editor + advanced options
 *  - Right: status panel + media/SEO panel
 *
 * Uses CmsApi interface (via CmsAdminUiConfig) and injectable
 * adapters for navigation, toasts, and media picker.
 */
import React from "react";
import type { CmsAdminUiConfig } from "./CmsAdminUiConfig.js";
export interface CmsEditPageProps {
    /** CMS item UID to edit, or undefined/null for a new item. */
    uid?: string | null;
    /** Full admin UI configuration. */
    config?: CmsAdminUiConfig;
    /** Default post type for new items. */
    defaultPostType?: string;
    /** Default locale for new items. */
    defaultLocale?: string;
}
declare const CmsEditPage: React.FC<CmsEditPageProps>;
export default CmsEditPage;
//# sourceMappingURL=CmsEditPage.d.ts.map