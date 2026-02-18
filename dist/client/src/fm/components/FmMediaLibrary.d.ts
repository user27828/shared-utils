/**
 * FmMediaLibrary — Full-featured media library UI component.
 *
 * Moved from @user27828/db-supabase to @user27828/shared-utils as part
 * of the FM split. All API calls go through the `FmApi` interface,
 * which can be provided via:
 *   1. `api` prop (explicit DI)
 *   2. `<FmClientProvider>` context
 *   3. Module-level default `FmClient()` fallback
 *
 * @module @user27828/shared-utils/fm/client
 */
import React from "react";
import type { FmFileRow, FmFileVariantRow } from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
/** Props for the {@link FmMediaLibrary} component. */
export interface FmMediaLibraryProps {
    /** Optional initial search string. */
    initialSearch?: string;
    /** If true, show archived items. */
    includeArchived?: boolean;
    /** Page size; defaults to 25. */
    pageSize?: number;
    /**
     * Called when a file is selected. The optional `variant` is provided when
     * the user picks a specific size variant instead of the original.
     */
    onSelect?: (file: FmFileRow, variant?: FmFileVariantRow) => void;
    /** Optional externally-controlled selected UID. */
    selectedFileUid?: string | null;
    /** If true, allow multi-select + bulk actions. Defaults to true when onSelect is not provided. */
    enableBulkActions?: boolean;
    /** If true, show upload UI. Defaults to true. */
    enableUpload?: boolean;
    /**
     * FmApi instance for all server communication.
     * Falls back to FmClientProvider context, then to a default FmClient().
     */
    api?: FmApi;
}
/**
 * Full-featured media library UI component.
 *
 * Supports file listing, search, upload with variant generation,
 * metadata editing, archiving, deletion, and multi-select bulk actions.
 */
export declare const FmMediaLibrary: React.FC<FmMediaLibraryProps>;
export default FmMediaLibrary;
//# sourceMappingURL=FmMediaLibrary.d.ts.map