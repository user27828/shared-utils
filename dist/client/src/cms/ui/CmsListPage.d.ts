/**
 * CMS List Page — shared-utils
 *
 * Reusable tabbed list page (All/Draft/Published/Trash) with search,
 * bulk operations, and status-colored chips.
 *
 * The host app mounts this as a route component and provides the
 * CmsAdminUiConfig for API, navigation, and toast integration.
 */
import React from "react";
import type { CmsAdminUiConfig } from "./CmsAdminUiConfig.js";
type CmsTabKey = "all" | "draft" | "published" | "trash";
export interface CmsListPageProps {
    config?: CmsAdminUiConfig;
    /** Current active tab (controlled). Default: "all". */
    activeTab?: CmsTabKey;
    /** Called when the tab changes. */
    onTabChange?: (tab: CmsTabKey) => void;
    /** Current search query (controlled). */
    searchQuery?: string;
    /** Called when search query changes. */
    onSearchChange?: (q: string) => void;
}
declare const CmsListPage: React.FC<CmsListPageProps>;
export default CmsListPage;
//# sourceMappingURL=CmsListPage.d.ts.map