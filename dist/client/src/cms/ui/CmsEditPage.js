import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Container, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Divider, FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, } from "@mui/material";
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
import { TagsInput } from "../../components/form/TagsInput.js";
import { CmsClient } from "../CmsClient.js";
import { defaultToast } from "./CmsAdminUiConfig.js";
import CmsConflictDialog from "./CmsConflictDialog.js";
import CmsBodyEditor, { contentTypeToMime, mimeToContentType, } from "./CmsBodyEditor.js";
import CmsHistoryDrawer from "./CmsHistoryDrawer.js";
import { useFmApi } from "../../fm/FmClientProvider.js";
import { isDev } from "../../../../utils/index.js";
import { useDebouncedCallback } from "../../helpers/debounce.js";
// ─── Helpers ──────────────────────────────────────────────────────────────
const safeJsonParse = (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
        return { value: {}, error: null };
    }
    try {
        return { value: JSON.parse(trimmed), error: null };
    }
    catch (err) {
        return { value: null, error: err?.message || "Invalid JSON" };
    }
};
const slugify = (str) => str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
const isPreconditionFailed = (err) => err?.statusCode === 412 || err?.status === 412;
const getStatusChipColor = (s) => {
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
const formatIsoDateTime = (iso) => {
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
const defaultApi = new CmsClient();
// ─── Component ────────────────────────────────────────────────────────────
const CmsEditPage = ({ uid: propUid, config, defaultPostType = "page", defaultLocale = "en", }) => {
    const api = config?.api ?? defaultApi;
    const toast = config?.toast ?? defaultToast;
    const nav = config?.navigation;
    const localeOptions = useMemo(() => config?.localeOptions ?? [{ label: "English", value: "en" }], [config?.localeOptions]);
    const isNew = !propUid;
    // ── Data state ────────────────────────────────────────────────────────
    const [row, setRow] = useState(null);
    const [history, setHistory] = useState([]);
    // ── Form state ────────────────────────────────────────────────────────
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [locale, setLocale] = useState(defaultLocale);
    const [postType, setPostType] = useState(defaultPostType);
    const [contentType, setContentType] = useState("html");
    const [content, setContent] = useState("<p></p>");
    const [tags, setTags] = useState([]);
    const [optionsJson, setOptionsJson] = useState("{}");
    const [password, setPassword] = useState("");
    const [includeSoftDeletedHistory, setIncludeSoftDeletedHistory] = useState(false);
    const [editorMode, setEditorMode] = useState("visual");
    // ── Dev-only editor switcher ───────────────────────────────────────────
    const devMode = useMemo(() => isDev(), []);
    const [editorOverride, setEditorOverride] = useState(config?.editorPreference ?? "ckeditor");
    // Sync with external config changes (e.g. consumer persisted preference)
    useEffect(() => {
        if (config?.editorPreference) {
            setEditorOverride(config.editorPreference);
        }
    }, [config?.editorPreference]);
    const handleEditorOverride = useCallback((next) => {
        setEditorOverride(next);
        config?.onEditorPreferenceChange?.(next);
    }, [config]);
    // ── UI state ──────────────────────────────────────────────────────────
    const [isSlugEditing, setIsSlugEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [conflictOpen, setConflictOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [liveMessage, setLiveMessage] = useState("");
    const [liveErrorMessage, setLiveErrorMessage] = useState("");
    const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
    const [loadedRevisionId, setLoadedRevisionId] = useState(null);
    const [pendingContentType, setPendingContentType] = useState(null);
    /** Snapshot of live form state before loading a revision, so we
     *  can restore it when the user dismisses the preview. */
    const savedFormRef = useRef(null);
    // ── Refs ──────────────────────────────────────────────────────────────
    const errorAlertRef = useRef(null);
    const conflictRef = useRef(null);
    const slugBeforeEditRef = useRef("");
    const pickerResolveRef = useRef(null);
    // ── Dirty-tracking epoch ──────────────────────────────────────────────
    /** Epoch timestamp set after every load/save; any form change after this
     *  bumps editEpoch, making isDirty true without fragile content diffs. */
    const lastCleanEpochRef = useRef(0);
    const [editEpoch, setEditEpoch] = useState(0);
    // ── Derived ───────────────────────────────────────────────────────────
    const etag = row?.etag;
    const status = row?.status;
    const lockedBy = row?.locked_by;
    const publishedAtIso = row?.published_at ?? row?.first_published_at ?? null;
    const publishedAtText = useMemo(() => formatIsoDateTime(publishedAtIso) ?? "—", [publishedAtIso]);
    const revisionsCount = history.length;
    const optionsParse = useMemo(() => safeJsonParse(optionsJson), [optionsJson]);
    const canPreview = useMemo(() => !isNew &&
        status !== "trash" &&
        !!postType &&
        !!locale &&
        !!slug &&
        !!config?.getPreviewUrl, [isNew, status, postType, locale, slug, config?.getPreviewUrl]);
    const postTypeOpts = useMemo(() => config?.postTypeOptions ?? [
        { value: "page", label: "Page" },
        { value: "post", label: "Post" },
    ], [config?.postTypeOptions]);
    const hasVisualMode = contentType === "html" || contentType === "markdown";
    const effectiveContentType = hasVisualMode && editorMode === "text" ? "text" : contentType;
    /** Whether the editor body contains user-authored content (beyond the default empty state). */
    const hasEditorContent = useMemo(() => {
        const trimmed = (content ?? "").trim();
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
    /** Debounced editEpoch bump — collapses rapid keystrokes into a single
     *  state update instead of re-rendering on every character. */
    const [bumpEditEpoch] = useDebouncedCallback(() => {
        setEditEpoch(Date.now());
    }, { wait: 150, leading: true, trailing: true });
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
        bumpEditEpoch();
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
    const announceTimerRef = useRef(null);
    const announceErrTimerRef = useRef(null);
    // Cleanup ARIA timers on unmount to prevent memory leaks.
    useEffect(() => {
        return () => {
            if (announceTimerRef.current !== null) {
                clearTimeout(announceTimerRef.current);
            }
            if (announceErrTimerRef.current !== null) {
                clearTimeout(announceErrTimerRef.current);
            }
        };
    }, []);
    const announce = useCallback((msg) => {
        setLiveMessage(msg);
        if (announceTimerRef.current !== null) {
            clearTimeout(announceTimerRef.current);
        }
        announceTimerRef.current = setTimeout(() => {
            setLiveMessage("");
            announceTimerRef.current = null;
        }, 4000);
    }, []);
    const announceErr = useCallback((msg) => {
        setLiveErrorMessage(msg);
        if (announceErrTimerRef.current !== null) {
            clearTimeout(announceErrTimerRef.current);
        }
        announceErrTimerRef.current = setTimeout(() => {
            setLiveErrorMessage("");
            announceErrTimerRef.current = null;
        }, 6000);
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
    const copyToClipboard = useCallback(async (text) => {
        const trimmed = text.trim();
        if (!trimmed) {
            return false;
        }
        // Prefer modern Clipboard API.
        try {
            if (typeof navigator !== "undefined" &&
                navigator.clipboard &&
                typeof navigator.clipboard.writeText === "function") {
                await navigator.clipboard.writeText(trimmed);
                return true;
            }
        }
        catch {
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
        }
        catch {
            return false;
        }
    }, []);
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
    const handleSlugKeyDown = useCallback((e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setSlug(slugBeforeEditRef.current);
            setIsSlugEditing(false);
        }
    }, []);
    // ── Load ──────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (isNew) {
            return;
        }
        setIsSlugEditing(false);
        setIsLoading(true);
        setError(null);
        try {
            const item = await api.adminGet(propUid);
            setRow(item);
            setTitle(item.title || "");
            setSlug(item.slug || "");
            setLocale(item.locale || defaultLocale);
            setPostType(item.post_type || defaultPostType);
            setContentType(mimeToContentType(item.content_type || "text/html"));
            setContent(item.content || "<p></p>");
            setTags(Array.isArray(item.tags) ? item.tags : []);
            setOptionsJson(item.options
                ? JSON.stringify(item.options, null, 2)
                : "{}");
            setPassword("");
            // Mark form as clean after populating from server data
            const epoch = Date.now();
            lastCleanEpochRef.current = epoch;
            setEditEpoch(epoch);
            // Load history (larger batch for calendar navigation)
            try {
                const hist = await api.adminListHistory(propUid, {
                    limit: 500,
                });
                setHistory(hist.items ?? hist ?? []);
            }
            catch {
                /* non-critical */
            }
            // Clear any loaded revision when reloading
            setLoadedRevisionId(null);
            savedFormRef.current = null;
            slugManualRef.current = false;
        }
        catch (err) {
            setError(err?.message || "Failed to load CMS item");
        }
        finally {
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
        const patch = {
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
    const openConflict = (ctx) => {
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
            const latestEtag = latest?.etag || "*";
            switch (ctx.kind) {
                case "save":
                    await api.adminUpdate({
                        uid: ctx.uid,
                        patch: (ctx.localPatch || buildPatch()),
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
        }
        catch (err) {
            toast.error(err?.message || "Overwrite failed");
        }
        finally {
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
                const created = await api.adminCreate(buildPatch());
                toast.success("Created successfully");
                announce("Item created");
                nav?.goToEdit?.(created.uid);
            }
            else {
                await api.adminUpdate({
                    uid: propUid,
                    patch: buildPatch(),
                    ifMatch: etag || "*",
                });
                toast.success("Saved");
                announce("Saved");
                await load();
            }
        }
        catch (err) {
            if (!isNew && isPreconditionFailed(err)) {
                openConflict({
                    kind: "save",
                    uid: propUid,
                    localPatch: buildPatch(),
                });
                return;
            }
            const msg = err?.message || "Save failed";
            setError(msg);
            toast.error(msg);
            announceErr(msg);
        }
        finally {
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
            await api.adminPublish({ uid: propUid, ifMatch: etag || "*" });
            toast.success("Published");
            announce("Published");
            await load();
        }
        catch (err) {
            if (isPreconditionFailed(err)) {
                openConflict({ kind: "publish", uid: propUid });
                return;
            }
            toast.error(err?.message || "Publish failed");
        }
        finally {
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
                uid: propUid,
                ifMatch: etag || "*",
            });
            setRow(updated);
            toast.success("Moved to trash");
            announce("Moved to trash");
        }
        catch (err) {
            if (isPreconditionFailed(err)) {
                openConflict({ kind: "trash", uid: propUid });
                return;
            }
            toast.error(err?.message || "Trash failed");
        }
        finally {
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
                uid: propUid,
                ifMatch: etag || "*",
            });
            setRow(updated);
            toast.success("Restored from trash");
            announce("Restored");
        }
        catch (err) {
            if (isPreconditionFailed(err)) {
                openConflict({ kind: "restore", uid: propUid });
                return;
            }
            toast.error(err?.message || "Restore failed");
        }
        finally {
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
            await api.adminDeletePermanently(propUid);
            toast.success("Deleted permanently");
            nav?.goToList?.();
        }
        catch (err) {
            toast.error(err?.message || "Delete failed");
        }
        finally {
            setIsSaving(false);
        }
    };
    // ── Lock / Unlock ─────────────────────────────────────────────────────
    const handleLock = async () => {
        if (isNew) {
            return;
        }
        try {
            await api.adminLock(propUid);
            toast.success("Locked");
            await load();
        }
        catch (err) {
            toast.error(err?.message || "Lock failed");
        }
    };
    const handleUnlock = async () => {
        if (isNew) {
            return;
        }
        try {
            await api.adminUnlock(propUid);
            toast.success("Unlocked");
            await load();
        }
        catch (err) {
            toast.error(err?.message || "Unlock failed");
        }
    };
    // ── History operations ────────────────────────────────────────────────
    const handleRestoreRevision = async (historyId) => {
        setIsSaving(true);
        try {
            await api.adminRestoreHistory({
                uid: propUid,
                historyId,
                ifMatch: etag || "*",
            });
            toast.success("Revision restored");
            await load();
        }
        catch (err) {
            if (isPreconditionFailed(err)) {
                openConflict({
                    kind: "restoreRevision",
                    uid: propUid,
                    historyId,
                });
                return;
            }
            toast.error(err?.message || "Restore revision failed");
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleSoftDeleteRevision = async (historyId) => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm("Soft-delete this revision?")) {
            return;
        }
        try {
            await api.adminSoftDeleteHistory({ uid: propUid, historyId });
            toast.success("Revision soft-deleted");
            await load();
        }
        catch (err) {
            toast.error(err?.message || "Soft-delete failed");
        }
    };
    const handleHardDeleteRevision = async (historyId) => {
        // eslint-disable-next-line no-restricted-globals
        if (!confirm("Permanently delete this revision? This cannot be undone.")) {
            return;
        }
        try {
            await api.adminHardDeleteHistory({ uid: propUid, historyId });
            toast.success("Revision permanently deleted");
            await load();
        }
        catch (err) {
            toast.error(err?.message || "Hard-delete failed");
        }
    };
    // ── Load / dismiss revision (preview without server write) ────────────
    /** Ref-based snapshot of current form state — avoids listing every field
     *  as a dependency of handleLoadRevision, which previously caused the
     *  callback to be recreated on every keystroke. */
    const formStateRef = useRef({
        title,
        slug,
        locale,
        postType,
        contentType,
        content,
        tags,
        optionsJson,
    });
    // Keep the ref in sync (cheap ref assignment, no render) ─────────
    formStateRef.current = {
        title,
        slug,
        locale,
        postType,
        contentType,
        content,
        tags,
        optionsJson,
    };
    const handleLoadRevision = useCallback((historyId) => {
        const rev = history.find((h) => h.id === historyId);
        if (!rev?.snapshot) {
            toast.error("Revision snapshot not available");
            return;
        }
        setIsSlugEditing(false);
        // Save current form state before overwriting (only once per session)
        if (!savedFormRef.current) {
            savedFormRef.current = { ...formStateRef.current };
        }
        // Populate form from the snapshot
        const snap = rev.snapshot;
        setTitle(snap.title ?? "");
        setSlug(snap.slug ?? "");
        setLocale(snap.locale ?? formStateRef.current.locale);
        setPostType(snap.post_type ?? formStateRef.current.postType);
        setContentType(mimeToContentType(snap.content_type ?? "text/html"));
        setContent(snap.content ?? "<p></p>");
        setTags(Array.isArray(snap.tags) ? snap.tags : []);
        setOptionsJson(snap.options ? JSON.stringify(snap.options, null, 2) : "{}");
        setLoadedRevisionId(historyId);
        announce(`Loaded revision ${rev.revision ?? rev.id} for preview`);
    }, [history, toast, announce]);
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
    const effectiveOnUploadImage = useCallback(async (file, context) => {
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
            let prefix;
            if (slug) {
                // Use slug (truncated) as a human-readable prefix
                prefix = slug.slice(0, 40);
            }
            else if (propUid) {
                prefix = propUid;
            }
            else {
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
                ...(isGenericPasteName ? { purpose: "cms_b64" } : {}),
            },
        });
        await fmApi.uploadProxied({
            fileUid: init.fileUid,
            body: uploadFile,
            contentType: uploadFile.type || "application/octet-stream",
        });
        return fmApi.getContentUrl({ fileUid: init.fileUid });
    }, [config?.onUploadImage, config?.fmApi, contextFmApi, slug, propUid]);
    // Upload is always available: explicit callback, explicit fmApi, or context/default FM client
    const hasUploadHandler = true;
    // ── Media picker (promise-based) ──────────────────────────────────────
    const openMediaPicker = () => {
        return new Promise((resolve) => {
            pickerResolveRef.current = resolve;
            setPickerOpen(true);
        });
    };
    const handleMediaPickerSelect = (file) => {
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
    const updateOptionsJson = (mutator) => {
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
    const attachments = optionsParse.value?.attachments ?? [];
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
    const removeAttachment = (index) => {
        updateOptionsJson((o) => {
            if (Array.isArray(o.attachments)) {
                o.attachments.splice(index, 1);
            }
        });
    };
    // ── Auto-slug: real-time (debounced) while typing + on blur ───────────
    const [debouncedAutoSlug] = useDebouncedCallback((nextTitle) => {
        // Only auto-generate when the user hasn't manually set a slug
        if (isNew && !slugManualRef.current && nextTitle) {
            setSlug(slugify(nextTitle));
        }
    }, { wait: 300 });
    /** Track whether the user has manually edited the slug so auto-slug
     *  doesn't overwrite their custom value. */
    const slugManualRef = useRef(false);
    // Drive auto-slug from title changes (new items only)
    useEffect(() => {
        if (isNew) {
            debouncedAutoSlug(title);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [title, isNew]);
    const handleTitleBlur = () => {
        // Final sync on blur — immediate, no debounce wait
        if (isNew && !slugManualRef.current && title) {
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
    return (_jsxs(Container, { maxWidth: "xl", sx: { pt: 0, pb: 3 }, children: [_jsx(Box, { "aria-live": "polite", "aria-atomic": "true", sx: { position: "absolute", left: -9999 }, children: liveMessage }), _jsx(Box, { "aria-live": "assertive", "aria-atomic": "true", sx: { position: "absolute", left: -9999 }, children: liveErrorMessage }), _jsxs(Box, { sx: {
                    display: "flex",
                    position: "relative",
                    minHeight: "calc(100vh - 64px)",
                }, children: [!isNew && (_jsx(CmsHistoryDrawer, { open: historyDrawerOpen, onClose: () => setHistoryDrawerOpen(false), history: history, loadedRevisionId: loadedRevisionId, isDirty: isDirty, isSaving: isSaving, includeSoftDeleted: includeSoftDeletedHistory, onIncludeSoftDeletedChange: setIncludeSoftDeletedHistory, onLoadRevision: handleLoadRevision, onRestoreRevision: handleRestoreRevision, onSoftDeleteRevision: handleSoftDeleteRevision, onHardDeleteRevision: handleHardDeleteRevision, onDismissRevision: handleDismissRevision, currentVersionNumber: row?.version_number, currentUpdatedAt: row?.updated_at })), _jsxs(Box, { sx: { flex: 1, minWidth: 0, ml: 1 }, children: [loadedRevisionId && (_jsxs(Alert, { severity: "info", sx: { mb: 2 }, action: _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { size: "small", color: "inherit", onClick: handleDismissRevision, children: "Dismiss" }), _jsx(Button, { size: "small", variant: "outlined", color: "inherit", onClick: () => handleRestoreRevision(loadedRevisionId), disabled: isSaving, children: "Restore this revision" })] }), children: ["Previewing revision", " ", history.find((h) => h.id === loadedRevisionId)?.revision ??
                                        loadedRevisionId, ". Changes have not been saved."] })), _jsxs(Stack, { direction: { xs: "column", lg: "row" }, spacing: 3, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 2 }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [_jsx(Tooltip, { title: "Back to list", children: _jsx(IconButton, { onClick: () => nav?.goToList?.(), children: _jsx(ArrowBackIcon, {}) }) }), _jsx(Typography, { variant: "h5", children: isNew ? "New CMS Item" : "Edit CMS Item" })] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [!isNew && (_jsx(Tooltip, { title: historyDrawerOpen ? "Close history" : "Open history", children: _jsx(Button, { onClick: () => setHistoryDrawerOpen((o) => !o), color: historyDrawerOpen ? "primary" : "info", size: "small", startIcon: _jsx(HistoryIcon, {}), children: "History" }) })), canPreview && previewUrl && (_jsx(Button, { size: "small", href: previewUrl, target: "_blank", startIcon: _jsx(OpenInNewIcon, {}), children: "Preview" })), _jsx(Button, { variant: "contained", onClick: handleSave, disabled: isSaving || isLoading, children: isSaving ? "Saving..." : "Save" })] })] }), error && (_jsx(Alert, { ref: errorAlertRef, severity: "error", onClose: () => setError(null), sx: { mb: 2 }, tabIndex: -1, children: error })), _jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(TextField, { label: "Title", fullWidth: true, value: title, onChange: (e) => setTitle(e.target.value), onBlur: handleTitleBlur, sx: { mb: isSlugEditing ? 2 : "1px" } }), !isSlugEditing ? (_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: {
                                                            border: 1,
                                                            borderColor: "divider",
                                                            borderRadius: 1,
                                                            px: 1,
                                                            py: 0.5,
                                                            bgcolor: "background.default",
                                                        }, children: [_jsx(Typography, { variant: "body2", sx: { color: "text.secondary" }, children: "Slug:" }), _jsx(Tooltip, { title: slugPath || "No slug", children: _jsx(Typography, { variant: "body2", sx: {
                                                                        fontFamily: "monospace",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        maxWidth: { xs: "55vw", md: 360 },
                                                                        px: 0.5,
                                                                        py: 0.25,
                                                                        borderRadius: 0.75,
                                                                        bgcolor: "action.hover",
                                                                    }, children: slugPath || "—" }) }), _jsx(Box, { sx: { flex: 1 } }), _jsx(Tooltip, { title: slugPath ? "Copy slug" : "No slug to copy", children: _jsx("span", { children: _jsx(IconButton, { size: "small", onClick: handleCopySlug, disabled: !slugPath, "aria-label": "Copy slug", children: _jsx(ContentCopyIcon, { fontSize: "small" }) }) }) }), _jsx(Tooltip, { title: "Edit slug", children: _jsx(IconButton, { size: "small", onClick: handleStartSlugEdit, "aria-label": "Edit slug", children: _jsx(EditIcon, { fontSize: "small" }) }) })] })) : (_jsx(TextField, { label: "Slug", value: slug, onChange: (e) => {
                                                            slugManualRef.current = true;
                                                            setSlug(e.target.value);
                                                        }, size: "small", fullWidth: true, autoFocus: true, onBlur: handleSlugBlur, onKeyDown: handleSlugKeyDown, sx: { maxWidth: { xs: "100%", md: 520 } }, helperText: "Used in the URL path. Leading '/' is optional.", inputProps: {
                                                            style: { fontFamily: "monospace" },
                                                        } }))] }), _jsxs(Paper, { variant: "outlined", sx: { overflow: "hidden" }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: 1.5, sx: {
                                                            px: 2,
                                                            py: 1,
                                                            borderColor: "divider",
                                                            bgcolor: "action.hover",
                                                        }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", gap: 1.5, sx: { minWidth: 0, flexShrink: 0 }, children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Content" }), _jsxs(Select, { value: contentType, label: "Content", onChange: (e) => {
                                                                                    const next = e.target.value;
                                                                                    if (hasEditorContent && next !== contentType) {
                                                                                        setPendingContentType(next);
                                                                                    }
                                                                                    else {
                                                                                        setContentType(next);
                                                                                    }
                                                                                }, children: [_jsx(MenuItem, { value: "html", children: "HTML" }), _jsx(MenuItem, { value: "markdown", children: "Markdown" }), _jsx(MenuItem, { value: "json", children: "JSON" }), _jsx(MenuItem, { value: "text", children: "Text" })] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Locale" }), _jsx(Select, { value: locale, label: "Locale", onChange: (e) => setLocale(e.target.value), children: localeOptions.map((opt) => (_jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Post type" }), _jsx(Select, { value: postType, label: "Post type", onChange: (e) => setPostType(e.target.value), children: postTypeOpts.map((opt) => (_jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))) })] }), devMode && contentType === "html" && (_jsx(Tooltip, { title: "Dev only \u2014 switch WYSIWYG editor", placement: "top-end", children: _jsxs(FormControl, { size: "small", sx: {
                                                                                minWidth: 105,
                                                                                "& .MuiOutlinedInput-notchedOutline": {
                                                                                    borderColor: "warning.main",
                                                                                },
                                                                                "& .MuiInputLabel-root": {
                                                                                    color: "warning.main",
                                                                                },
                                                                            }, children: [_jsx(InputLabel, { children: "Editor" }), _jsxs(Select, { value: editorOverride, label: "Editor", onChange: (e) => handleEditorOverride(e.target.value), children: [_jsx(MenuItem, { value: "ckeditor", children: "CKEditor" }), _jsx(MenuItem, { value: "tinymce", children: "TinyMCE" })] })] }) }))] }), hasVisualMode && (_jsxs(ToggleButtonGroup, { value: editorMode, exclusive: true, onChange: (_, v) => {
                                                                    if (v) {
                                                                        setEditorMode(v);
                                                                    }
                                                                }, size: "small", sx: { ml: "auto" }, children: [_jsx(ToggleButton, { value: "visual", sx: {
                                                                            px: 1.5,
                                                                            py: 0.25,
                                                                            fontSize: "0.8rem",
                                                                            textTransform: "none",
                                                                        }, children: "Visual" }), _jsx(ToggleButton, { value: "text", sx: {
                                                                            px: 1.5,
                                                                            py: 0.25,
                                                                            fontSize: "0.8rem",
                                                                            textTransform: "none",
                                                                        }, children: "Text" })] }))] }), _jsx(CmsBodyEditor, { contentType: effectiveContentType, value: content, onChange: setContent, editor: editorOverride, onUploadImage: hasUploadHandler ? effectiveOnUploadImage : undefined, onPickAsset: config?.renderMediaPicker
                                                            ? async () => {
                                                                const result = await openMediaPicker();
                                                                if (!result) {
                                                                    return null;
                                                                }
                                                                // Build variant-aware URL if not already provided
                                                                const fmApi = config?.fmApi || contextFmApi;
                                                                let url = result.url;
                                                                if (!url) {
                                                                    url = config?.getContentUrl
                                                                        ? config.getContentUrl(result.uid, result.variantKind)
                                                                        : fmApi.getContentUrl({
                                                                            fileUid: result.uid,
                                                                            variantKind: result.variantKind,
                                                                            variantWidth: result.width,
                                                                        });
                                                                }
                                                                return { ...result, url };
                                                            }
                                                            : undefined }, `body-${contentType}-${editorMode}-${editorOverride}`)] }), _jsxs(Paper, { sx: { p: 2, mt: 2 }, children: [_jsx(TagsInput, { value: tags, onChange: setTags, label: "Tags", placeholder: "Add tag", size: "small" }), _jsx(Divider, { sx: { my: 2 } }), _jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "Password Protection" }), _jsx(TextField, { label: "Password (optional)", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: isNew ? "" : "(unchanged)", fullWidth: true, size: "small" })] }), _jsxs(Accordion, { sx: { mt: 2 }, children: [_jsxs(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: [_jsx(Typography, { children: "Advanced Options (JSON)" }), optionsParse.error && (_jsx(Chip, { label: "Invalid JSON", size: "small", color: "error", sx: { ml: 1 } }))] }), _jsx(AccordionDetails, { children: _jsx(CmsBodyEditor, { contentType: "json", value: optionsJson, onChange: setOptionsJson, height: 260 }) })] })] }), _jsxs(Box, { sx: { width: { xs: "100%", lg: 420 }, flexShrink: 0 }, children: [_jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "Status" }), _jsxs(Stack, { direction: "row", spacing: 1, sx: { mb: 1 }, children: [etag && (_jsx(Chip, { label: etag, size: "small", variant: "outlined" })), lockedBy && (_jsx(Chip, { label: `Locked by ${lockedBy}`, size: "small", icon: _jsx(LockIcon, { fontSize: "small" }), color: "warning" }))] }), !isNew && (_jsxs(Stack, { spacing: 0.75, sx: { mb: 1 }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [_jsx(Chip, { label: status === "published"
                                                                            ? "Published"
                                                                            : status === "trash"
                                                                                ? "Trash"
                                                                                : "Draft", size: "small", color: status === "published"
                                                                            ? "success"
                                                                            : status === "trash"
                                                                                ? "error"
                                                                                : "default", variant: status === "published" ? "filled" : "outlined" }), status === "published" && (_jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: publishedAtText }))] }), _jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", spacing: 1, children: [_jsxs(Typography, { variant: "body2", children: ["Revisions: ", revisionsCount] }), _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(HistoryIcon, { fontSize: "small" }), onClick: () => setHistoryDrawerOpen(true), disabled: historyDrawerOpen || revisionsCount === 0, children: "Browse" })] })] })), _jsx(Divider, { sx: { my: 1 } }), _jsxs(Stack, { spacing: 1, children: [!isNew && status !== "published" && status !== "trash" && (_jsx(Button, { variant: "contained", color: "success", fullWidth: true, onClick: handlePublish, disabled: isSaving, children: "Publish" })), !isNew && status !== "trash" && (_jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "outlined", color: "warning", fullWidth: true, onClick: handleTrash, disabled: isSaving, children: "Move to Trash" }), !lockedBy && (_jsx(Button, { variant: "outlined", startIcon: _jsx(LockIcon, {}), fullWidth: true, onClick: handleLock, disabled: isSaving, children: "Lock" })), lockedBy && (_jsx(Button, { variant: "outlined", startIcon: _jsx(LockOpenIcon, {}), fullWidth: true, onClick: handleUnlock, disabled: isSaving, children: "Unlock" }))] })), !isNew && status === "trash" && (_jsxs(_Fragment, { children: [_jsx(Button, { startIcon: _jsx(RestoreIcon, {}), fullWidth: true, onClick: handleRestore, disabled: isSaving, children: "Restore" }), _jsx(Button, { color: "error", startIcon: _jsx(DeleteForeverIcon, {}), fullWidth: true, onClick: handleDeletePermanently, disabled: isSaving, children: "Delete permanently" })] })), !isNew && status === "trash" && _jsx(Divider, {})] })] }), config?.renderMediaPicker && (_jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "Media & SEO" }), _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { minWidth: 100 }, children: "Featured image:" }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: featuredImageUid || "—" }), _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(AddIcon, { fontSize: "small" }), onClick: chooseFeaturedImage, children: "Choose" }), featuredImageUid && (_jsx(Button, { size: "small", color: "error", onClick: () => updateOptionsJson((o) => {
                                                                    delete o.featured_image_file_uid;
                                                                }), children: "Clear" }))] }), _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { minWidth: 100 }, children: "OG image:" }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: ogImageUid || "—" }), _jsx(Button, { size: "small", variant: "outlined", startIcon: _jsx(AddIcon, { fontSize: "small" }), onClick: chooseOgImage, children: "Choose" }), ogImageUid && (_jsx(Button, { size: "small", color: "error", onClick: () => updateOptionsJson((o) => {
                                                                    if (o.seo) {
                                                                        delete o.seo.og_image_file_uid;
                                                                    }
                                                                }), children: "Clear" }))] }), _jsx(Divider, { sx: { my: 1 } }), _jsx(Typography, { variant: "caption", sx: { mb: 0.5, display: "block" }, children: "Attachments" }), attachments.map((att, idx) => (_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 0.5 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: att.file_uid }), _jsx(IconButton, { size: "small", onClick: () => removeAttachment(idx), children: _jsx(DeleteIcon, { fontSize: "small" }) })] }, idx))), _jsx(Button, { size: "small", startIcon: _jsx(AddIcon, {}), onClick: addAttachment, children: "Add attachment" })] }))] })] })] })] }), isLoading && (_jsx(Box, { sx: {
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(0,0,0,0.2)",
                    zIndex: 1200,
                }, children: _jsx(Paper, { sx: { p: 3 }, children: _jsx(Typography, { children: "Loading..." }) }) })), _jsx(CmsConflictDialog, { open: conflictOpen, onCancel: () => setConflictOpen(false), onReload: () => {
                    setConflictOpen(false);
                    void load();
                }, onOverwrite: handleConflictOverwrite }), _jsxs(Dialog, { open: !!pendingContentType, onClose: () => setPendingContentType(null), children: [_jsx(DialogTitle, { children: "Change content type?" }), _jsx(DialogContent, { children: _jsx(DialogContentText, { children: "The editor already has content. Choosing the wrong content type may affect how it is displayed or cause formatting issues." }) }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: () => setPendingContentType(null), color: "inherit", children: "Cancel" }), _jsx(Button, { variant: "contained", onClick: () => {
                                    if (pendingContentType) {
                                        setContentType(pendingContentType);
                                    }
                                    setPendingContentType(null);
                                }, children: "Change" })] })] }), pickerOpen &&
                config?.renderMediaPicker?.({
                    open: pickerOpen,
                    onSelect: handleMediaPickerSelect,
                    onClose: handleMediaPickerClose,
                })] }));
};
export default CmsEditPage;
