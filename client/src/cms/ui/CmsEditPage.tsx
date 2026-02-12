/**
 * CMS Edit Page — shared-utils
 *
 * Portable, two-column edit page with:
 *  - Left: metadata form + body editor + advanced options accordion
 *  - Right: status panel + media/SEO panel + history panel
 *
 * Uses CmsApi interface (via CmsAdminUiConfig) and injectable
 * adapters for navigation, toasts, and media picker.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";

import type {
  CmsHeadRow,
  CmsHistoryRow,
} from "../../../../utils/src/cms/types.js";
import { CmsClient } from "../CmsClient.js";
import type { CmsApi } from "../CmsApi.js";
import type {
  CmsAdminUiConfig,
  CmsMediaPickerProps,
} from "./CmsAdminUiConfig.js";
import { defaultToast } from "./CmsAdminUiConfig.js";
import CmsConflictDialog from "./CmsConflictDialog.js";
import CmsBodyEditor, {
  type CmsEditorContentType,
  contentTypeToMime,
  mimeToContentType,
} from "./CmsBodyEditor.js";

// ─── Helpers ──────────────────────────────────────────────────────────────

const safeJsonParse = (input: string): { value: any; error: string | null } => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: {}, error: null };
  }
  try {
    return { value: JSON.parse(trimmed), error: null };
  } catch (err: any) {
    return { value: null, error: err?.message || "Invalid JSON" };
  }
};

const slugify = (str: string): string =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const isPreconditionFailed = (err: any): boolean =>
  err?.statusCode === 412 || err?.status === 412;

const getStatusChipColor = (
  s: string,
): "success" | "warning" | "error" | "default" => {
  switch (s) {
    case "published":
      return "success";
    case "draft":
      return "warning";
    case "trash":
      return "error";
    default:
      return "default";
  }
};

// ─── Types ────────────────────────────────────────────────────────────────

type ConflictKind =
  | "save"
  | "publish"
  | "trash"
  | "restore"
  | "restoreRevision";

interface ConflictCtx {
  kind: ConflictKind;
  uid: string;
  localPatch?: Record<string, any>;
  historyId?: number;
}

export interface CmsEditPageProps {
  /** CMS item UID to edit, or undefined/null for a new item. */
  uid?: string | null;
  /** Full admin UI configuration. */
  config?: CmsAdminUiConfig;
  /** Default post type for new items. */
  defaultPostType?: string;
  /** Default locale for new items. */
  defaultLocale?: string;
}

const defaultApi = new CmsClient();

// ─── Component ────────────────────────────────────────────────────────────

const CmsEditPage: React.FC<CmsEditPageProps> = ({
  uid: propUid,
  config,
  defaultPostType = "page",
  defaultLocale = "en",
}) => {
  const api: CmsApi = config?.api ?? defaultApi;
  const toast = config?.toast ?? defaultToast;
  const nav = config?.navigation;
  const localeOptions = useMemo(
    () => config?.localeOptions ?? [{ label: "English", value: "en" }],
    [config?.localeOptions],
  );

  const isNew = !propUid;

  // ── Data state ────────────────────────────────────────────────────────
  const [row, setRow] = useState<CmsHeadRow | null>(null);
  const [history, setHistory] = useState<CmsHistoryRow[]>([]);

  // ── Form state ────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [locale, setLocale] = useState(defaultLocale);
  const [postType, setPostType] = useState(defaultPostType);
  const [contentType, setContentType] = useState<CmsEditorContentType>("html");
  const [content, setContent] = useState("<p></p>");
  const [tagsCsv, setTagsCsv] = useState("");
  const [optionsJson, setOptionsJson] = useState("{}");
  const [password, setPassword] = useState("");
  const [includeSoftDeletedHistory, setIncludeSoftDeletedHistory] =
    useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "text">("visual");

  // ── UI state ──────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [liveErrorMessage, setLiveErrorMessage] = useState("");

  // ── Refs ──────────────────────────────────────────────────────────────
  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const conflictRef = useRef<ConflictCtx | null>(null);
  const pickerResolveRef = useRef<
    ((file: { uid: string } | null) => void) | null
  >(null);

  // ── Derived ───────────────────────────────────────────────────────────
  const etag = (row as any)?.etag as string | undefined;
  const status = (row as any)?.status as string | undefined;
  const lockedBy = (row as any)?.locked_by as string | undefined;

  const optionsParse = useMemo(() => safeJsonParse(optionsJson), [optionsJson]);

  const canPreview = useMemo(
    () =>
      !isNew &&
      status === "published" &&
      !!postType &&
      !!locale &&
      !!slug &&
      !!config?.getContentUrl,
    [isNew, status, postType, locale, slug, config?.getContentUrl],
  );

  const postTypeOpts = useMemo(
    () =>
      config?.postTypeOptions ?? [
        { value: "page", label: "Page" },
        { value: "post", label: "Post" },
      ],
    [config?.postTypeOptions],
  );

  const hasVisualMode = contentType === "html" || contentType === "markdown";
  const effectiveContentType: CmsEditorContentType =
    hasVisualMode && editorMode === "text" ? "text" : contentType;

  // Reset to visual mode when content type changes
  useEffect(() => {
    setEditorMode("visual");
  }, [contentType]);

  // ── ARIA helpers ──────────────────────────────────────────────────────
  const announce = useCallback((msg: string) => {
    setLiveMessage(msg);
    setTimeout(() => setLiveMessage(""), 4000);
  }, []);

  const announceErr = useCallback((msg: string) => {
    setLiveErrorMessage(msg);
    setTimeout(() => setLiveErrorMessage(""), 6000);
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (isNew) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const item = await api.adminGet(propUid!);
      setRow(item);
      setTitle(item.title || "");
      setSlug(item.slug || "");
      setLocale(item.locale || defaultLocale);
      setPostType(item.post_type || defaultPostType);
      setContentType(
        mimeToContentType(
          item.content_type || "text/html",
        ) as CmsEditorContentType,
      );
      setContent(item.content || "<p></p>");
      setTagsCsv(
        Array.isArray((item as any).tags) ? (item as any).tags.join(", ") : "",
      );
      setOptionsJson(
        (item as any).options
          ? JSON.stringify((item as any).options, null, 2)
          : "{}",
      );
      setPassword("");

      // Load history
      try {
        const hist = await api.adminListHistory(propUid!, {
          limit: 50,
        });
        setHistory(hist.items ?? hist ?? []);
      } catch {
        /* non-critical */
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load CMS item");
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    propUid,
    isNew,
    defaultLocale,
    defaultPostType,
    includeSoftDeletedHistory,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Focus error alert ─────────────────────────────────────────────────
  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);

  // ── Build patch ───────────────────────────────────────────────────────
  const buildPatch = useCallback(() => {
    const patch: Record<string, any> = {
      title,
      slug,
      locale,
      post_type: postType,
      content_type: contentTypeToMime(contentType),
      content,
      tags: tagsCsv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      options: optionsParse.value ?? {},
    };
    if (password) {
      patch.password = password;
    }
    return patch;
  }, [
    title,
    slug,
    locale,
    postType,
    contentType,
    content,
    tagsCsv,
    optionsParse.value,
    password,
  ]);

  // ── Conflict handling ─────────────────────────────────────────────────
  const openConflict = (ctx: ConflictCtx) => {
    conflictRef.current = ctx;
    setConflictOpen(true);
  };

  const handleConflictOverwrite = async () => {
    const ctx = conflictRef.current;
    if (!ctx) {
      return;
    }
    setConflictOpen(false);
    setIsSaving(true);

    try {
      // Re-fetch to get the latest etag
      const latest = await api.adminGet(ctx.uid);
      const latestEtag = (latest as any)?.etag || "*";

      switch (ctx.kind) {
        case "save":
          await api.adminUpdate({
            uid: ctx.uid,
            patch: (ctx.localPatch || buildPatch()) as any,
            ifMatch: latestEtag,
          });
          break;
        case "publish":
          await api.adminPublish({
            uid: ctx.uid,
            ifMatch: latestEtag,
          });
          break;
        case "trash":
          await api.adminTrash({ uid: ctx.uid, ifMatch: latestEtag });
          break;
        case "restore":
          await api.adminRestore({ uid: ctx.uid, ifMatch: latestEtag });
          break;
        case "restoreRevision":
          if (ctx.historyId) {
            await api.adminRestoreHistory({
              uid: ctx.uid,
              historyId: ctx.historyId,
              ifMatch: latestEtag,
            });
          }
          break;
      }

      toast.info("Saved (overwrote latest version)");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Overwrite failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (optionsParse.error) {
      setError(`Invalid JSON in options: ${optionsParse.error}`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isNew) {
        const created = await api.adminCreate(buildPatch() as any);
        toast.success("Created successfully");
        announce("Item created");
        nav?.goToEdit?.((created as any).uid);
      } else {
        await api.adminUpdate({
          uid: propUid!,
          patch: buildPatch() as any,
          ifMatch: etag || "*",
        });
        toast.success("Saved");
        announce("Saved");
        await load();
      }
    } catch (err: any) {
      if (!isNew && isPreconditionFailed(err)) {
        openConflict({
          kind: "save",
          uid: propUid!,
          localPatch: buildPatch(),
        });
        return;
      }
      const msg = err?.message || "Save failed";
      setError(msg);
      toast.error(msg);
      announceErr(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Publish ───────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (isNew) {
      return;
    }
    setIsSaving(true);
    try {
      await api.adminPublish({ uid: propUid!, ifMatch: etag || "*" });
      toast.success("Published");
      announce("Published");
      await load();
    } catch (err: any) {
      if (isPreconditionFailed(err)) {
        openConflict({ kind: "publish", uid: propUid! });
        return;
      }
      toast.error(err?.message || "Publish failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Trash ─────────────────────────────────────────────────────────────
  const handleTrash = async () => {
    if (isNew) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.adminTrash({
        uid: propUid!,
        ifMatch: etag || "*",
      });
      setRow(updated as CmsHeadRow);
      toast.success("Moved to trash");
      announce("Moved to trash");
    } catch (err: any) {
      if (isPreconditionFailed(err)) {
        openConflict({ kind: "trash", uid: propUid! });
        return;
      }
      toast.error(err?.message || "Trash failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Restore ───────────────────────────────────────────────────────────
  const handleRestore = async () => {
    if (isNew) {
      return;
    }
    setIsSaving(true);
    try {
      const updated = await api.adminRestore({
        uid: propUid!,
        ifMatch: etag || "*",
      });
      setRow(updated as CmsHeadRow);
      toast.success("Restored from trash");
      announce("Restored");
    } catch (err: any) {
      if (isPreconditionFailed(err)) {
        openConflict({ kind: "restore", uid: propUid! });
        return;
      }
      toast.error(err?.message || "Restore failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete permanently ────────────────────────────────────────────────
  const handleDeletePermanently = async () => {
    if (isNew) {
      return;
    }
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Permanently delete this item? This cannot be undone.")) {
      return;
    }
    setIsSaving(true);
    try {
      await api.adminDeletePermanently(propUid!);
      toast.success("Deleted permanently");
      nav?.goToList?.();
    } catch (err: any) {
      toast.error(err?.message || "Delete failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Lock / Unlock ─────────────────────────────────────────────────────
  const handleLock = async () => {
    if (isNew) {
      return;
    }
    try {
      await api.adminLock(propUid!);
      toast.success("Locked");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Lock failed");
    }
  };

  const handleUnlock = async () => {
    if (isNew) {
      return;
    }
    try {
      await api.adminUnlock(propUid!);
      toast.success("Unlocked");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Unlock failed");
    }
  };

  // ── History operations ────────────────────────────────────────────────
  const handleRestoreRevision = async (historyId: number) => {
    setIsSaving(true);
    try {
      await api.adminRestoreHistory({
        uid: propUid!,
        historyId,
        ifMatch: etag || "*",
      });
      toast.success("Revision restored");
      await load();
    } catch (err: any) {
      if (isPreconditionFailed(err)) {
        openConflict({
          kind: "restoreRevision",
          uid: propUid!,
          historyId,
        });
        return;
      }
      toast.error(err?.message || "Restore revision failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSoftDeleteRevision = async (historyId: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Soft-delete this revision?")) {
      return;
    }
    try {
      await api.adminSoftDeleteHistory({ uid: propUid!, historyId });
      toast.success("Revision soft-deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Soft-delete failed");
    }
  };

  const handleHardDeleteRevision = async (historyId: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Permanently delete this revision? This cannot be undone.")) {
      return;
    }
    try {
      await api.adminHardDeleteHistory({ uid: propUid!, historyId });
      toast.success("Revision permanently deleted");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Hard-delete failed");
    }
  };

  // ── Media picker (promise-based) ──────────────────────────────────────
  const openMediaPicker = (): Promise<{ uid: string } | null> => {
    return new Promise((resolve) => {
      pickerResolveRef.current = resolve;
      setPickerOpen(true);
    });
  };

  const handleMediaPickerSelect = (file: { uid: string } | null) => {
    setPickerOpen(false);
    pickerResolveRef.current?.(file);
    pickerResolveRef.current = null;
  };

  const handleMediaPickerClose = () => {
    setPickerOpen(false);
    pickerResolveRef.current?.(null);
    pickerResolveRef.current = null;
  };

  // ── Options JSON helpers ──────────────────────────────────────────────
  const updateOptionsJson = (mutator: (obj: Record<string, any>) => void) => {
    const parsed = safeJsonParse(optionsJson);
    if (parsed.error) {
      return;
    }
    const clone = JSON.parse(JSON.stringify(parsed.value ?? {}));
    mutator(clone);
    setOptionsJson(JSON.stringify(clone, null, 2));
  };

  // ── Featured image helpers ────────────────────────────────────────────
  const featuredImageUid = optionsParse.value?.featured_image_file_uid;
  const ogImageUid = optionsParse.value?.seo?.og_image_file_uid;
  const attachments: Array<{ file_uid: string }> =
    optionsParse.value?.attachments ?? [];

  const chooseFeaturedImage = async () => {
    const file = await openMediaPicker();
    if (file) {
      updateOptionsJson((o) => {
        o.featured_image_file_uid = file.uid;
      });
    }
  };

  const chooseOgImage = async () => {
    const file = await openMediaPicker();
    if (file) {
      updateOptionsJson((o) => {
        if (!o.seo) {
          o.seo = {};
        }
        o.seo.og_image_file_uid = file.uid;
      });
    }
  };

  const addAttachment = async () => {
    const file = await openMediaPicker();
    if (file) {
      updateOptionsJson((o) => {
        if (!o.attachments) {
          o.attachments = [];
        }
        o.attachments.push({ file_uid: file.uid });
      });
    }
  };

  const removeAttachment = (index: number) => {
    updateOptionsJson((o) => {
      if (Array.isArray(o.attachments)) {
        o.attachments.splice(index, 1);
      }
    });
  };

  // ── Auto-slug on title blur ───────────────────────────────────────────
  const handleTitleBlur = () => {
    if (isNew && !slug && title) {
      setSlug(slugify(title));
    }
  };

  // ── Preview URL ───────────────────────────────────────────────────────
  const previewUrl = useMemo(() => {
    if (!canPreview || !config?.getContentUrl) {
      return null;
    }
    return config.getContentUrl(slug);
  }, [canPreview, config, postType, locale, slug]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ARIA live regions */}
      <Box
        aria-live="polite"
        aria-atomic="true"
        sx={{ position: "absolute", left: -9999 }}
      >
        {liveMessage}
      </Box>
      <Box
        aria-live="assertive"
        aria-atomic="true"
        sx={{ position: "absolute", left: -9999 }}
      >
        {liveErrorMessage}
      </Box>

      <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
        {/* ═══ LEFT COLUMN ═══ */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Tooltip title="Back to list">
                <IconButton onClick={() => nav?.goToList?.()}>
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Typography variant="h5">
                {isNew ? "New CMS Item" : "Edit CMS Item"}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={1}>
              {canPreview && previewUrl && (
                <Button
                  size="small"
                  href={previewUrl}
                  target="_blank"
                  startIcon={<OpenInNewIcon />}
                >
                  Preview
                </Button>
              )}
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </Stack>
          </Stack>

          {/* Error */}
          {error && (
            <Alert
              ref={errorAlertRef}
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
              tabIndex={-1}
            >
              {error}
            </Alert>
          )}

          {/* Metadata form */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <TextField
              label="Title"
              fullWidth
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              sx={{ mb: 2 }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Tags (comma-separated)"
                value={tagsCsv}
                onChange={(e) => setTagsCsv(e.target.value)}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Password (optional)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isNew ? "" : "(unchanged)"}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Paper>

          {/* Editor panel with toolbar */}
          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            {/* Toolbar: Content type · Locale · Post type ·  Visual | Text */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="nowrap"
              gap={1.5}
              sx={{
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
                bgcolor: "action.hover",
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                gap={1.5}
                sx={{ minWidth: 0, flexShrink: 0 }}
              >
                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Content</InputLabel>
                  <Select
                    value={contentType}
                    label="Content"
                    onChange={(e) =>
                      setContentType(e.target.value as CmsEditorContentType)
                    }
                  >
                    <MenuItem value="html">HTML</MenuItem>
                    <MenuItem value="markdown">Markdown</MenuItem>
                    <MenuItem value="json">JSON</MenuItem>
                    <MenuItem value="text">Text</MenuItem>
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Locale</InputLabel>
                  <Select
                    value={locale}
                    label="Locale"
                    onChange={(e) => setLocale(e.target.value)}
                  >
                    {localeOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 110 }}>
                  <InputLabel>Post type</InputLabel>
                  <Select
                    value={postType}
                    label="Post type"
                    onChange={(e) => setPostType(e.target.value)}
                  >
                    {postTypeOpts.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              {hasVisualMode && (
                <Tabs
                  value={editorMode}
                  onChange={(_, v) => setEditorMode(v)}
                  sx={{
                    minHeight: 32,
                    "& .MuiTab-root": {
                      minHeight: 32,
                      py: 0.5,
                      px: 1.5,
                      fontSize: "0.8rem",
                      textTransform: "none",
                    },
                  }}
                >
                  <Tab label="Visual" value="visual" />
                  <Tab label="Text" value="text" />
                </Tabs>
              )}
            </Stack>

            {/* Editor body — key forces clean remount on mode toggle */}
            <CmsBodyEditor
              key={`body-${contentType}-${editorMode}`}
              contentType={effectiveContentType}
              value={content}
              onChange={setContent}
              editor={config?.editorPreference}
              onPickAsset={
                config?.renderMediaPicker ? () => openMediaPicker() : undefined
              }
            />
          </Paper>

          {/* Advanced options accordion */}
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Advanced Options (JSON)</Typography>
              {optionsParse.error && (
                <Chip
                  label="Invalid JSON"
                  size="small"
                  color="error"
                  sx={{ ml: 1 }}
                />
              )}
            </AccordionSummary>
            <AccordionDetails>
              <CmsBodyEditor
                contentType="json"
                value={optionsJson}
                onChange={setOptionsJson}
                height={260}
              />
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <Box sx={{ width: { xs: "100%", lg: 420 }, flexShrink: 0 }}>
          {/* Status panel */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Status
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {status && (
                <Chip
                  label={status}
                  size="small"
                  color={getStatusChipColor(status)}
                />
              )}
              {etag && <Chip label={etag} size="small" variant="outlined" />}
              {lockedBy && (
                <Chip
                  label={`Locked by ${lockedBy}`}
                  size="small"
                  icon={<LockIcon fontSize="small" />}
                  color="warning"
                />
              )}
            </Stack>

            <Divider sx={{ my: 1 }} />

            <Stack spacing={1}>
              {!isNew && status !== "published" && status !== "trash" && (
                <Button
                  variant="contained"
                  color="success"
                  fullWidth
                  onClick={handlePublish}
                  disabled={isSaving}
                >
                  Publish
                </Button>
              )}

              {!isNew && status !== "trash" && (
                <Button
                  color="warning"
                  fullWidth
                  onClick={handleTrash}
                  disabled={isSaving}
                >
                  Move to Trash
                </Button>
              )}

              {!isNew && status === "trash" && (
                <>
                  <Button
                    startIcon={<RestoreIcon />}
                    fullWidth
                    onClick={handleRestore}
                    disabled={isSaving}
                  >
                    Restore
                  </Button>
                  <Button
                    color="error"
                    startIcon={<DeleteForeverIcon />}
                    fullWidth
                    onClick={handleDeletePermanently}
                    disabled={isSaving}
                  >
                    Delete permanently
                  </Button>
                </>
              )}

              {!isNew && <Divider />}

              {!isNew && !lockedBy && (
                <Button
                  size="small"
                  startIcon={<LockIcon />}
                  onClick={handleLock}
                >
                  Lock
                </Button>
              )}

              {!isNew && lockedBy && (
                <Button
                  size="small"
                  startIcon={<LockOpenIcon />}
                  onClick={handleUnlock}
                >
                  Unlock
                </Button>
              )}
            </Stack>
          </Paper>

          {/* Media & SEO panel */}
          {config?.renderMediaPicker && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Media &amp; SEO
              </Typography>

              {/* Featured image */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Typography variant="caption" sx={{ minWidth: 100 }}>
                  Featured image:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ flex: 1 }}
                >
                  {featuredImageUid || "—"}
                </Typography>
                <Button size="small" onClick={chooseFeaturedImage}>
                  Choose
                </Button>
                {featuredImageUid && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() =>
                      updateOptionsJson((o) => {
                        delete o.featured_image_file_uid;
                      })
                    }
                  >
                    Clear
                  </Button>
                )}
              </Stack>

              {/* OG image */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Typography variant="caption" sx={{ minWidth: 100 }}>
                  OG image:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ flex: 1 }}
                >
                  {ogImageUid || "—"}
                </Typography>
                <Button size="small" onClick={chooseOgImage}>
                  Choose
                </Button>
                {ogImageUid && (
                  <Button
                    size="small"
                    color="error"
                    onClick={() =>
                      updateOptionsJson((o) => {
                        if (o.seo) {
                          delete o.seo.og_image_file_uid;
                        }
                      })
                    }
                  >
                    Clear
                  </Button>
                )}
              </Stack>

              <Divider sx={{ my: 1 }} />

              {/* Attachments */}
              <Typography variant="caption" sx={{ mb: 0.5, display: "block" }}>
                Attachments
              </Typography>
              {attachments.map((att, idx) => (
                <Stack
                  key={idx}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 0.5 }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ flex: 1 }}
                  >
                    {att.file_uid}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => removeAttachment(idx)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addAttachment}
              >
                Add attachment
              </Button>
            </Paper>
          )}

          {/* History panel */}
          {!isNew && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                History
              </Typography>

              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={includeSoftDeletedHistory}
                    onChange={(_, v) => setIncludeSoftDeletedHistory(v)}
                  />
                }
                label={
                  <Typography variant="caption">
                    Show deleted revisions
                  </Typography>
                }
                sx={{ mb: 1 }}
              />

              {history.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No revision history
                </Typography>
              )}

              {history.map((h) => (
                <Stack
                  key={h.id}
                  direction="row"
                  alignItems="center"
                  sx={{
                    py: 0.5,
                    borderBottom: 1,
                    borderColor: "divider",
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ flex: 1, minWidth: 0 }}
                  >
                    <Chip
                      label={`Rev ${h.version ?? h.id}`}
                      size="small"
                      variant="outlined"
                    />
                    {(h as any).is_deleted && (
                      <Chip
                        label="deleted"
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ alignSelf: "center" }}
                    >
                      {h.created_at
                        ? new Date(h.created_at).toLocaleString()
                        : "—"}
                    </Typography>
                  </Stack>

                  <Tooltip title="Restore this revision">
                    <IconButton
                      size="small"
                      onClick={() => handleRestoreRevision(h.id!)}
                    >
                      <RestoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {!(h as any).is_deleted ? (
                    <Tooltip title="Soft-delete revision">
                      <IconButton
                        size="small"
                        onClick={() => handleSoftDeleteRevision(h.id!)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Permanently delete revision">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleHardDeleteRevision(h.id!)}
                      >
                        <DeleteForeverIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              ))}
            </Paper>
          )}
        </Box>
      </Stack>

      {/* Loading overlay */}
      {isLoading && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.2)",
            zIndex: 1200,
          }}
        >
          <Paper sx={{ p: 3 }}>
            <Typography>Loading...</Typography>
          </Paper>
        </Box>
      )}

      {/* Conflict dialog */}
      <CmsConflictDialog
        open={conflictOpen}
        onCancel={() => setConflictOpen(false)}
        onReload={() => {
          setConflictOpen(false);
          void load();
        }}
        onOverwrite={handleConflictOverwrite}
      />

      {/* Media picker (delegated to host app) */}
      {pickerOpen &&
        config?.renderMediaPicker?.({
          open: pickerOpen,
          onSelect: handleMediaPickerSelect,
          onClose: handleMediaPickerClose,
        })}
    </Container>
  );
};

export default CmsEditPage;
