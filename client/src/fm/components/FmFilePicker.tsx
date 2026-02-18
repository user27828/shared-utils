/**
 * FmFilePicker — Thin Dialog wrapper around FmMediaLibrary.
 *
 * Opens the full media library in a dialog so callers can pick a file.
 *
 * @module @user27828/shared-utils/fm/client
 */
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import type {
  FmFileRow,
  FmFileVariantRow,
} from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
import { FmMediaLibrary } from "./FmMediaLibrary.js";

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
export const FmFilePicker: React.FC<FmFilePickerProps> = ({
  open,
  onClose,
  onSelect,
  title = "Select file",
  api,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: "min(85vh, 900px)" } }}
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center">
          <Typography fontWeight={800} sx={{ flex: 1 }}>
            {title}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ overflow: "auto" }}>
        <FmMediaLibrary onSelect={onSelect} api={api} />
      </DialogContent>
    </Dialog>
  );
};

export default FmFilePicker;
