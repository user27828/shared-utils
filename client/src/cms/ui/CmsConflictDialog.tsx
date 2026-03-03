/**
 * CMS Conflict Dialog — shared-utils
 *
 * ETag 412 resolution dialog: reload, overwrite, or keep editing.
 * Portable — depends only on MUI and React.
 */
import React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

export interface CmsConflictDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onCancel: () => void;
  onReload: () => void;
  onOverwrite: () => void;
}

const CmsConflictDialog: React.FC<CmsConflictDialogProps> = ({
  open,
  title = "Update conflict",
  description = "This content was updated elsewhere while you were editing. You can reload the latest version or overwrite it with your changes.",
  onCancel,
  onReload,
  onOverwrite,
}) => {
  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography>{description}</Typography>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            Tip: If you overwrite, you may clobber someone else&apos;s recent
            edits.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Keep editing</Button>
        <Button variant="outlined" onClick={onReload}>
          Reload latest
        </Button>
        <Button color="warning" variant="contained" onClick={onOverwrite}>
          Overwrite with my changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CmsConflictDialog;
