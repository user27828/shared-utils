/**
 * FmFilePicker — Thin Dialog wrapper around FmMediaLibrary.
 *
 * Opens the full media library in a dialog so callers can pick a file.
 *
 * @module @user27828/shared-utils/fm/client
 */
import React from "react";
import type { FmFileRow, FmFileVariantRow } from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
/** Props for the {@link FmFilePicker} dialog. */
export interface FmFilePickerProps {
    /** Whether the dialog is open. */
    open: boolean;
    /** Called when the dialog should close (backdrop click, Esc, or close button). */
    onClose: () => void;
    /** Called when the user selects a file (or a specific size variant). Dialog is NOT auto-closed afterwards. */
    onSelect: (file: FmFileRow, variant?: FmFileVariantRow) => void;
    /** Dialog title. Defaults to "Select file". */
    title?: string;
    /** Optional FmApi instance (forwarded to FmMediaLibrary). */
    api?: FmApi;
}
/** Dialog wrapper around {@link FmMediaLibrary} for file selection. */
export declare const FmFilePicker: React.FC<FmFilePickerProps>;
export default FmFilePicker;
//# sourceMappingURL=FmFilePicker.d.ts.map