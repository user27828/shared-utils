/**
 * CmsContentNotes — Persistent content notes (not tied to revisions).
 *
 * Displays existing notes in ascending chronological order (limit 3)
 * with a "View all" link for the full list in a dialog. An auto-growing
 * textarea with a save button adds new notes.
 *
 * Similar pattern to TagsInput for add/display UX.
 *
 * @module @user27828/shared-utils/client
 */
import React from "react";
import type { CmsContentNote } from "../../../../utils/src/cms/types.js";
export interface CmsContentNotesProps {
    /** Existing content notes array (from metadata.notes). */
    notes: CmsContentNote[];
    /** Called when the user adds a new note. */
    onAddNote: (note: string) => void;
    /** Called to remove a note by index. If omitted, delete is hidden. */
    onRemoveNote?: (index: number) => void;
    /** Whether interactions are disabled (e.g., during save). */
    disabled?: boolean;
}
declare const CmsContentNotes: React.FC<CmsContentNotesProps>;
export default CmsContentNotes;
//# sourceMappingURL=CmsContentNotes.d.ts.map