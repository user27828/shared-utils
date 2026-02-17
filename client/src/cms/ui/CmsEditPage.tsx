/**
 * CMS Edit Page — shared-utils
 *
 * Portable, two-column edit page with:
 *  - Left: history drawer + metadata form + body editor + advanced options
 *  - Right: status panel + media/SEO panel
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
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
import HistoryIcon from "@mui/icons-material/History";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";

import type {
  CmsHeadRow,
  CmsHistoryRow,
} from "../../../../utils/src/cms/types.js";
import { CmsClient } from "../CmsClient.js";
import type { CmsApi } from "../CmsApi.js";
import type {
  CmsAdminUiConfig,
  CmsImageUploadContext,
  CmsMediaPickerProps,
} from "./CmsAdminUiConfig.js";
import { defaultToast } from "./CmsAdminUiConfig.js";
import CmsConflictDialog from "./CmsConflictDialog.js";
import CmsBodyEditor, {
  type CmsEditorContentType,
  contentTypeToMime,
  mimeToContentType,
} from "./CmsBodyEditor.js";
import CmsHistoryDrawer, { HISTORY_DRAWER_WIDTH } from "./CmsHistoryDrawer.js";
import { useFmApi } from "../../fm/FmClientProvider.js";

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

const formatIsoDateTime = (iso: unknown): string | null => {
  if (typeof iso !== "string") {
    return null;
  }

  const trimmed = iso.trim();
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [optionsJson, setOptionsJson] = useState("{}");
  const [password, setPassword] = useState("");
  const [includeSoftDeletedHistory, setIncludeSoftDeletedHistory] =
    useState(false);
  const [editorMode, setEditorMode] = useState<"visual" | "text">("visual");

  // ── UI state ──────────────────────────────────────────────────────────
  const [isSlugEditing, setIsSlugEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState("");
  const [liveErrorMessage, setLiveErrorMessage] = useState("");
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [loadedRevisionId, setLoadedRevisionId] = useState<number | null>(null);
  const [pendingContentType, setPendingContentType] =
    useState<CmsEditorContentType | null>(null);

  /** Snapshot of live form state before loading a revision, so we
   *  can restore it when the user dismisses the preview. */
  const savedFormRef = useRef<{
    title: string;
    slug: string;
    locale: string;
    postType: string;
    contentType: CmsEditorContentType;
    content: string;
    tags: string[];
    optionsJson: string;
  } | null>(null);

  // ── Refs ──────────────────────────────────────────────────────────────
  const errorAlertRef = useRef<HTMLDivElement | null>(null);
  const conflictRef = useRef<ConflictCtx | null>(null);
  const slugBeforeEditRef = useRef<string>("");
  const pickerResolveRef = useRef<
    ((file: { uid: string } | null) => void) | null
  >(null);

  // ── Dirty-tracking epoch ──────────────────────────────────────────────
  /** Epoch timestamp set after every load/save; any form change after this
   *  bumps editEpoch, making isDirty true without fragile content diffs. */
  const lastCleanEpochRef = useRef<number>(0);
  const [editEpoch, setEditEpoch] = useState(0);

  // ── Derived ───────────────────────────────────────────────────────────
  const etag = (row as any)?.etag as string | undefined;
  const status = (row as any)?.status as string | undefined;
  const lockedBy = (row as any)?.locked_by as string | undefined;

  const publishedAtIso = row?.published_at ?? row?.first_published_at ?? null;
  const publishedAtText = useMemo(
    () => formatIsoDateTime(publishedAtIso) ?? "—",
    [publishedAtIso],
  );

  const revisionsCount = history.length;

  const optionsParse = useMemo(() => safeJsonParse(optionsJson), [optionsJson]);

  const canPreview = useMemo(
    () =>
      !isNew &&
      status !== "trash" &&
      !!postType &&
      !!locale &&
      !!slug &&
      !!config?.getPreviewUrl,
    [isNew, status, postType, locale, slug, config?.getPreviewUrl],
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

  /** Whether the editor body contains user-authored content (beyond the default empty state). */
  const hasEditorContent = useMemo(() => {
    const trimmed = content.trim();
    if (!trimmed) {
      return false;
    }
    // Default empty states for each content type
    const emptyPatterns = ["<p></p>", "<p>&nbsp;</p>", "<p>\n</p>", ""];
    return !emptyPatterns.includes(trimmed);
  }, [content]);

  /** Whether the form fields differ from the persisted row. */
  const isDirty = useMemo(() => {
    if (isNew) {
      return title !== "" || content !== "<p></p>";
    }
    // After a load/save the epochs are equal — no unsaved changes.
    return editEpoch > lastCleanEpochRef.current;
  }, [isNew, title, content, editEpoch]);

  /** Bump editEpoch when any tracked form field changes after the last
   *  clean epoch.  The guard prevents the effect from firing during the
   *  same tick as load()/save() which also set these fields. */
  useEffect(() => {
    // Skip the very first render and programmatic sets from load/save
    // by checking if we already have a baseline.
    if (lastCleanEpochRef.current === 0) {
      return;
    }
    // Skip during loading — field changes come from the server, not the user
    if (isLoading) {
      return;
    }
    setEditEpoch(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    title,
    slug,
    content,
    tags,
    optionsJson,
    password,
    locale,
    postType,
    contentType,
    isLoading,
  ]);

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

  // ── Slug helpers (view/edit row) ─────────────────────────────────────
  const slugPath = useMemo(() => {
    const trimmed = slug.trim();
    if (!trimmed) {
      return "";
    }
    const noLeadingSlashes = trimmed.replace(/^\/+/, "");
    return `/${noLeadingSlashes}`;
  }, [slug]);

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) {
        return false;
      }

      // Prefer modern Clipboard API.
      try {
        if (
          typeof navigator !== "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          await navigator.clipboard.writeText(trimmed);
          return true;
        }
      } catch {
        // Fall back below.
      }

      // Legacy fallback (best-effort). Avoids throwing in non-DOM contexts.
      try {
        if (typeof document === "undefined") {
          return false;
        }
        const el = document.createElement("textarea");
        el.value = trimmed;
        el.setAttribute("readonly", "");
        el.style.position = "fixed";
        el.style.left = "-9999px";
        el.style.top = "0";
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const handleCopySlug = useCallback(async () => {
    if (!slugPath) {
      toast.info("No slug to copy");
      return;
    }

    const ok = await copyToClipboard(slugPath);
    if (ok) {
      toast.success("Slug copied");
      announce("Slug copied to clipboard");
      return;
    }

    toast.error("Copy failed");
    announceErr("Copy failed");
  }, [announce, announceErr, copyToClipboard, slugPath, toast]);

  const handleStartSlugEdit = useCallback(() => {
    slugBeforeEditRef.current = slug;
    setIsSlugEditing(true);
  }, [slug]);

  const handleSlugBlur = useCallback(() => {
    setIsSlugEditing(false);
  }, []);

  const handleSlugKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        (e.currentTarget as HTMLInputElement).blur();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        setSlug(slugBeforeEditRef.current);
        setIsSlugEditing(false);
      }
    },
    [],
  );

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (isNew) {
      return;
    }
    setIsSlugEditing(false);
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
      setTags(Array.isArray((item as any).tags) ? (item as any).tags : []);
      setOptionsJson(
        (item as any).options
          ? JSON.stringify((item as any).options, null, 2)
          : "{}",
      );
      setPassword("");

      // Mark form as clean after populating from server data
      const epoch = Date.now();
      lastCleanEpochRef.current = epoch;
      setEditEpoch(epoch);

      // Load history (larger batch for calendar navigation)
      try {
        const hist = await api.adminListHistory(propUid!, {
          limit: 500,
        });
        setHistory(hist.items ?? hist ?? []);
      } catch {
        /* non-critical */
      }

      // Clear any loaded revision when reloading
      setLoadedRevisionId(null);
      savedFormRef.current = null;
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
      tags: [...tags],
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
    tags,
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

  // ── Load / dismiss revision (preview without server write) ────────────
  const handleLoadRevision = useCallback(
    (historyId: number) => {
      const rev = history.find((h) => h.id === historyId);
      if (!rev?.snapshot) {
        toast.error("Revision snapshot not available");
        return;
      }

      setIsSlugEditing(false);

      // Save current form state before overwriting (only once per session)
      if (!savedFormRef.current) {
        savedFormRef.current = {
          title,
          slug,
          locale,
          postType,
          contentType,
          content,
          tags,
          optionsJson,
        };
      }

      // Populate form from the snapshot
      const snap = rev.snapshot as Record<string, any>;
      setTitle(snap.title ?? "");
      setSlug(snap.slug ?? "");
      setLocale(snap.locale ?? locale);
      setPostType(snap.post_type ?? postType);
      setContentType(
        mimeToContentType(
          snap.content_type ?? "text/html",
        ) as CmsEditorContentType,
      );
      setContent(snap.content ?? "<p></p>");
      setTags(Array.isArray(snap.tags) ? snap.tags : []);
      setOptionsJson(
        snap.options ? JSON.stringify(snap.options, null, 2) : "{}",
      );

      setLoadedRevisionId(historyId);
      announce(`Loaded revision ${rev.revision ?? rev.id} for preview`);
    },
    [
      history,
      title,
      slug,
      locale,
      postType,
      contentType,
      content,
      tags,
      optionsJson,
      toast,
      announce,
    ],
  );

  const handleDismissRevision = useCallback(() => {
    setIsSlugEditing(false);
    if (!savedFormRef.current) {
      // Nothing to restore — just clear the loaded ID
      setLoadedRevisionId(null);
      return;
    }

    // Restore the form to its pre-preview state
    const s = savedFormRef.current;
    setTitle(s.title);
    setSlug(s.slug);
    setLocale(s.locale);
    setPostType(s.postType);
    setContentType(s.contentType);
    setContent(s.content);
    setTags(s.tags);
    setOptionsJson(s.optionsJson);

    savedFormRef.current = null;
    setLoadedRevisionId(null);
    announce("Returned to current version");
  }, [announce]);

  // ── Effective image upload handler ────────────────────────────────────
  const contextFmApi = useFmApi();

  const effectiveOnUploadImage = useCallback(
    async (
      file: File,
      context?: CmsImageUploadContext,
    ): Promise<string | null> => {
      // Prefer explicit callback
      if (config?.onUploadImage) {
        return config.onUploadImage(file, context);
      }

      // Auto-upload via FM API (explicit config override → context → default)
      const fmApi = config?.fmApi || contextFmApi;

      // ── Build a meaningful filename for browser-pasted images ────────
      // Browsers generate generic names like "image.png" / "image.jpeg" for
      // clipboard pastes.  Replace with a CMS-contextual name so files are
      // identifiable in the media library.
      const isGenericPasteName = /^image\.[a-z]+$/i.test(file.name);
      let uploadFile = file;
      if (isGenericPasteName) {
        // Normalize extension: prefer .jpg over .jpeg for consistency
        const rawExt = file.name.replace(/^.*\./, "").toLowerCase();
        const ext = rawExt === "jpeg" ? "jpg" : rawExt;
        const rnd = Math.random().toString(36).slice(2, 8);
        let prefix: string;
        if (slug) {
          // Use slug (truncated) as a human-readable prefix
          prefix = slug.slice(0, 40);
        } else if (propUid) {
          prefix = propUid;
        } else {
          prefix = "img-paste";
        }
        const newName = `${prefix}-${rnd}.${ext}`;
        uploadFile = new File([file], newName, { type: file.type });
      }

      // Pasted images → purpose "cms_b64" → stored in "cms-b64" bucket
      // (separate from picker-uploaded "cms" bucket).
      // Regular uploads use default purpose → "cms" bucket.
      const init = await fmApi.uploadInit({
        request: {
          originalFilename: uploadFile.name,
          mimeType: uploadFile.type || "application/octet-stream",
          sizeBytes: uploadFile.size,
          ...(isGenericPasteName ? { purpose: "cms_b64" as const } : {}),
        },
      });

      await fmApi.uploadProxied({
        fileUid: init.fileUid,
        body: uploadFile,
        contentType: uploadFile.type || "application/octet-stream",
      });

      return fmApi.getContentUrl({ fileUid: init.fileUid });
    },
    [config?.onUploadImage, config?.fmApi, contextFmApi, slug, propUid],
  );

  // Upload is always available: explicit callback, explicit fmApi, or context/default FM client
  const hasUploadHandler = true;

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
    if (!canPreview || !config?.getPreviewUrl) {
      return null;
    }
    const raw = config.getPreviewUrl(slug, postType, locale);
    if (!raw) {
      return null;
    }
    if (status === "published") {
      return raw;
    }

    const [beforeHash, hash] = String(raw).split("#", 2);
    const sep = beforeHash.includes("?") ? "&" : "?";
    const next = `${beforeHash}${sep}preview=1`;
    return hash ? `${next}#${hash}` : next;
  }, [canPreview, config, postType, locale, slug, status]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="xl" sx={{ pt: 0, pb: 3 }}>
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

      {/* ═══ FLEX WRAPPER: history drawer + main content ═══ */}
      <Box
        sx={{
          display: "flex",
          position: "relative",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        {/* History drawer (flex-based sidebar) */}
        {!isNew && (
          <CmsHistoryDrawer
            open={historyDrawerOpen}
            onClose={() => setHistoryDrawerOpen(false)}
            history={history}
            loadedRevisionId={loadedRevisionId}
            isDirty={isDirty}
            isSaving={isSaving}
            includeSoftDeleted={includeSoftDeletedHistory}
            onIncludeSoftDeletedChange={setIncludeSoftDeletedHistory}
            onLoadRevision={handleLoadRevision}
            onRestoreRevision={handleRestoreRevision}
            onSoftDeleteRevision={handleSoftDeleteRevision}
            onHardDeleteRevision={handleHardDeleteRevision}
            onDismissRevision={handleDismissRevision}
            currentVersionNumber={row?.version_number}
            currentUpdatedAt={row?.updated_at}
          />
        )}

        {/* Main content area */}
        <Box sx={{ flex: 1, minWidth: 0, ml: 1 }}>
          {/* Loaded revision banner */}
          {loadedRevisionId && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={handleDismissRevision}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={() => handleRestoreRevision(loadedRevisionId)}
                    disabled={isSaving}
                  >
                    Restore this revision
                  </Button>
                </Stack>
              }
            >
              Previewing revision{" "}
              {history.find((h) => h.id === loadedRevisionId)?.revision ??
                loadedRevisionId}
              . Changes have not been saved.
            </Alert>
          )}

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
                  {!isNew && (
                    <Tooltip
                      title={
                        historyDrawerOpen ? "Close history" : "Open history"
                      }
                    >
                      <IconButton
                        onClick={() => setHistoryDrawerOpen((o) => !o)}
                        color={historyDrawerOpen ? "primary" : "default"}
                        size="small"
                      >
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  )}
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
                    disabled={isSaving || isLoading}
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
                  sx={{ mb: isSlugEditing ? 2 : "1px" }}
                />

                {!isSlugEditing ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      px: 1,
                      py: 0.5,
                      bgcolor: "background.default",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary" }}
                    >
                      Slug:
                    </Typography>

                    <Tooltip title={slugPath || "No slug"}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: { xs: "55vw", md: 360 },
                          px: 0.5,
                          py: 0.25,
                          borderRadius: 0.75,
                          bgcolor: "action.hover",
                        }}
                      >
                        {slugPath || "—"}
                      </Typography>
                    </Tooltip>

                    <Box sx={{ flex: 1 }} />

                    <Tooltip title={slugPath ? "Copy slug" : "No slug to copy"}>
                      <span>
                        <IconButton
                          size="small"
                          onClick={handleCopySlug}
                          disabled={!slugPath}
                          aria-label="Copy slug"
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Edit slug">
                      <IconButton
                        size="small"
                        onClick={handleStartSlugEdit}
                        aria-label="Edit slug"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                ) : (
                  <TextField
                    label="Slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    size="small"
                    fullWidth
                    autoFocus
                    onBlur={handleSlugBlur}
                    onKeyDown={handleSlugKeyDown}
                    sx={{ maxWidth: { xs: "100%", md: 520 } }}
                    helperText="Used in the URL path. Leading '/' is optional."
                    inputProps={{
                      style: { fontFamily: "monospace" },
                    }}
                  />
                )}
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
                        onChange={(e) => {
                          const next = e.target.value as CmsEditorContentType;
                          if (hasEditorContent && next !== contentType) {
                            setPendingContentType(next);
                          } else {
                            setContentType(next);
                          }
                        }}
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
                    <ToggleButtonGroup
                      value={editorMode}
                      exclusive
                      onChange={(_, v) => {
                        if (v) {
                          setEditorMode(v);
                        }
                      }}
                      size="small"
                      sx={{ ml: "auto" }}
                    >
                      <ToggleButton
                        value="visual"
                        sx={{
                          px: 1.5,
                          py: 0.25,
                          fontSize: "0.8rem",
                          textTransform: "none",
                        }}
                      >
                        Visual
                      </ToggleButton>
                      <ToggleButton
                        value="text"
                        sx={{
                          px: 1.5,
                          py: 0.25,
                          fontSize: "0.8rem",
                          textTransform: "none",
                        }}
                      >
                        Text
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                </Stack>

                {/* Editor body — key forces clean remount on mode toggle */}
                <CmsBodyEditor
                  key={`body-${contentType}-${editorMode}`}
                  contentType={effectiveContentType}
                  value={content}
                  onChange={setContent}
                  editor={config?.editorPreference}
                  onUploadImage={
                    hasUploadHandler ? effectiveOnUploadImage : undefined
                  }
                  onPickAsset={
                    config?.renderMediaPicker
                      ? () => openMediaPicker()
                      : undefined
                  }
                />
              </Paper>

              {/* Tags & Password */}
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Tags
                </Typography>
                <Stack
                  direction="row"
                  spacing={1}
                  flexWrap="wrap"
                  sx={{ mb: tags.length > 0 ? 1 : 0 }}
                >
                  {tags.map((tag, idx) => (
                    <Chip
                      key={`${tag}-${idx}`}
                      label={tag}
                      size="small"
                      onDelete={() =>
                        setTags((prev) => prev.filter((_, i) => i !== idx))
                      }
                      sx={{ mb: 0.5 }}
                    />
                  ))}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Add tag"
                    size="small"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = tagInput.trim();
                        if (val && !tags.includes(val)) {
                          setTags((prev) => [...prev, val]);
                        }
                        setTagInput("");
                      }
                    }}
                    sx={{ flex: 1 }}
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => {
                      const val = tagInput.trim();
                      if (val && !tags.includes(val)) {
                        setTags((prev) => [...prev, val]);
                      }
                      setTagInput("");
                    }}
                    disabled={!tagInput.trim()}
                  >
                    <AddIcon />
                  </IconButton>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Password Protection
                </Typography>
                <TextField
                  label="Password (optional)"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isNew ? "" : "(unchanged)"}
                  fullWidth
                  size="small"
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
                  {etag && (
                    <Chip label={etag} size="small" variant="outlined" />
                  )}
                  {lockedBy && (
                    <Chip
                      label={`Locked by ${lockedBy}`}
                      size="small"
                      icon={<LockIcon fontSize="small" />}
                      color="warning"
                    />
                  )}
                </Stack>

                {!isNew && (
                  <Stack spacing={0.75} sx={{ mb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Chip
                        label={
                          status === "published"
                            ? "Published"
                            : status === "trash"
                              ? "Trash"
                              : "Draft"
                        }
                        size="small"
                        color={
                          status === "published"
                            ? "success"
                            : status === "trash"
                              ? "error"
                              : "default"
                        }
                        variant={status === "published" ? "filled" : "outlined"}
                      />
                      {status === "published" && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {publishedAtText}
                        </Typography>
                      )}
                    </Stack>

                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Typography variant="body2">
                        Revisions: {revisionsCount}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<HistoryIcon fontSize="small" />}
                        onClick={() => setHistoryDrawerOpen(true)}
                        disabled={historyDrawerOpen || revisionsCount === 0}
                      >
                        Browse
                      </Button>
                    </Stack>
                  </Stack>
                )}

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
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        color="warning"
                        fullWidth
                        onClick={handleTrash}
                        disabled={isSaving}
                      >
                        Move to Trash
                      </Button>
                      {!lockedBy && (
                        <Button
                          variant="outlined"
                          startIcon={<LockIcon />}
                          fullWidth
                          onClick={handleLock}
                          disabled={isSaving}
                        >
                          Lock
                        </Button>
                      )}
                      {lockedBy && (
                        <Button
                          variant="outlined"
                          startIcon={<LockOpenIcon />}
                          fullWidth
                          onClick={handleUnlock}
                          disabled={isSaving}
                        >
                          Unlock
                        </Button>
                      )}
                    </Stack>
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

                  {!isNew && status === "trash" && <Divider />}
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
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={chooseFeaturedImage}
                    >
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
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon fontSize="small" />}
                      onClick={chooseOgImage}
                    >
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
                  <Typography
                    variant="caption"
                    sx={{ mb: 0.5, display: "block" }}
                  >
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
            </Box>
          </Stack>
        </Box>
        {/* /Main content area */}
      </Box>
      {/* /FLEX WRAPPER */}

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

      {/* Content type change confirmation */}
      <Dialog
        open={!!pendingContentType}
        onClose={() => setPendingContentType(null)}
      >
        <DialogTitle>Change content type?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The editor already has content. Choosing the wrong content type may
            affect how it is displayed or cause formatting issues.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingContentType(null)} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (pendingContentType) {
                setContentType(pendingContentType);
              }
              setPendingContentType(null);
            }}
          >
            Change
          </Button>
        </DialogActions>
      </Dialog>

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
