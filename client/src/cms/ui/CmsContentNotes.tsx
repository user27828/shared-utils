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
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import type { CmsContentNote } from "../../../../utils/src/cms/types.js";

// ─── Constants ────────────────────────────────────────────────────────────

/** Maximum notes shown inline before "View all" link. */
const INLINE_LIMIT = 3;

// ─── Props ────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────

const formatNoteDate = (iso: string): string => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
};

// ─── NoteItem sub-component ───────────────────────────────────────────────

interface NoteItemProps {
  note: CmsContentNote;
  index: number;
  onRemove?: (index: number) => void;
  compact?: boolean;
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  index,
  onRemove,
  compact = false,
}) => (
  <Box
    sx={{
      py: compact ? 0.5 : 0.75,
      px: 1,
      borderRadius: 1,
      bgcolor: "action.hover",
      "&:hover .note-delete": { opacity: 1 },
    }}
  >
    <Stack direction="row" alignItems="flex-start" spacing={0.5}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: compact ? "0.8rem" : "0.85rem",
          }}
        >
          {note.note}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="baseline">
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontSize: "0.7rem" }}
          >
            {formatNoteDate(note.dt_updated)}
          </Typography>
          {(note as any).user_email && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontSize: "0.7rem" }}
              noWrap
            >
              — {(note as any).user_email}
            </Typography>
          )}
        </Stack>
      </Box>
      {onRemove && (
        <Tooltip title="Remove note">
          <IconButton
            className="note-delete"
            size="small"
            onClick={() => onRemove(index)}
            sx={{
              opacity: 0,
              transition: "opacity 150ms",
              mt: -0.5,
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: "0.9rem" }} />
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  </Box>
);

// ─── Component ────────────────────────────────────────────────────────────

const CmsContentNotes: React.FC<CmsContentNotesProps> = ({
  notes,
  onAddNote,
  onRemoveNote,
  disabled = false,
}) => {
  const [input, setInput] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  /** Notes sorted ascending by date (oldest first). */
  const sorted = useMemo(
    () =>
      [...notes].sort(
        (a, b) =>
          new Date(a.dt_updated).getTime() - new Date(b.dt_updated).getTime(),
      ),
    [notes],
  );

  /** Last N notes for inline display. */
  const inlineNotes = useMemo(() => sorted.slice(-INLINE_LIMIT), [sorted]);

  const hasMore = sorted.length > INLINE_LIMIT;

  const handleAdd = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    onAddNote(trimmed);
    setInput("");
    // Re-focus the input for rapid entry
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [input, onAddNote]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd],
  );

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        Notes
      </Typography>

      {/* Existing notes (last N ascending) */}
      {inlineNotes.length > 0 && (
        <Stack spacing={0.5} sx={{ mb: 1 }}>
          {inlineNotes.map((note, idx) => {
            // Compute real index in the full sorted array
            const realIdx = sorted.length - INLINE_LIMIT + idx;
            const actualIdx = realIdx < 0 ? idx : realIdx;
            return (
              <NoteItem
                key={`${note.dt_updated}-${idx}`}
                note={note}
                index={actualIdx}
                onRemove={onRemoveNote}
                compact
              />
            );
          })}
        </Stack>
      )}

      {/* "View all" link */}
      {hasMore && (
        <Link
          component="button"
          variant="caption"
          onClick={() => setDialogOpen(true)}
          sx={{ mb: 1, display: "block" }}
        >
          View all {sorted.length} notes...
        </Link>
      )}

      {/* Add note input */}
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          inputRef={inputRef}
          placeholder="Add a note..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          size="small"
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          disabled={disabled}
          inputProps={{ maxLength: 4096 }}
        />
        <Tooltip title="Save note (Ctrl+Enter)">
          <span>
            <IconButton
              color="primary"
              onClick={handleAdd}
              disabled={disabled || !input.trim()}
              aria-label="Save note"
              sx={{ mt: 0.25 }}
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      {/* View-all dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>All Notes ({sorted.length})</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            {sorted.map((note, idx) => (
              <React.Fragment key={`${note.dt_updated}-${idx}`}>
                <NoteItem note={note} index={idx} onRemove={onRemoveNote} />
                {idx < sorted.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            {sorted.length === 0 && (
              <Typography color="text.secondary" variant="body2">
                No notes yet.
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CmsContentNotes;
