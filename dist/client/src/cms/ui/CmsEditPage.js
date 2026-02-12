import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, Chip, Container, Divider, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Paper, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography, } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { CmsClient } from "../CmsClient.js";
import { defaultToast } from "./CmsAdminUiConfig.js";
import CmsConflictDialog from "./CmsConflictDialog.js";
import CmsBodyEditor, { contentTypeToMime, mimeToContentType, } from "./CmsBodyEditor.js";
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
    const [tagsCsv, setTagsCsv] = useState("");
    const [optionsJson, setOptionsJson] = useState("{}");
    const [password, setPassword] = useState("");
    const [includeSoftDeletedHistory, setIncludeSoftDeletedHistory] = useState(false);
    const [editorMode, setEditorMode] = useState("visual");
    // ── UI state ──────────────────────────────────────────────────────────
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);
    const [conflictOpen, setConflictOpen] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [liveMessage, setLiveMessage] = useState("");
    const [liveErrorMessage, setLiveErrorMessage] = useState("");
    // ── Refs ──────────────────────────────────────────────────────────────
    const errorAlertRef = useRef(null);
    const conflictRef = useRef(null);
    const pickerResolveRef = useRef(null);
    // ── Derived ───────────────────────────────────────────────────────────
    const etag = row?.etag;
    const status = row?.status;
    const lockedBy = row?.locked_by;
    const optionsParse = useMemo(() => safeJsonParse(optionsJson), [optionsJson]);
    const canPreview = useMemo(() => !isNew &&
        status === "published" &&
        !!postType &&
        !!locale &&
        !!slug &&
        !!config?.getContentUrl, [isNew, status, postType, locale, slug, config?.getContentUrl]);
    const postTypeOpts = useMemo(() => config?.postTypeOptions ?? [
        { value: "page", label: "Page" },
        { value: "post", label: "Post" },
    ], [config?.postTypeOptions]);
    const hasVisualMode = contentType === "html" || contentType === "markdown";
    const effectiveContentType = hasVisualMode && editorMode === "text" ? "text" : contentType;
    // Reset to visual mode when content type changes
    useEffect(() => {
        setEditorMode("visual");
    }, [contentType]);
    // ── ARIA helpers ──────────────────────────────────────────────────────
    const announce = useCallback((msg) => {
        setLiveMessage(msg);
        setTimeout(() => setLiveMessage(""), 4000);
    }, []);
    const announceErr = useCallback((msg) => {
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
            const item = await api.adminGet(propUid);
            setRow(item);
            setTitle(item.title || "");
            setSlug(item.slug || "");
            setLocale(item.locale || defaultLocale);
            setPostType(item.post_type || defaultPostType);
            setContentType(mimeToContentType(item.content_type || "text/html"));
            setContent(item.content || "<p></p>");
            setTagsCsv(Array.isArray(item.tags) ? item.tags.join(", ") : "");
            setOptionsJson(item.options
                ? JSON.stringify(item.options, null, 2)
                : "{}");
            setPassword("");
            // Load history
            try {
                const hist = await api.adminListHistory(propUid, {
                    limit: 50,
                });
                setHistory(hist.items ?? hist ?? []);
            }
            catch {
                /* non-critical */
            }
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
    return (_jsxs(Container, { maxWidth: "xl", sx: { py: 3 }, children: [_jsx(Box, { "aria-live": "polite", "aria-atomic": "true", sx: { position: "absolute", left: -9999 }, children: liveMessage }), _jsx(Box, { "aria-live": "assertive", "aria-atomic": "true", sx: { position: "absolute", left: -9999 }, children: liveErrorMessage }), _jsxs(Stack, { direction: { xs: "column", lg: "row" }, spacing: 3, children: [_jsxs(Box, { sx: { flex: 1, minWidth: 0 }, children: [_jsxs(Stack, { direction: "row", justifyContent: "space-between", alignItems: "center", sx: { mb: 2 }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [_jsx(Tooltip, { title: "Back to list", children: _jsx(IconButton, { onClick: () => nav?.goToList?.(), children: _jsx(ArrowBackIcon, {}) }) }), _jsx(Typography, { variant: "h5", children: isNew ? "New CMS Item" : "Edit CMS Item" })] }), _jsxs(Stack, { direction: "row", spacing: 1, children: [canPreview && previewUrl && (_jsx(Button, { size: "small", href: previewUrl, target: "_blank", startIcon: _jsx(OpenInNewIcon, {}), children: "Preview" })), _jsx(Button, { variant: "contained", onClick: handleSave, disabled: isSaving, children: isSaving ? "Saving..." : "Save" })] })] }), error && (_jsx(Alert, { ref: errorAlertRef, severity: "error", onClose: () => setError(null), sx: { mb: 2 }, tabIndex: -1, children: error })), _jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(TextField, { label: "Title", fullWidth: true, value: title, onChange: (e) => setTitle(e.target.value), onBlur: handleTitleBlur, sx: { mb: 2 } }), _jsxs(Stack, { direction: { xs: "column", sm: "row" }, spacing: 2, children: [_jsx(TextField, { label: "Slug", value: slug, onChange: (e) => setSlug(e.target.value), sx: { flex: 1 } }), _jsx(TextField, { label: "Tags (comma-separated)", value: tagsCsv, onChange: (e) => setTagsCsv(e.target.value), sx: { flex: 1 } }), _jsx(TextField, { label: "Password (optional)", type: "password", value: password, onChange: (e) => setPassword(e.target.value), placeholder: isNew ? "" : "(unchanged)", sx: { flex: 1 } })] })] }), _jsxs(Paper, { variant: "outlined", sx: { overflow: "hidden" }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "nowrap", gap: 1.5, sx: {
                                            px: 2,
                                            py: 1,
                                            borderBottom: 1,
                                            borderColor: "divider",
                                            bgcolor: "action.hover",
                                        }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", gap: 1.5, sx: { minWidth: 0, flexShrink: 0 }, children: [_jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Content" }), _jsxs(Select, { value: contentType, label: "Content", onChange: (e) => setContentType(e.target.value), children: [_jsx(MenuItem, { value: "html", children: "HTML" }), _jsx(MenuItem, { value: "markdown", children: "Markdown" }), _jsx(MenuItem, { value: "json", children: "JSON" }), _jsx(MenuItem, { value: "text", children: "Text" })] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Locale" }), _jsx(Select, { value: locale, label: "Locale", onChange: (e) => setLocale(e.target.value), children: localeOptions.map((opt) => (_jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))) })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 110 }, children: [_jsx(InputLabel, { children: "Post type" }), _jsx(Select, { value: postType, label: "Post type", onChange: (e) => setPostType(e.target.value), children: postTypeOpts.map((opt) => (_jsx(MenuItem, { value: opt.value, children: opt.label }, opt.value))) })] })] }), hasVisualMode && (_jsxs(Tabs, { value: editorMode, onChange: (_, v) => setEditorMode(v), sx: {
                                                    minHeight: 32,
                                                    "& .MuiTab-root": {
                                                        minHeight: 32,
                                                        py: 0.5,
                                                        px: 1.5,
                                                        fontSize: "0.8rem",
                                                        textTransform: "none",
                                                    },
                                                }, children: [_jsx(Tab, { label: "Visual", value: "visual" }), _jsx(Tab, { label: "Text", value: "text" })] }))] }), _jsx(CmsBodyEditor, { contentType: effectiveContentType, value: content, onChange: setContent, editor: config?.editorPreference, onPickAsset: config?.renderMediaPicker ? () => openMediaPicker() : undefined }, `body-${contentType}-${editorMode}`)] }), _jsxs(Accordion, { sx: { mt: 2 }, children: [_jsxs(AccordionSummary, { expandIcon: _jsx(ExpandMoreIcon, {}), children: [_jsx(Typography, { children: "Advanced Options (JSON)" }), optionsParse.error && (_jsx(Chip, { label: "Invalid JSON", size: "small", color: "error", sx: { ml: 1 } }))] }), _jsx(AccordionDetails, { children: _jsx(CmsBodyEditor, { contentType: "json", value: optionsJson, onChange: setOptionsJson, height: 260 }) })] })] }), _jsxs(Box, { sx: { width: { xs: "100%", lg: 420 }, flexShrink: 0 }, children: [_jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "Status" }), _jsxs(Stack, { direction: "row", spacing: 1, sx: { mb: 1 }, children: [status && (_jsx(Chip, { label: status, size: "small", color: getStatusChipColor(status) })), etag && _jsx(Chip, { label: etag, size: "small", variant: "outlined" }), lockedBy && (_jsx(Chip, { label: `Locked by ${lockedBy}`, size: "small", icon: _jsx(LockIcon, { fontSize: "small" }), color: "warning" }))] }), _jsx(Divider, { sx: { my: 1 } }), _jsxs(Stack, { spacing: 1, children: [!isNew && status !== "published" && status !== "trash" && (_jsx(Button, { variant: "contained", color: "success", fullWidth: true, onClick: handlePublish, disabled: isSaving, children: "Publish" })), !isNew && status !== "trash" && (_jsx(Button, { color: "warning", fullWidth: true, onClick: handleTrash, disabled: isSaving, children: "Move to Trash" })), !isNew && status === "trash" && (_jsxs(_Fragment, { children: [_jsx(Button, { startIcon: _jsx(RestoreIcon, {}), fullWidth: true, onClick: handleRestore, disabled: isSaving, children: "Restore" }), _jsx(Button, { color: "error", startIcon: _jsx(DeleteForeverIcon, {}), fullWidth: true, onClick: handleDeletePermanently, disabled: isSaving, children: "Delete permanently" })] })), !isNew && _jsx(Divider, {}), !isNew && !lockedBy && (_jsx(Button, { size: "small", startIcon: _jsx(LockIcon, {}), onClick: handleLock, children: "Lock" })), !isNew && lockedBy && (_jsx(Button, { size: "small", startIcon: _jsx(LockOpenIcon, {}), onClick: handleUnlock, children: "Unlock" }))] })] }), config?.renderMediaPicker && (_jsxs(Paper, { sx: { p: 2, mb: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "Media & SEO" }), _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { minWidth: 100 }, children: "Featured image:" }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: featuredImageUid || "—" }), _jsx(Button, { size: "small", onClick: chooseFeaturedImage, children: "Choose" }), featuredImageUid && (_jsx(Button, { size: "small", color: "error", onClick: () => updateOptionsJson((o) => {
                                                    delete o.featured_image_file_uid;
                                                }), children: "Clear" }))] }), _jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 1 }, children: [_jsx(Typography, { variant: "caption", sx: { minWidth: 100 }, children: "OG image:" }), _jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: ogImageUid || "—" }), _jsx(Button, { size: "small", onClick: chooseOgImage, children: "Choose" }), ogImageUid && (_jsx(Button, { size: "small", color: "error", onClick: () => updateOptionsJson((o) => {
                                                    if (o.seo) {
                                                        delete o.seo.og_image_file_uid;
                                                    }
                                                }), children: "Clear" }))] }), _jsx(Divider, { sx: { my: 1 } }), _jsx(Typography, { variant: "caption", sx: { mb: 0.5, display: "block" }, children: "Attachments" }), attachments.map((att, idx) => (_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { mb: 0.5 }, children: [_jsx(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { flex: 1 }, children: att.file_uid }), _jsx(IconButton, { size: "small", onClick: () => removeAttachment(idx), children: _jsx(DeleteIcon, { fontSize: "small" }) })] }, idx))), _jsx(Button, { size: "small", startIcon: _jsx(AddIcon, {}), onClick: addAttachment, children: "Add attachment" })] })), !isNew && (_jsxs(Paper, { sx: { p: 2 }, children: [_jsx(Typography, { variant: "subtitle2", sx: { mb: 1 }, children: "History" }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { size: "small", checked: includeSoftDeletedHistory, onChange: (_, v) => setIncludeSoftDeletedHistory(v) }), label: _jsx(Typography, { variant: "caption", children: "Show deleted revisions" }), sx: { mb: 1 } }), history.length === 0 && (_jsx(Typography, { variant: "caption", color: "text.secondary", children: "No revision history" })), history.map((h) => (_jsxs(Stack, { direction: "row", alignItems: "center", sx: {
                                            py: 0.5,
                                            borderBottom: 1,
                                            borderColor: "divider",
                                        }, children: [_jsxs(Stack, { direction: "row", spacing: 0.5, sx: { flex: 1, minWidth: 0 }, children: [_jsx(Chip, { label: `Rev ${h.version ?? h.id}`, size: "small", variant: "outlined" }), h.is_deleted && (_jsx(Chip, { label: "deleted", size: "small", color: "error", variant: "outlined" })), _jsx(Typography, { variant: "caption", color: "text.secondary", sx: { alignSelf: "center" }, children: h.created_at
                                                            ? new Date(h.created_at).toLocaleString()
                                                            : "—" })] }), _jsx(Tooltip, { title: "Restore this revision", children: _jsx(IconButton, { size: "small", onClick: () => handleRestoreRevision(h.id), children: _jsx(RestoreIcon, { fontSize: "small" }) }) }), !h.is_deleted ? (_jsx(Tooltip, { title: "Soft-delete revision", children: _jsx(IconButton, { size: "small", onClick: () => handleSoftDeleteRevision(h.id), children: _jsx(DeleteIcon, { fontSize: "small" }) }) })) : (_jsx(Tooltip, { title: "Permanently delete revision", children: _jsx(IconButton, { size: "small", color: "error", onClick: () => handleHardDeleteRevision(h.id), children: _jsx(DeleteForeverIcon, { fontSize: "small" }) }) }))] }, h.id)))] }))] })] }), isLoading && (_jsx(Box, { sx: {
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
                }, onOverwrite: handleConflictOverwrite }), pickerOpen &&
                config?.renderMediaPicker?.({
                    open: pickerOpen,
                    onSelect: handleMediaPickerSelect,
                    onClose: handleMediaPickerClose,
                })] }));
};
export default CmsEditPage;
