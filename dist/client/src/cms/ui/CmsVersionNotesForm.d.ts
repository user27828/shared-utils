/**
 * CmsVersionNotesForm — Shared form for version label + notes.
 *
 * Reused by:
 *  - CmsEditPage "Save Version" split-button drawer
 *  - CmsHistoryDrawer per-revision edit dialog
 *
 * At least one of the two fields (version or notes) must be non-empty
 * before the save action is enabled.
 *
 * @module @user27828/shared-utils/client
 */
import React from "react";
export interface CmsVersionNotesFormProps {
    /** Initial version label. */
    initialVersion?: string;
    /** Initial notes text. */
    initialNotes?: string;
    /** Called when the user saves. At least one field will be non-empty. */
    onSave: (data: {
        version: string;
        notes: string;
    }) => void;
    /** Optional cancel action (e.g., close drawer). */
    onCancel?: () => void;
    /** Whether a save operation is in progress. */
    isSaving?: boolean;
    /** If true, disables all interaction. */
    disabled?: boolean;
    /** Label for the save button. Defaults to "Save". */
    saveLabel?: string;
    /** Optional title above the form. */
    title?: string;
}
declare const CmsVersionNotesForm: React.FC<CmsVersionNotesFormProps>;
export default CmsVersionNotesForm;
//# sourceMappingURL=CmsVersionNotesForm.d.ts.map