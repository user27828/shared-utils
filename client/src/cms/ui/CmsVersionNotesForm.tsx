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
import React, { useCallback, useState, useEffect } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";

// ─── Props ────────────────────────────────────────────────────────────────

export interface CmsVersionNotesFormProps {
  /** Initial version label. */
  initialVersion?: string;
  /** Initial notes text. */
  initialNotes?: string;
  /** Called when the user saves. At least one field will be non-empty. */
  onSave: (data: { version: string; notes: string }) => void;
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

// ─── Component ────────────────────────────────────────────────────────────

const CmsVersionNotesForm: React.FC<CmsVersionNotesFormProps> = ({
  initialVersion = "",
  initialNotes = "",
  onSave,
  onCancel,
  isSaving = false,
  disabled = false,
  saveLabel = "Save",
  title,
}) => {
  const [version, setVersion] = useState(initialVersion);
  const [notes, setNotes] = useState(initialNotes);

  // Sync with external initial values (e.g., when switching revisions)
  useEffect(() => {
    setVersion(initialVersion);
  }, [initialVersion]);
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const hasContent = version.trim().length > 0 || notes.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!hasContent) {
      return;
    }
    onSave({ version: version.trim(), notes: notes.trim() });
  }, [hasContent, onSave, version, notes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && hasContent) {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave, hasContent],
  );

  return (
    <Box onKeyDown={handleKeyDown}>
      {title && (
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          {title}
        </Typography>
      )}
      <Stack spacing={2}>
        <TextField
          label="Version"
          placeholder='e.g. "Summer Sale", "Contact update"'
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          size="small"
          fullWidth
          disabled={disabled || isSaving}
          inputProps={{ maxLength: 256 }}
          helperText="A short human-readable label for this version"
        />
        <TextField
          label="Notes"
          placeholder="Optional longer description or context..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          maxRows={6}
          disabled={disabled || isSaving}
          inputProps={{ maxLength: 4096 }}
        />
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {onCancel && (
            <Button
              onClick={onCancel}
              disabled={isSaving}
              color="inherit"
              size="small"
            >
              Cancel
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!hasContent || isSaving || disabled}
          >
            {isSaving ? "Saving..." : saveLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default CmsVersionNotesForm;
