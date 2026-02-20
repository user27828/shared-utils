/**
 * CMS History Drawer — shared-utils
 *
 * Flex-based persistent sidebar for browsing, loading, and restoring
 * CMS revision history. Sits alongside the edit page content within a
 * flex container — no viewport-level position:fixed.
 *
 * Features:
 *  - DateCalendar with dot badges on dates that have revisions
 *  - Quick-nav buttons (First / Yesterday / Today)
 *  - MUI Lab Timeline with colour-coded dots
 *  - Load (preview) vs Restore (server write) per revision
 *  - Soft-deleted revision visibility toggle
 *  - Scroll-to-date with flash highlight animation
 *  - Lazy mount: heavy content only renders after first open
 *  - Light / dark mode aware via MUI theme
 */
import React from "react";
import type { CmsHistoryRow } from "../../../../utils/src/cms/types.js";
import type { CmsVersionMeta } from "../../../../utils/src/cms/types.js";
/** Drawer width in pixels. Exported so the parent can coordinate layout. */
export declare const HISTORY_DRAWER_WIDTH = 340;
export interface CmsHistoryDrawerProps {
    /** Whether the drawer panel is expanded. */
    open: boolean;
    /** Called when the user clicks the close button. */
    onClose: () => void;
    /** Complete history array (may include soft-deleted rows). */
    history: CmsHistoryRow[];
    /** ID of the revision currently loaded for preview, or null. */
    loadedRevisionId: number | null;
    /** Whether the editor form has unsaved changes. */
    isDirty: boolean;
    /** Whether a save / restore operation is in progress. */
    isSaving: boolean;
    /** Whether soft-deleted revisions should be visible. */
    includeSoftDeleted: boolean;
    /** Toggle for the soft-deleted visibility. */
    onIncludeSoftDeletedChange: (value: boolean) => void;
    /** Preview a revision in the form without writing to the server. */
    onLoadRevision: (historyId: number) => void;
    /** Restore a revision on the server (creates a new version). */
    onRestoreRevision: (historyId: number) => void;
    /** Soft-delete a revision. */
    onSoftDeleteRevision: (historyId: number) => void;
    /** Permanently delete a revision. */
    onHardDeleteRevision: (historyId: number) => void;
    /** Dismiss the loaded revision and return to the live version. */
    onDismissRevision: () => void;
    /** Head version number (shown in the "(Current)" entry). */
    currentVersionNumber?: number;
    /** Head `updated_at` ISO string. */
    currentUpdatedAt?: string;
    /** Called to update version metadata on a history revision. */
    onUpdateHistoryMeta?: (historyId: number, data: {
        version: string;
        notes: string;
    }) => Promise<void>;
    /** Current head version metadata (for the "(Current)" entry label). */
    currentVersionMeta?: CmsVersionMeta | null;
}
declare const CmsHistoryDrawer: React.FC<CmsHistoryDrawerProps>;
export default CmsHistoryDrawer;
//# sourceMappingURL=CmsHistoryDrawer.d.ts.map