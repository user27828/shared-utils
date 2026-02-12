/**
 * CMS Conflict Dialog — shared-utils
 *
 * ETag 412 resolution dialog: reload, overwrite, or keep editing.
 * Portable — depends only on MUI and React.
 */
import React from "react";
export interface CmsConflictDialogProps {
    open: boolean;
    title?: string;
    description?: string;
    onCancel: () => void;
    onReload: () => void;
    onOverwrite: () => void;
}
declare const CmsConflictDialog: React.FC<CmsConflictDialogProps>;
export default CmsConflictDialog;
//# sourceMappingURL=CmsConflictDialog.d.ts.map