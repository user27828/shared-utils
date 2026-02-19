import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * FmMediaLibrary — Full-featured media library UI component.
 *
 * Moved from @user27828/db-supabase to @user27828/shared-utils as part
 * of the FM split. All API calls go through the `FmApi` interface,
 * which can be provided via:
 *   1. `api` prop (explicit DI)
 *   2. `<FmClientProvider>` context
 *   3. Module-level default `FmClient()` fallback
 *
 * @module @user27828/shared-utils/fm/client
 */
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { useDebouncedValue } from "../../helpers/debounce.js";
import { Alert, Box, Button, ButtonGroup, Checkbox, Chip, ClickAwayListener, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, FormControl, FormControlLabel, Grow, IconButton, InputLabel, LinearProgress, MenuItem, MenuList, Paper, Popper, Select, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme, } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import ViewListIcon from "@mui/icons-material/ViewList";
import GridViewIcon from "@mui/icons-material/GridView";
import PictureInPictureAltIcon from "@mui/icons-material/PictureInPictureAlt";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CopyButton from "../../components/CopyButton.js";
import { useFmApi } from "../FmClientProvider.js";
import { useFmListFiles } from "../hooks/useFmListFiles.js";
import { DEFAULT_VARIANT_WIDTHS, generateImageVariants, } from "../utils/imageVariants.js";
import { FmVideoViewer } from "./FmVideoViewer.js";
import { FmImageViewer } from "./FmImageViewer.js";
import { TagsInput } from "../../components/form/TagsInput.js";
// ─── Helpers ────────────────────────────────────────────────────────────────
const formatBytes = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) {
        return "";
    }
    if (v < 1024) {
        return `${v} B`;
    }
    const kb = v / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
};
/** Format an ISO date string to local YYYY/MM/DD HH:MM. */
const formatCreatedAt = (iso) => {
    if (!iso) {
        return "\u2014";
    }
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) {
            return "\u2014";
        }
        const y = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const h = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");
        return `${y}/${mo}/${day} ${h}:${min}`;
    }
    catch {
        return "\u2014";
    }
};
const PAGE_SIZES = [10, 25, 50, 100];
// ─── LocalStorage persistence ───────────────────────────────────────────────
const FM_SETTINGS_KEY = "fm-media-library-settings";
const FM_SETTINGS_DEFAULTS = {
    viewMode: "list",
    previewMode: "thumbnails",
    sortBy: "created_at",
    sortOrder: "desc",
    publicFilter: "all",
    pageSize: 25,
};
const VALID_VIEW_MODES = new Set(["list", "grid"]);
const VALID_PREVIEW_MODES = new Set(["thumbnails", "icons"]);
const VALID_SORT_BY = new Set([
    "created_at",
    "updated_at",
    "byte_size",
    "original_filename",
    "title",
]);
const VALID_SORT_ORDER = new Set(["asc", "desc"]);
const VALID_PUBLIC_FILTER = new Set(["all", "public", "private"]);
/** Load persisted FM view settings from localStorage with validation. */
const loadFmSettings = () => {
    if (typeof window === "undefined") {
        return { ...FM_SETTINGS_DEFAULTS };
    }
    try {
        const raw = window.localStorage.getItem(FM_SETTINGS_KEY);
        if (!raw) {
            return { ...FM_SETTINGS_DEFAULTS };
        }
        const p = JSON.parse(raw);
        return {
            viewMode: VALID_VIEW_MODES.has(p.viewMode)
                ? p.viewMode
                : FM_SETTINGS_DEFAULTS.viewMode,
            previewMode: VALID_PREVIEW_MODES.has(p.previewMode)
                ? p.previewMode
                : FM_SETTINGS_DEFAULTS.previewMode,
            sortBy: VALID_SORT_BY.has(p.sortBy)
                ? p.sortBy
                : FM_SETTINGS_DEFAULTS.sortBy,
            sortOrder: VALID_SORT_ORDER.has(p.sortOrder)
                ? p.sortOrder
                : FM_SETTINGS_DEFAULTS.sortOrder,
            publicFilter: VALID_PUBLIC_FILTER.has(p.publicFilter)
                ? p.publicFilter
                : FM_SETTINGS_DEFAULTS.publicFilter,
            pageSize: typeof p.pageSize === "number" && p.pageSize > 0 && p.pageSize <= 200
                ? p.pageSize
                : FM_SETTINGS_DEFAULTS.pageSize,
        };
    }
    catch {
        return { ...FM_SETTINGS_DEFAULTS };
    }
};
/** Persist FM view settings to localStorage (merge with existing). */
const saveFmSettings = (settings) => {
    if (typeof window === "undefined") {
        return;
    }
    try {
        const current = loadFmSettings();
        const merged = { ...current, ...settings };
        window.localStorage.setItem(FM_SETTINGS_KEY, JSON.stringify(merged));
    }
    catch {
        // localStorage unavailable or full — ignore silently
    }
};
const clampPct = (pct) => {
    if (!Number.isFinite(pct)) {
        return 0;
    }
    return Math.max(0, Math.min(100, Math.round(pct)));
};
const scalePct = (pct0to100, start, end) => {
    const pct = clampPct(pct0to100);
    const span = Math.max(0, end - start);
    return clampPct(start + Math.round((pct / 100) * span));
};
const formatUploadStatus = (u) => {
    switch (u.status) {
        case "queued":
            return "Queued";
        case "init":
            return "Preparing";
        case "uploading":
            return "Uploading";
        case "finalizing":
            return "Finalizing";
        case "processing_variants":
            return "Processing image variants";
        case "uploading_variants":
            return "Uploading variants";
        case "done":
            return u.error ? "Uploaded (with warnings)" : "Uploaded";
        case "error":
            return "Error";
        default:
            return u.status;
    }
};
const isImageMime = (mime) => {
    const m = (mime || "").toLowerCase();
    return m.startsWith("image/");
};
const isVideoMime = (mime) => {
    const m = (mime || "").toLowerCase();
    return m.startsWith("video/");
};
const isSupportedVideoMime = (mime) => {
    const m = (mime || "").toLowerCase();
    return m === "video/mp4" || m === "video/webm" || m === "video/ogg";
};
const safeTrim = (v) => {
    if (v === null || v === undefined) {
        return "";
    }
    return String(v).trim();
};
/** Convert null/undefined to empty string without trimming (preserves user input). */
const safeStr = (v) => {
    if (v === null || v === undefined) {
        return "";
    }
    return String(v);
};
const getExtLower = (filename) => {
    const s = String(filename || "").trim();
    const base = s.split("/").pop() || s;
    const dot = base.lastIndexOf(".");
    if (dot <= 0 || dot === base.length - 1) {
        return "";
    }
    return base.slice(dot + 1).toLowerCase();
};
const parseTagsCsv = (csv) => {
    const MAX_TAGS = 20;
    const MAX_LEN = 40;
    const parts = (csv || "").split(",");
    const out = [];
    const seen = new Set();
    for (const p of parts) {
        const s = p.trim();
        if (!s) {
            continue;
        }
        const t = s.slice(0, MAX_LEN).toLowerCase();
        if (!t) {
            continue;
        }
        if (seen.has(t)) {
            continue;
        }
        seen.add(t);
        out.push(t);
        if (out.length >= MAX_TAGS) {
            break;
        }
    }
    return out;
};
const formatTagsCsv = (tags) => {
    if (!tags || !tags.length) {
        return "";
    }
    return tags.join(", ");
};
const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
};
const getFileLabel = (f) => {
    const name = safeTrim(f.original_filename);
    if (name) {
        return name;
    }
    return f.uid;
};
const guessIconLabel = (f) => {
    const mime = (f.mime_type || "").toLowerCase();
    if (mime.startsWith("image/")) {
        return "IMG";
    }
    if (mime.startsWith("video/")) {
        return "VID";
    }
    if (mime.includes("pdf")) {
        return "PDF";
    }
    if (mime.includes("word") || mime.includes("officedocument")) {
        return "DOC";
    }
    return "FILE";
};
/**
 * For files without a preview, extract a short uppercase extension label
 * (e.g. "PDF", "DOCX") from the filename. Falls back to guessIconLabel.
 */
const getFileExtLabel = (f) => {
    const ext = getExtLower(f.original_filename || f.uid);
    if (ext) {
        return ext.toUpperCase();
    }
    return guessIconLabel(f);
};
const uploadWithXhr = async (input) => {
    await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(input.method, input.url, true);
        if (input.withCredentials) {
            xhr.withCredentials = true;
        }
        if (input.headers) {
            for (const [k, v] of Object.entries(input.headers)) {
                xhr.setRequestHeader(k, v);
            }
        }
        xhr.upload.onprogress = (evt) => {
            if (!evt.lengthComputable) {
                return;
            }
            if (input.onProgress) {
                const pct = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
                input.onProgress(pct);
            }
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onabort = () => reject(new Error("Upload aborted"));
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
            }
            reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.send(input.body);
    });
};
// ─── Main Component ─────────────────────────────────────────────────────────
/**
 * Full-featured media library UI component.
 *
 * Supports file listing, search, upload with variant generation,
 * metadata editing, archiving, deletion, and multi-select bulk actions.
 */
export const FmMediaLibrary = (props) => {
    const theme = useTheme();
    const contextApi = useFmApi();
    const api = props.api || contextApi;
    // Load persisted settings once on mount.
    const [storedSettings] = useState(() => loadFmSettings());
    const [search, setSearch] = useState(props.initialSearch || "");
    const [offset, setOffset] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(props.pageSize ?? storedSettings.pageSize);
    const limit = itemsPerPage;
    const enableUpload = props.enableUpload !== false;
    const enableBulkActions = props.enableBulkActions !== false && !props.onSelect;
    const [viewMode, setViewMode] = useState(storedSettings.viewMode);
    const [previewMode, setPreviewMode] = useState(storedSettings.previewMode);
    const [publicFilter, setPublicFilter] = useState(storedSettings.publicFilter);
    const [includeArchived, setIncludeArchived] = useState(Boolean(props.includeArchived));
    const [sortBy, setSortBy] = useState(storedSettings.sortBy);
    const [sortOrder, setSortOrder] = useState(storedSettings.sortOrder);
    const [selectedUids, setSelectedUids] = useState(() => new Set());
    const [activeUid, setActiveUid] = useState(null);
    const [activeFile, setActiveFile] = useState(null);
    const [activeUrl, setActiveUrl] = useState(null);
    const [activeUrlKind, setActiveUrlKind] = useState(null);
    const [activeError, setActiveError] = useState(null);
    const [activeLoading, setActiveLoading] = useState(false);
    const activeIsLocalStorage = String(activeFile?.storage_location || "")
        .trim()
        .toLowerCase() === "local";
    const [tagsText, setTagsText] = useState("");
    /** Tags as an array for the TagsInput component (detail drawer). */
    const [fmTags, setFmTags] = useState([]);
    const [renamingUid, setRenamingUid] = useState(null);
    const [renameText, setRenameText] = useState("");
    const [detailIsRenaming, setDetailIsRenaming] = useState(false);
    const [detailRenameText, setDetailRenameText] = useState("");
    const [renameSubmittingUid, setRenameSubmittingUid] = useState(null);
    const [renameSuccessMessage, setRenameSuccessMessage] = useState(null);
    const [linksData, setLinksData] = useState(null);
    const [linksError, setLinksError] = useState(null);
    const [linksLoading, setLinksLoading] = useState(false);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploadItems, setUploadItems] = useState([]);
    const thumbUrlCacheRef = useRef(new Map());
    const [thumbTick, setThumbTick] = useState(0);
    /** File currently being shown in the expanded video viewer. */
    const [expandedVideoFile, setExpandedVideoFile] = useState(null);
    /** File currently being shown in the expanded image viewer. */
    const [expandedImageFile, setExpandedImageFile] = useState(null);
    // Debounce search to avoid firing an API request on every keystroke.
    const [debouncedSearch] = useDebouncedValue(search, { wait: 300 });
    // Reset pagination when debounced search changes.
    useEffect(() => {
        setOffset(0);
    }, [debouncedSearch]);
    // Reset selection when query changes.
    useEffect(() => {
        setSelectedUids(new Set());
    }, [debouncedSearch, includeArchived, publicFilter, sortBy, sortOrder]);
    // Persist view settings to localStorage whenever they change.
    useEffect(() => {
        saveFmSettings({
            viewMode,
            previewMode,
            sortBy,
            sortOrder,
            publicFilter,
            pageSize: itemsPerPage,
        });
    }, [viewMode, previewMode, sortBy, sortOrder, publicFilter, itemsPerPage]);
    /** Handle clickable column-header sorting. */
    const handleSortClick = (column) => {
        if (sortBy === column) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        }
        else {
            setSortBy(column);
            // Default: ascending for filename, descending for date/size.
            setSortOrder(column === "original_filename" ? "asc" : "desc");
        }
    };
    const { items, totalCount, isLoading, error, reload } = useFmListFiles({
        search: debouncedSearch.trim() || undefined,
        limit,
        offset,
        includeArchived,
        isPublic: publicFilter === "all"
            ? undefined
            : publicFilter === "public"
                ? true
                : false,
        orderBy: sortBy,
        orderDirection: sortOrder,
        // In picker mode, include variants so the size-select dropdown
        // works without extra per-file API calls.
        includeVariants: Boolean(props.onSelect),
        api,
    });
    const selectedUid = props.selectedFileUid || null;
    const handleDeleteInline = async (f) => {
        const label = getFileLabel(f);
        const ok = window.confirm(`Delete this file?\n\n${label}\n${f.uid}\n\nThis action cannot be undone.`);
        if (!ok) {
            return;
        }
        try {
            await api.deleteFile({ fileUid: f.uid, force: true });
            await reload();
        }
        catch (err) {
            window.alert(`Delete failed: ${err?.message || err}`);
        }
    };
    const pageInfo = useMemo(() => {
        const start = totalCount === 0 ? 0 : offset + 1;
        const end = Math.min(offset + limit, totalCount);
        return { start, end, totalCount };
    }, [offset, limit, totalCount]);
    const openDetail = (uid) => {
        setActiveUid(uid);
    };
    const closeDetail = () => {
        setActiveUid(null);
        setActiveFile(null);
        setActiveUrl(null);
        setActiveUrlKind(null);
        setActiveError(null);
        setLinksData(null);
        setLinksError(null);
        setDetailIsRenaming(false);
        setDetailRenameText("");
    };
    const cancelInlineRename = useCallback(() => {
        setRenamingUid(null);
        setRenameText("");
    }, []);
    const cancelDetailRename = useCallback(() => {
        setDetailIsRenaming(false);
        setDetailRenameText("");
    }, []);
    const requestRenameConfirmIfNeeded = useCallback(async (params) => {
        const prevExt = getExtLower(params.previous);
        const nextExt = getExtLower(params.next);
        if (!prevExt || !nextExt || prevExt === nextExt) {
            return true;
        }
        if (typeof window === "undefined") {
            return true;
        }
        return window.confirm(`You changed the filename extension from .${prevExt} to .${nextExt}.\n\nChanging extensions can be misleading and may cause the file to open incorrectly.\n\nContinue?`);
    }, []);
    const loadDetail = useCallback(async () => {
        if (!activeUid) {
            return;
        }
        setActiveLoading(true);
        setActiveError(null);
        setActiveFile(null);
        setActiveUrl(null);
        setActiveUrlKind(null);
        try {
            const f = await api.getFile(activeUid);
            setActiveFile(f);
            // Keep detail rename draft in sync with the currently loaded file.
            setDetailRenameText(String(f.original_filename || "").trim());
            setActiveUrl(api.getContentUrl({
                fileUid: activeUid,
                variantKind: isImageMime(f.mime_type) ? "web" : undefined,
            }));
            setActiveUrlKind("canonical");
        }
        catch (e) {
            setActiveError(e?.message || "Failed to load file");
        }
        finally {
            setActiveLoading(false);
        }
    }, [activeUid, api]);
    const submitRename = useCallback(async (params) => {
        if (renameSubmittingUid) {
            return;
        }
        const next = String(params.nextName || "").trim();
        if (!next) {
            if (params.source === "detail") {
                setActiveError("Filename is required");
            }
            else {
                window.alert("Filename is required");
            }
            return;
        }
        const ok = await requestRenameConfirmIfNeeded({
            previous: params.previousName,
            next,
        });
        if (!ok) {
            return;
        }
        try {
            setRenameSubmittingUid(params.fileUid);
            const updated = await api.renameFile({
                fileUid: params.fileUid,
                originalFilename: next,
            });
            if (params.source === "detail") {
                setActiveFile((prev) => {
                    if (!prev) {
                        return prev;
                    }
                    return { ...prev, ...updated };
                });
                setDetailIsRenaming(false);
                setDetailRenameText("");
                await reload();
                await loadDetail();
            }
            else {
                cancelInlineRename();
                await reload();
                if (activeUid && activeUid === params.fileUid) {
                    await loadDetail();
                }
            }
            setRenameSuccessMessage(`Renamed to \"${next}\"`);
        }
        catch (e) {
            if (params.source === "detail") {
                setActiveError(e?.message || "Rename failed");
            }
            else {
                window.alert(`Rename failed: ${e?.message || e}`);
            }
        }
        finally {
            setRenameSubmittingUid((current) => {
                if (current === params.fileUid) {
                    return null;
                }
                return current;
            });
        }
    }, [
        api,
        reload,
        loadDetail,
        activeUid,
        renameSubmittingUid,
        requestRenameConfirmIfNeeded,
        cancelInlineRename,
    ]);
    useEffect(() => {
        void loadDetail();
    }, [loadDetail]);
    useEffect(() => {
        if (!activeFile) {
            setTagsText("");
            setFmTags([]);
            return;
        }
        setTagsText(formatTagsCsv(activeFile.tags));
        setFmTags(Array.isArray(activeFile.tags) ? [...activeFile.tags] : []);
    }, [activeFile?.uid]);
    useEffect(() => {
        if (!activeUid) {
            return;
        }
        // Changing active file cancels any in-progress rename.
        setDetailIsRenaming(false);
    }, [activeUid]);
    const loadLinks = useCallback(async () => {
        if (!activeUid) {
            return;
        }
        setLinksLoading(true);
        setLinksError(null);
        try {
            const data = await api.listLinks({
                fileUid: activeUid,
                limit: 100,
                offset: 0,
            });
            setLinksData({ items: data.items, totalCount: data.totalCount });
        }
        catch (e) {
            setLinksError(e?.message || "Failed to load links");
            setLinksData(null);
        }
        finally {
            setLinksLoading(false);
        }
    }, [activeUid, api]);
    useEffect(() => {
        if (!activeUid) {
            return;
        }
        void loadLinks();
    }, [activeUid, loadLinks]);
    const toggleSelected = (uid) => {
        setSelectedUids((prev) => {
            const next = new Set(prev);
            if (next.has(uid)) {
                next.delete(uid);
            }
            else {
                next.add(uid);
            }
            return next;
        });
    };
    const setAllSelected = (checked) => {
        if (!checked) {
            setSelectedUids(new Set());
            return;
        }
        const next = new Set();
        for (const f of items) {
            next.add(f.uid);
        }
        setSelectedUids(next);
    };
    const bulkArchive = async () => {
        const uids = Array.from(selectedUids);
        if (!uids.length) {
            return;
        }
        const ok = typeof window !== "undefined"
            ? window.confirm(`Archive ${uids.length} file(s)?`)
            : true;
        if (!ok) {
            return;
        }
        for (const uid of uids) {
            await api.archiveFile(uid);
        }
        await reload();
        setSelectedUids(new Set());
    };
    const bulkRestore = async () => {
        const uids = Array.from(selectedUids);
        if (!uids.length) {
            return;
        }
        const ok = typeof window !== "undefined"
            ? window.confirm(`Restore ${uids.length} file(s)?`)
            : true;
        if (!ok) {
            return;
        }
        for (const uid of uids) {
            await api.restoreFile(uid);
        }
        await reload();
        setSelectedUids(new Set());
    };
    const bulkDelete = async () => {
        const uids = Array.from(selectedUids);
        if (!uids.length) {
            return;
        }
        const ok = typeof window !== "undefined"
            ? window.confirm(`Hard-delete ${uids.length} file(s)?\n\nIf a file is linked, the server may archive it instead unless force-delete is allowed.`)
            : true;
        if (!ok) {
            return;
        }
        for (const uid of uids) {
            await api.deleteFile({ fileUid: uid, force: true });
        }
        await reload();
        setSelectedUids(new Set());
    };
    const bulkMove = async () => {
        const uids = Array.from(selectedUids);
        if (!uids.length) {
            return;
        }
        const toBucketRaw = typeof window !== "undefined"
            ? window.prompt("Move to bucket (optional):", "")
            : "";
        if (toBucketRaw === null) {
            return;
        }
        const toFolderRaw = typeof window !== "undefined"
            ? window.prompt("Move to folder path / prefix (optional):", "")
            : "";
        if (toFolderRaw === null) {
            return;
        }
        const toBucket = safeTrim(toBucketRaw) || undefined;
        const toFolderPath = safeTrim(toFolderRaw) || undefined;
        const ok = typeof window !== "undefined"
            ? window.confirm(`Move ${uids.length} file(s)?\n\nBucket: ${toBucket || "(unchanged)"}\nFolder: ${toFolderPath || "(unchanged)"}`)
            : true;
        if (!ok) {
            return;
        }
        for (const uid of uids) {
            await api.moveFile({ fileUid: uid, toBucket, toFolderPath });
        }
        await reload();
        setSelectedUids(new Set());
    };
    const bulkTags = async () => {
        const uids = Array.from(selectedUids);
        if (!uids.length) {
            return;
        }
        const addRaw = typeof window !== "undefined"
            ? window.prompt("Tags to add (comma-separated):", "")
            : "";
        if (addRaw === null) {
            return;
        }
        const removeRaw = typeof window !== "undefined"
            ? window.prompt("Tags to remove (comma-separated):", "")
            : "";
        if (removeRaw === null) {
            return;
        }
        const addTags = parseTagsCsv(addRaw);
        const removeTags = parseTagsCsv(removeRaw);
        if (!addTags.length && !removeTags.length) {
            return;
        }
        const ok = typeof window !== "undefined"
            ? window.confirm(`Update tags on ${uids.length} file(s)?\n\nAdd: ${addTags.join(", ") || "(none)"}\nRemove: ${removeTags.join(", ") || "(none)"}`)
            : true;
        if (!ok) {
            return;
        }
        const removeSet = new Set(removeTags);
        for (const uid of uids) {
            const fromList = items.find((f) => f.uid === uid);
            const file = fromList || (await api.getFile(uid));
            const existing = Array.isArray(file.tags) ? file.tags : [];
            const next = new Set();
            for (const t of existing) {
                const normalized = String(t || "")
                    .trim()
                    .toLowerCase();
                if (!normalized) {
                    continue;
                }
                if (removeSet.has(normalized)) {
                    continue;
                }
                next.add(normalized);
            }
            for (const t of addTags) {
                if (!removeSet.has(t)) {
                    next.add(t);
                }
            }
            // eslint-disable-next-line no-await-in-loop
            await api.patchFile({
                fileUid: uid,
                patch: { tags: Array.from(next).slice(0, 20) },
            });
        }
        await reload();
        setSelectedUids(new Set());
    };
    const ensureThumbUrl = useCallback(async (f) => {
        if (!isImageMime(f.mime_type)) {
            return;
        }
        const cache = thumbUrlCacheRef.current;
        if (cache.has(f.uid)) {
            return;
        }
        cache.set(f.uid, api.getContentUrl({ fileUid: f.uid, variantKind: "thumb" }));
        setThumbTick((x) => x + 1);
    }, [api]);
    useEffect(() => {
        if (previewMode !== "thumbnails") {
            return;
        }
        const images = items.filter((f) => isImageMime(f.mime_type));
        let cancelled = false;
        (async () => {
            for (const f of images) {
                if (cancelled) {
                    return;
                }
                await ensureThumbUrl(f);
            }
        })().catch(() => {
            // ignored
        });
        return () => {
            cancelled = true;
        };
    }, [items, previewMode, ensureThumbUrl, thumbTick]);
    const enqueueUploads = (files) => {
        const arr = Array.from(files);
        const next = arr.map((file) => ({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            file,
            visibility: "private",
            modePreference: "auto",
            status: "queued",
            progressPct: null,
        }));
        setUploadItems((prev) => [...next, ...prev]);
    };
    const runUpload = async (itemId) => {
        const item = uploadItems.find((x) => x.id === itemId);
        if (!item) {
            return;
        }
        const setItem = (patch) => {
            setUploadItems((prev) => prev.map((x) => (x.id === itemId ? { ...x, ...patch } : x)));
        };
        const PROGRESS = {
            init: { start: 0, end: 3 },
            upload: { start: 3, end: 75 },
            finalize: { start: 75, end: 85 },
            variantsProcess: { start: 85, end: 90 },
            variantsUpload: { start: 90, end: 100 },
        };
        const setProgress = (pct) => {
            if (pct === null) {
                setItem({ progressPct: null });
                return;
            }
            setItem({ progressPct: clampPct(pct) });
        };
        setItem({ status: "init", error: undefined, progressPct: 0 });
        const uploadImageVariants = async (input) => {
            if (!isImageMime(input.file.type)) {
                return;
            }
            setItem({ status: "processing_variants" });
            input.setProgress(PROGRESS.variantsProcess.start);
            const variantsResult = await generateImageVariants({
                file: input.file,
                widths: DEFAULT_VARIANT_WIDTHS,
                preferWebp: true,
                quality: 0.82,
                useWorker: true,
            });
            if (!variantsResult.variants.length) {
                return;
            }
            input.setProgress(PROGRESS.variantsProcess.end);
            setItem({ status: "uploading_variants" });
            input.setProgress(PROGRESS.variantsUpload.start);
            const n = variantsResult.variants.length;
            for (let i = 0; i < n; i += 1) {
                const v = variantsResult.variants[i];
                const base = input.file.name.replace(/\.[^/.]+$/, "");
                const ext = v.mimeType === "image/webp" ? "webp" : "jpg";
                const variantFilename = `${base}-${v.targetWidth}w.${ext}`;
                const init = await api.variantUploadInit({
                    request: {
                        variantOfUid: input.fileUid,
                        variantKind: "web",
                        width: v.targetWidth,
                        height: v.targetHeight,
                        transform: {
                            source: "browser",
                            op: "resize",
                            width: v.targetWidth,
                            height: v.targetHeight,
                        },
                        originalFilename: variantFilename,
                        mimeType: v.mimeType,
                        sizeBytes: v.blob.size,
                    },
                });
                const startPct = PROGRESS.variantsUpload.start +
                    Math.round((i / n) *
                        (PROGRESS.variantsUpload.end - PROGRESS.variantsUpload.start));
                const endPct = PROGRESS.variantsUpload.start +
                    Math.round(((i + 1) / n) *
                        (PROGRESS.variantsUpload.end - PROGRESS.variantsUpload.start));
                input.setProgress(startPct);
                if (init.mode === "direct" &&
                    init.presignedPut &&
                    !input.wantsProxied) {
                    await uploadWithXhr({
                        method: "PUT",
                        url: init.presignedPut.url,
                        headers: init.presignedPut.headers,
                        body: v.blob,
                        onProgress: (pct) => {
                            input.setProgress(scalePct(pct, startPct, endPct));
                        },
                        withCredentials: false,
                    });
                    await api.variantUploadFinalize({
                        variantUid: init.variantUid,
                        object: init.object,
                    });
                    input.setProgress(endPct);
                    continue;
                }
                const proxyUrl = api.getVariantProxyUploadUrl(init.variantUid);
                await uploadWithXhr({
                    method: "POST",
                    url: proxyUrl,
                    headers: v.mimeType ? { "Content-Type": v.mimeType } : undefined,
                    body: v.blob,
                    onProgress: (pct) => {
                        input.setProgress(scalePct(pct, startPct, endPct));
                    },
                    withCredentials: true,
                });
                input.setProgress(endPct);
            }
        };
        try {
            setProgress(PROGRESS.init.start);
            const init = await api.uploadInit({
                request: {
                    purpose: "cms_asset",
                    originalFilename: item.file.name,
                    mimeType: item.file.type || "application/octet-stream",
                    sizeBytes: item.file.size,
                    visibility: item.visibility,
                },
            });
            setProgress(PROGRESS.init.end);
            setItem({
                fileUid: init.fileUid,
                status: "uploading",
                progressPct: PROGRESS.upload.start,
            });
            const wantsProxied = item.modePreference === "proxied";
            if (init.mode === "direct" && init.presignedPut && !wantsProxied) {
                await uploadWithXhr({
                    method: "PUT",
                    url: init.presignedPut.url,
                    headers: init.presignedPut.headers,
                    body: item.file,
                    onProgress: (pct) => setProgress(scalePct(pct, PROGRESS.upload.start, PROGRESS.upload.end)),
                    withCredentials: false,
                });
                setProgress(PROGRESS.upload.end);
                setItem({ status: "finalizing" });
                setProgress(PROGRESS.finalize.start);
                const finalized = await api.uploadFinalize({
                    fileUid: init.fileUid,
                    object: init.object,
                });
                setProgress(PROGRESS.finalize.end);
                try {
                    await uploadImageVariants({
                        fileUid: init.fileUid,
                        file: item.file,
                        wantsProxied,
                        setProgress: (pct) => setProgress(pct),
                    });
                }
                catch (e) {
                    setItem({
                        error: `Uploaded, but variants failed: ${e?.message || "unknown error"}`,
                    });
                }
                setItem({ status: "done" });
                setProgress(100);
                await reload();
                if (finalized?.file?.uid) {
                    setActiveUid(finalized.file.uid);
                }
                return;
            }
            // Proxied upload (fallback or preferred)
            const proxyUrl = api.getProxyUploadUrl(init.fileUid);
            await uploadWithXhr({
                method: "POST",
                url: proxyUrl,
                headers: item.file.type
                    ? { "Content-Type": item.file.type }
                    : undefined,
                body: item.file,
                onProgress: (pct) => setProgress(scalePct(pct, PROGRESS.upload.start, PROGRESS.upload.end)),
                withCredentials: true,
            });
            setProgress(PROGRESS.upload.end);
            setItem({ status: "finalizing" });
            setProgress(PROGRESS.finalize.start);
            setProgress(PROGRESS.finalize.end);
            try {
                await uploadImageVariants({
                    fileUid: init.fileUid,
                    file: item.file,
                    wantsProxied: true,
                    setProgress: (pct) => setProgress(pct),
                });
            }
            catch (e) {
                setItem({
                    error: `Uploaded, but variants failed: ${e?.message || "unknown error"}`,
                });
            }
            setItem({ status: "done" });
            setProgress(100);
            await reload();
        }
        catch (e) {
            setItem({ status: "error", error: e?.message || "Upload failed" });
        }
    };
    const runAllUploads = async () => {
        for (const item of uploadItems) {
            if (item.status !== "queued" && item.status !== "error") {
                continue;
            }
            // eslint-disable-next-line no-await-in-loop
            await runUpload(item.id);
        }
    };
    return (_jsxs(Box, { children: [_jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", alignItems: "center", useFlexGap: true, children: [_jsx(TextField, { size: "small", placeholder: "Search files\u2026", value: search, onChange: (e) => setSearch(e.target.value), sx: { minWidth: 180, flex: 1 } }), _jsxs(FormControl, { size: "small", sx: { minWidth: 100 }, children: [_jsx(InputLabel, { id: "fm-visibility-label", children: "Visibility" }), _jsxs(Select, { labelId: "fm-visibility-label", value: publicFilter, label: "Visibility", onChange: (e) => setPublicFilter(e.target.value), children: [_jsx(MenuItem, { value: "all", children: "All" }), _jsx(MenuItem, { value: "public", children: "Public" }), _jsx(MenuItem, { value: "private", children: "Private" })] })] }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: includeArchived, onChange: (e) => setIncludeArchived(e.target.checked), size: "small" }), label: "Archived" }), _jsxs(FormControl, { size: "small", sx: { minWidth: 100 }, children: [_jsx(InputLabel, { id: "fm-sortby-label", children: "Sort by" }), _jsxs(Select, { labelId: "fm-sortby-label", value: sortBy, label: "Sort by", onChange: (e) => setSortBy(e.target.value), children: [_jsx(MenuItem, { value: "created_at", children: "Created" }), _jsx(MenuItem, { value: "original_filename", children: "Filename" }), _jsx(MenuItem, { value: "byte_size", children: "Size" })] })] }), _jsxs(FormControl, { size: "small", sx: { minWidth: 80 }, children: [_jsx(InputLabel, { id: "fm-sortorder-label", children: "Order" }), _jsxs(Select, { labelId: "fm-sortorder-label", value: sortOrder, label: "Order", onChange: (e) => setSortOrder(e.target.value), children: [_jsx(MenuItem, { value: "desc", children: "Desc" }), _jsx(MenuItem, { value: "asc", children: "Asc" })] })] }), _jsxs(ToggleButtonGroup, { size: "small", value: viewMode, exclusive: true, onChange: (_, v) => {
                            if (v) {
                                setViewMode(v);
                            }
                        }, children: [_jsx(ToggleButton, { value: "list", "aria-label": "List view", children: _jsx(Tooltip, { title: "List view", children: _jsx(ViewListIcon, { fontSize: "small" }) }) }), _jsx(ToggleButton, { value: "grid", "aria-label": "Grid view", children: _jsx(Tooltip, { title: "Grid view", children: _jsx(GridViewIcon, { fontSize: "small" }) }) })] }), _jsxs(ToggleButtonGroup, { size: "small", value: previewMode, exclusive: true, onChange: (_, v) => {
                            if (v) {
                                setPreviewMode(v);
                            }
                        }, children: [_jsx(ToggleButton, { value: "thumbnails", children: "Thumbs" }), _jsx(ToggleButton, { value: "icons", children: "Icons" })] }), _jsx(Tooltip, { title: "Refresh", children: _jsx("span", { children: _jsx(IconButton, { "aria-label": "Refresh", onClick: () => void reload(), disabled: isLoading, children: _jsx(RefreshIcon, {}) }) }) }), enableUpload && (_jsx(Button, { variant: "contained", onClick: () => setIsUploadOpen(true), children: "Upload" }))] }), enableBulkActions && selectedUids.size > 0 && (_jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", alignItems: "center", useFlexGap: true, sx: { mt: 1.5 }, children: [_jsx(Chip, { label: `${selectedUids.size} selected`, size: "small" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => void bulkArchive(), children: "Archive" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => void bulkRestore(), children: "Restore" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => void bulkMove(), children: "Move" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => void bulkTags(), children: "Tags" }), _jsx(Button, { size: "small", variant: "outlined", color: "error", onClick: () => void bulkDelete(), children: "Delete" }), _jsx(Button, { size: "small", variant: "text", onClick: () => setSelectedUids(new Set()), children: "Clear" })] })), error && (_jsx(Alert, { severity: "error", sx: { mt: 1.5 }, children: error })), isLoading && items.length === 0 && !error && (_jsx(Box, { sx: { display: "flex", justifyContent: "center", py: 6 }, children: _jsx(CircularProgress, {}) })), viewMode === "list" && (_jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mt: 1.5 }, children: _jsxs(Table, { size: "small", sx: { tableLayout: "fixed" }, children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [enableBulkActions && (_jsx(TableCell, { padding: "checkbox", children: _jsx(Checkbox, { size: "small", checked: items.length > 0 && selectedUids.size === items.length, indeterminate: selectedUids.size > 0 &&
                                                selectedUids.size < items.length, onChange: (e) => setAllSelected(e.target.checked) }) })), _jsx(TableCell, { children: _jsx(TableSortLabel, { active: sortBy === "original_filename", direction: sortBy === "original_filename" ? sortOrder : "asc", onClick: () => handleSortClick("original_filename"), children: "File" }) }), _jsx(TableCell, { sx: { width: 150 }, children: _jsx(TableSortLabel, { active: sortBy === "created_at", direction: sortBy === "created_at" ? sortOrder : "desc", onClick: () => handleSortClick("created_at"), children: "Created" }) }), _jsx(TableCell, { align: "right", sx: { width: 100 }, children: _jsx(TableSortLabel, { active: sortBy === "byte_size", direction: sortBy === "byte_size" ? sortOrder : "desc", onClick: () => handleSortClick("byte_size"), children: "Size" }) }), _jsx(TableCell, { sx: { width: props.onSelect ? 180 : 220 }, children: "Actions" })] }) }), _jsxs(TableBody, { children: [items.map((f) => {
                                    const isExternallySelected = Boolean(selectedUid && f.uid === selectedUid);
                                    const isMultiSelected = selectedUids.has(f.uid);
                                    const thumbUrl = thumbUrlCacheRef.current.get(f.uid) || null;
                                    const showThumb = previewMode === "thumbnails" &&
                                        isImageMime(f.mime_type) &&
                                        Boolean(thumbUrl);
                                    const isRenaming = renamingUid === f.uid;
                                    const isRenameSubmitting = renameSubmittingUid === f.uid;
                                    return (_jsxs(TableRow, { hover: true, selected: isExternallySelected || isMultiSelected, sx: { cursor: "pointer" }, onClick: () => openDetail(f.uid), children: [enableBulkActions && (_jsx(TableCell, { padding: "checkbox", onClick: (e) => e.stopPropagation(), children: isRenameSubmitting ? (_jsx(CircularProgress, { size: 16, thickness: 5 })) : (_jsx(Checkbox, { size: "small", checked: isMultiSelected, onChange: () => toggleSelected(f.uid) })) })), _jsx(TableCell, { children: _jsxs(Stack, { direction: "row", spacing: 1.5, alignItems: "center", children: [_jsx(Box, { sx: {
                                                                width: 44,
                                                                height: 44,
                                                                borderRadius: 2,
                                                                border: 1,
                                                                borderColor: "divider",
                                                                bgcolor: "action.hover",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                overflow: "hidden",
                                                                flexShrink: 0,
                                                            }, children: showThumb ? (_jsx(Box, { component: "img", src: thumbUrl || "", alt: "", sx: {
                                                                    width: "100%",
                                                                    height: "100%",
                                                                    objectFit: "cover",
                                                                } })) : (_jsxs(Box, { sx: {
                                                                    display: "flex",
                                                                    flexDirection: "column",
                                                                    alignItems: "center",
                                                                    gap: 0.25,
                                                                }, children: [_jsx(InsertDriveFileOutlinedIcon, { sx: { fontSize: 22, color: "text.secondary" } }), _jsx(Typography, { variant: "caption", fontWeight: 700, color: "text.secondary", sx: { fontSize: "0.65rem" }, children: getFileExtLabel(f) })] })) }), _jsxs(Box, { sx: { minWidth: 0 }, children: [_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", sx: { minWidth: 0 }, children: [!isRenaming && (_jsxs(_Fragment, { children: [_jsx(Typography, { fontWeight: 700, noWrap: true, title: getFileLabel(f), sx: { minWidth: 0 }, children: getFileLabel(f) }), isRenameSubmitting ? (_jsx(Tooltip, { title: "Renaming...", children: _jsx(CircularProgress, { size: 16, thickness: 5 }) })) : (_jsx(Tooltip, { title: "Rename", children: _jsx(IconButton, { size: "small", disabled: Boolean(renameSubmittingUid), onClick: (e) => {
                                                                                            stop(e);
                                                                                            setRenamingUid(f.uid);
                                                                                            setRenameText(getFileLabel(f));
                                                                                        }, children: _jsx(EditOutlinedIcon, { fontSize: "small" }) }) }))] })), isRenaming && (_jsx(InlineRenameField, { value: renameText, onChange: setRenameText, onSubmit: () => void submitRename({
                                                                                fileUid: f.uid,
                                                                                previousName: String(f.original_filename || "").trim(),
                                                                                nextName: renameText,
                                                                                source: "list",
                                                                            }), onCancel: cancelInlineRename, isSubmitting: isRenameSubmitting }))] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", noWrap: true, sx: { display: "block" }, title: `${f.mime_type} | ${f.uid}`, children: [f.mime_type, " | ", f.uid] }), _jsxs(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", sx: { mt: 0.5 }, children: [f.is_public && (_jsx(Chip, { label: "Public", size: "small", variant: "outlined" })), f.archived_at && (_jsx(Chip, { label: "Archived", size: "small", variant: "outlined" }))] })] })] }) }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", noWrap: true, children: formatCreatedAt(f.created_at) }) }), _jsx(TableCell, { align: "right", children: _jsx(Typography, { variant: "body2", children: formatBytes(f.byte_size) }) }), _jsx(TableCell, { onClick: (e) => e.stopPropagation(), children: _jsxs(Stack, { direction: "column", spacing: 0.5, children: [props.onSelect && (_jsx(FmSelectButton, { file: f, api: api, onSelect: props.onSelect })), _jsx(FmFileActionIcons, { file: f, api: api, onOpenDetail: openDetail, onDelete: handleDeleteInline })] }) })] }, f.uid));
                                }), !isLoading && items.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: enableBulkActions ? 5 : 4, children: _jsx(Typography, { color: "text.secondary", sx: { py: 2, textAlign: "center" }, children: "No files found." }) }) }))] })] }) })), viewMode === "grid" && (_jsxs(Box, { sx: {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: 1.5,
                    mt: 1.5,
                }, children: [items.map((f) => {
                        const isMultiSelected = selectedUids.has(f.uid);
                        const thumbUrl = thumbUrlCacheRef.current.get(f.uid) || null;
                        const showThumb = previewMode === "thumbnails" &&
                            isImageMime(f.mime_type) &&
                            Boolean(thumbUrl);
                        const isRenaming = renamingUid === f.uid;
                        const isRenameSubmitting = renameSubmittingUid === f.uid;
                        return (_jsxs(Paper, { variant: "outlined", sx: {
                                p: 1.25,
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                gap: 1,
                                outline: isMultiSelected
                                    ? `2px solid ${theme.palette.primary.main}`
                                    : "none",
                                "&:hover": { bgcolor: "action.hover" },
                            }, onClick: () => openDetail(f.uid), tabIndex: 0, onKeyDown: (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    stop(e);
                                    openDetail(f.uid);
                                }
                            }, children: [_jsx(Box, { sx: {
                                        width: "100%",
                                        aspectRatio: "1 / 1",
                                        borderRadius: 2,
                                        border: 1,
                                        borderColor: "divider",
                                        bgcolor: "action.hover",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        overflow: "hidden",
                                        position: "relative",
                                    }, children: showThumb ? (_jsxs(_Fragment, { children: [_jsx(Box, { component: "img", src: thumbUrl || "", alt: "", sx: {
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "contain",
                                                } }), _jsx(Tooltip, { title: "Expand image", children: _jsx(IconButton, { size: "small", sx: {
                                                        position: "absolute",
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: "rgba(0,0,0,0.5)",
                                                        color: "#fff",
                                                        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                                                        zIndex: 1,
                                                    }, onClick: (e) => {
                                                        stop(e);
                                                        setExpandedImageFile(f);
                                                    }, children: _jsx(OpenInFullIcon, { sx: { fontSize: 16 } }) }) })] })) : previewMode === "thumbnails" &&
                                        isSupportedVideoMime(f.mime_type) ? (_jsxs(_Fragment, { children: [_jsx(Box, { component: "video", preload: "metadata", controls: true, onClick: (e) => e.stopPropagation(), sx: {
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "contain",
                                                }, children: _jsx("source", { src: api.getContentUrl({ fileUid: f.uid }), type: f.mime_type }) }), _jsx(Tooltip, { title: "Picture-in-picture", children: _jsx(IconButton, { size: "small", sx: {
                                                        position: "absolute",
                                                        top: 4,
                                                        right: 4,
                                                        bgcolor: "rgba(0,0,0,0.5)",
                                                        color: "#fff",
                                                        "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                                                        zIndex: 1,
                                                    }, onClick: (e) => {
                                                        stop(e);
                                                        setExpandedVideoFile(f);
                                                    }, children: _jsx(PictureInPictureAltIcon, { sx: { fontSize: 16 } }) }) })] })) : (_jsxs(Box, { textAlign: "center", sx: {
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                            gap: 0.5,
                                        }, children: [_jsx(InsertDriveFileOutlinedIcon, { sx: { fontSize: 40, color: "text.secondary" } }), _jsx(Typography, { variant: "caption", fontWeight: 700, color: "text.secondary", children: getFileExtLabel(f) })] })) }), !isRenaming ? (_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", sx: { minWidth: 0 }, children: [_jsx(Typography, { fontWeight: 700, noWrap: true, title: getFileLabel(f), sx: { minWidth: 0, flex: 1 }, children: getFileLabel(f) }), isRenameSubmitting ? (_jsx(CircularProgress, { size: 16, thickness: 5 })) : (_jsx(Tooltip, { title: "Rename", children: _jsx(IconButton, { size: "small", disabled: Boolean(renameSubmittingUid), onClick: (e) => {
                                                    stop(e);
                                                    setRenamingUid(f.uid);
                                                    setRenameText(getFileLabel(f));
                                                }, children: _jsx(EditOutlinedIcon, { sx: { fontSize: 16 } }) }) }))] })) : (_jsx(Box, { onClick: (e) => stop(e), children: _jsx(InlineRenameField, { value: renameText, onChange: setRenameText, onSubmit: () => void submitRename({
                                            fileUid: f.uid,
                                            previousName: String(f.original_filename || "").trim(),
                                            nextName: renameText,
                                            source: "list",
                                        }), onCancel: cancelInlineRename, isSubmitting: isRenameSubmitting, compact: true }) })), props.onSelect && (_jsx(Box, { onClick: (e) => stop(e), children: _jsx(FmSelectButton, { file: f, api: api, onSelect: props.onSelect }) })), _jsxs(Stack, { direction: "row", spacing: 0.5, flexWrap: "wrap", alignItems: "center", children: [f.is_public && (_jsx(Chip, { label: "Public", size: "small", variant: "outlined" })), f.archived_at && (_jsx(Chip, { label: "Archived", size: "small", variant: "outlined" })), _jsx(Chip, { label: formatBytes(f.byte_size), size: "small", variant: "outlined" }), _jsx(Box, { sx: { ml: "auto", flexShrink: 0 }, onClick: (e) => stop(e), children: _jsx(FmFileActionIcons, { file: f, api: api, onOpenDetail: openDetail, onDelete: handleDeleteInline }) })] })] }, f.uid));
                    }), !isLoading && items.length === 0 && (_jsx(Typography, { color: "text.secondary", sx: { py: 2 }, children: "No files found." }))] })), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { mt: 1.5 }, children: [_jsx(Button, { size: "small", variant: "outlined", onClick: () => setOffset(Math.max(0, offset - limit)), disabled: isLoading || offset <= 0, children: "Prev" }), _jsx(Button, { size: "small", variant: "outlined", onClick: () => setOffset(offset + limit), disabled: isLoading || offset + limit >= totalCount, children: "Next" }), _jsx(FormControl, { size: "small", sx: { minWidth: 70 }, children: _jsx(Select, { value: itemsPerPage, onChange: (e) => {
                                const v = Number(e.target.value);
                                if (v > 0) {
                                    setItemsPerPage(v);
                                    setOffset(0);
                                }
                            }, children: PAGE_SIZES.map((s) => (_jsx(MenuItem, { value: s, children: s }, s))) }) }), _jsxs(Typography, { variant: "body2", color: "text.secondary", sx: { ml: "auto" }, children: [pageInfo.start, "-", pageInfo.end, " of ", pageInfo.totalCount] })] }), _jsxs(Drawer, { anchor: "right", open: Boolean(activeUid), onClose: closeDetail, slotProps: { backdrop: { sx: { zIndex: 1400 } } }, sx: { zIndex: 1400 }, PaperProps: { sx: { width: "min(520px, 100vw)", p: 2, zIndex: 1400 } }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [!detailIsRenaming && (_jsxs(_Fragment, { children: [_jsx(Typography, { fontWeight: 800, noWrap: true, title: activeFile ? getFileLabel(activeFile) : activeUid || "", sx: { flex: 1, minWidth: 0 }, children: activeFile ? getFileLabel(activeFile) : activeUid }), activeFile &&
                                        (renameSubmittingUid === activeFile.uid ? (_jsx(Tooltip, { title: "Renaming...", children: _jsx(CircularProgress, { size: 16, thickness: 5 }) })) : (_jsx(Tooltip, { title: "Rename", children: _jsx(IconButton, { size: "small", disabled: Boolean(renameSubmittingUid), onClick: (e) => {
                                                    stop(e);
                                                    setActiveError(null);
                                                    setDetailIsRenaming(true);
                                                    setDetailRenameText(getFileLabel(activeFile));
                                                }, children: _jsx(EditOutlinedIcon, { fontSize: "small" }) }) })))] })), detailIsRenaming && activeFile && (_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", sx: { flex: 1, minWidth: 0 }, children: [_jsx(TextField, { size: "small", value: detailRenameText, disabled: renameSubmittingUid === activeFile.uid, autoFocus: true, fullWidth: true, onClick: (e) => stop(e), onChange: (e) => setDetailRenameText(e.target.value), onKeyDown: (e) => {
                                            if (e.key === "Escape") {
                                                if (renameSubmittingUid === activeFile.uid) {
                                                    return;
                                                }
                                                stop(e);
                                                setDetailIsRenaming(false);
                                                setDetailRenameText(getFileLabel(activeFile));
                                                return;
                                            }
                                            if (e.key === "Enter") {
                                                if (renameSubmittingUid === activeFile.uid) {
                                                    return;
                                                }
                                                stop(e);
                                                void submitRename({
                                                    fileUid: activeFile.uid,
                                                    previousName: String(activeFile.original_filename || "").trim(),
                                                    nextName: detailRenameText,
                                                    source: "detail",
                                                });
                                            }
                                        } }), _jsx(Tooltip, { title: "Save", children: _jsx(IconButton, { size: "small", disabled: renameSubmittingUid === activeFile.uid, onClick: (e) => {
                                                stop(e);
                                                void submitRename({
                                                    fileUid: activeFile.uid,
                                                    previousName: String(activeFile.original_filename || "").trim(),
                                                    nextName: detailRenameText,
                                                    source: "detail",
                                                });
                                            }, children: renameSubmittingUid === activeFile.uid ? (_jsx(CircularProgress, { size: 16, thickness: 5 })) : (_jsx(CheckOutlinedIcon, { fontSize: "small" })) }) })] })), _jsx(Button, { variant: "outlined", onClick: closeDetail, children: "Close" })] }), activeLoading && _jsx(LinearProgress, { sx: { mt: 1.5 } }), activeError && (_jsx(Alert, { severity: "error", sx: { mt: 1.5 }, children: activeError })), activeFile && (_jsxs(Stack, { spacing: 2, sx: { mt: 2 }, children: [_jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "UID" }), _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", sx: { mt: 0.25 }, children: [_jsx(Typography, { variant: "body2", sx: { wordBreak: "break-all", fontFamily: "monospace" }, children: activeFile.uid }), _jsx(CopyButton, { value: activeFile.uid, tooltip: "Copy UID", size: "small", iconFontSize: "small" })] })] }), _jsxs(Box, { children: [_jsx(Typography, { variant: "caption", color: "text.secondary", children: "Preview" }), _jsxs(Paper, { variant: "outlined", sx: {
                                            mt: 1,
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: "action.hover",
                                        }, children: [activeUrl && isImageMime(activeFile.mime_type) && (_jsxs(Box, { sx: { position: "relative" }, children: [_jsx(Box, { component: "img", src: activeUrl, alt: "", sx: {
                                                            width: "100%",
                                                            maxHeight: 320,
                                                            objectFit: "contain",
                                                        } }), _jsx(Tooltip, { title: "Expand image", children: _jsx(IconButton, { size: "small", sx: {
                                                                position: "absolute",
                                                                top: 4,
                                                                right: 4,
                                                                bgcolor: "rgba(0,0,0,0.5)",
                                                                color: "#fff",
                                                                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                                                            }, onClick: () => setExpandedImageFile(activeFile), children: _jsx(OpenInFullIcon, { sx: { fontSize: 18 } }) }) })] })), activeUrl && isSupportedVideoMime(activeFile.mime_type) && (_jsxs(Box, { sx: { position: "relative" }, children: [_jsxs(Box, { component: "video", controls: true, preload: "metadata", sx: { width: "100%", maxHeight: 320, display: "block" }, children: [_jsx("source", { src: activeUrl, type: activeFile.mime_type }), "Your browser cannot play this video."] }), _jsx(Tooltip, { title: "Picture-in-picture", children: _jsx(IconButton, { size: "small", sx: {
                                                                position: "absolute",
                                                                top: 4,
                                                                right: 4,
                                                                bgcolor: "rgba(0,0,0,0.5)",
                                                                color: "#fff",
                                                                "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
                                                            }, onClick: () => setExpandedVideoFile(activeFile), children: _jsx(PictureInPictureAltIcon, { sx: { fontSize: 18 } }) }) })] })), (!activeUrl ||
                                                (!isImageMime(activeFile.mime_type) &&
                                                    !isSupportedVideoMime(activeFile.mime_type))) && (_jsxs(Typography, { color: "text.secondary", variant: "body2", children: ["No inline preview available for", " ", activeFile.mime_type || "this file", "."] }))] }), _jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", sx: { mt: 1 }, children: [_jsx(CopyButton, { value: api.getContentUrl({ fileUid: activeFile.uid }), tooltip: "Copy URL", size: "small", iconFontSize: "small" }), _jsx(Button, { size: "small", variant: "outlined", component: "a", href: api.getContentUrl({
                                                    fileUid: activeFile.uid,
                                                    download: true,
                                                }), target: "_blank", rel: "noopener noreferrer", children: "Download" }), activeUrlKind && (_jsx(Chip, { label: `URL: ${activeUrlKind}`, size: "small" }))] })] }), _jsxs(Box, { children: [_jsx(Typography, { fontWeight: 800, children: "Metadata" }), _jsxs(Stack, { spacing: 1.5, sx: { mt: 1 }, children: [_jsx(TextField, { size: "small", label: "Title", value: safeStr(activeFile.title), onChange: (e) => setActiveFile({
                                                    ...activeFile,
                                                    title: e.target.value,
                                                }) }), _jsx(TextField, { size: "small", label: "Alt text (images)", value: safeStr(activeFile.alt_text), onChange: (e) => setActiveFile({
                                                    ...activeFile,
                                                    alt_text: e.target.value,
                                                }) }), _jsx(TagsInput, { value: fmTags, onChange: setFmTags, label: "Add tag", placeholder: "e.g. hero, landing, press", maxTags: 50, maxLength: 128, size: "small", lowercase: true }), _jsx(FormControlLabel, { control: _jsx(Checkbox, { checked: activeIsLocalStorage
                                                        ? true
                                                        : Boolean(activeFile.is_public), disabled: activeIsLocalStorage, onChange: (e) => setActiveFile({
                                                        ...activeFile,
                                                        is_public: e.target.checked,
                                                    }) }), label: "Public" }), activeIsLocalStorage && (_jsx(Typography, { variant: "caption", color: "text.secondary", sx: { mt: -1 }, children: "Local files are always public." })), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Button, { variant: "contained", onClick: () => void (async () => {
                                                            setActiveError(null);
                                                            try {
                                                                const updated = await api.patchFile({
                                                                    fileUid: activeFile.uid,
                                                                    patch: {
                                                                        title: safeTrim(activeFile.title),
                                                                        alt_text: safeTrim(activeFile.alt_text),
                                                                        tags: fmTags,
                                                                        is_public: activeIsLocalStorage
                                                                            ? true
                                                                            : Boolean(activeFile.is_public),
                                                                    },
                                                                });
                                                                setActiveFile({ ...activeFile, ...updated });
                                                                await reload();
                                                                await loadDetail();
                                                            }
                                                            catch (e) {
                                                                setActiveError(e?.message || "Save failed");
                                                            }
                                                        })(), children: "Save" }), _jsx(Button, { variant: "outlined", onClick: () => void loadDetail(), children: "Reload" })] })] })] }), _jsxs(Box, { children: [_jsx(Typography, { fontWeight: 800, children: "Actions" }), _jsxs(Stack, { direction: "row", spacing: 1, flexWrap: "wrap", sx: { mt: 1 }, children: [!activeFile.archived_at && (_jsx(Button, { variant: "outlined", onClick: () => void (async () => {
                                                    await api.archiveFile(activeFile.uid);
                                                    await reload();
                                                    await loadDetail();
                                                })(), children: "Archive" })), activeFile.archived_at && (_jsx(Button, { variant: "outlined", onClick: () => void (async () => {
                                                    await api.restoreFile(activeFile.uid);
                                                    await reload();
                                                    await loadDetail();
                                                })(), children: "Restore" })), _jsx(Button, { variant: "outlined", color: "error", onClick: () => void (async () => {
                                                    const ok = typeof window !== "undefined"
                                                        ? window.confirm("Delete this file?\n\nIf it is linked, the server may archive it unless force-delete is allowed.")
                                                        : true;
                                                    if (!ok) {
                                                        return;
                                                    }
                                                    await api.deleteFile({
                                                        fileUid: activeFile.uid,
                                                        force: true,
                                                    });
                                                    await reload();
                                                    closeDetail();
                                                })(), children: "Delete" })] })] }), _jsxs(Box, { children: [_jsx(Typography, { fontWeight: 800, children: "Move" }), _jsx(MoveForm, { fileUid: activeFile.uid, onMove: async (toBucket, toFolderPath) => {
                                            await api.moveFile({
                                                fileUid: activeFile.uid,
                                                toBucket,
                                                toFolderPath,
                                            });
                                            await reload();
                                            await loadDetail();
                                        } })] }), _jsxs(Box, { children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, children: [_jsx(Typography, { fontWeight: 800, children: "Where used" }), _jsx(Button, { size: "small", sx: { ml: "auto" }, onClick: () => void loadLinks(), children: "Refresh" })] }), linksLoading && _jsx(LinearProgress, { sx: { mt: 1 } }), linksError && (_jsx(Alert, { severity: "error", sx: { mt: 1 }, children: linksError })), _jsx(CreateLinkForm, { onCreate: async (linkedEntityType, linkedEntityUid, linkedField) => {
                                            await api.createLink({
                                                fileUid: activeFile.uid,
                                                linkedEntityType,
                                                linkedEntityUid,
                                                linkedField,
                                            });
                                            await loadLinks();
                                        } }), _jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mt: 1.5 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "Entity" }), _jsx(TableCell, { children: "UID" }), _jsx(TableCell, { children: "Field" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsxs(TableBody, { children: [(linksData?.items || []).map((l) => (_jsxs(TableRow, { children: [_jsx(TableCell, { children: l.linked_entity_type }), _jsx(TableCell, { children: _jsx(Typography, { variant: "body2", sx: { fontFamily: "monospace" }, children: l.linked_entity_uid }) }), _jsx(TableCell, { children: l.linked_field }), _jsx(TableCell, { children: _jsx(Button, { size: "small", color: "error", onClick: () => void (async () => {
                                                                            await api.deleteLink({
                                                                                fileUid: activeFile.uid,
                                                                                linkedEntityType: String(l.linked_entity_type),
                                                                                linkedEntityUid: String(l.linked_entity_uid),
                                                                                linkedField: String(l.linked_field || "body"),
                                                                            });
                                                                            await loadLinks();
                                                                        })(), children: "Remove" }) })] }, String(l.id)))), !linksLoading && (linksData?.items || []).length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 4, children: _jsx(Typography, { color: "text.secondary", variant: "body2", children: "No links." }) }) }))] })] }) })] })] }))] }), _jsxs(Dialog, { open: isUploadOpen, onClose: () => setIsUploadOpen(false), fullWidth: true, maxWidth: "md", children: [_jsx(DialogTitle, { children: "Upload" }), _jsxs(DialogContent, { dividers: true, children: [_jsxs(Paper, { variant: "outlined", sx: {
                                    p: 2,
                                    textAlign: "center",
                                    borderStyle: "dashed",
                                    borderWidth: 2,
                                    cursor: "pointer",
                                    transition: "background-color 0.15s, border-color 0.15s",
                                    ...(isDragActive && {
                                        bgcolor: "action.hover",
                                        borderColor: "primary.main",
                                    }),
                                }, onDragOver: (e) => {
                                    stop(e);
                                    if (!isDragActive) {
                                        setIsDragActive(true);
                                    }
                                }, onDragEnter: (e) => {
                                    stop(e);
                                    setIsDragActive(true);
                                }, onDragLeave: (e) => {
                                    stop(e);
                                    setIsDragActive(false);
                                }, onDrop: (e) => {
                                    stop(e);
                                    setIsDragActive(false);
                                    if (e.dataTransfer?.files?.length) {
                                        enqueueUploads(e.dataTransfer.files);
                                    }
                                }, children: [_jsx(Typography, { fontWeight: 700, children: "Drag & drop files here" }), _jsx(Typography, { variant: "body2", color: "text.secondary", sx: { mt: 1 }, children: "Or choose files" }), _jsxs(Button, { variant: "outlined", component: "label", sx: { mt: 1.5 }, children: ["Browse", _jsx("input", { type: "file", multiple: true, hidden: true, onChange: (e) => {
                                                    if (e.target.files) {
                                                        enqueueUploads(e.target.files);
                                                    }
                                                    e.currentTarget.value = "";
                                                } })] })] }), _jsxs(Stack, { direction: "row", spacing: 1, sx: { mt: 2 }, children: [_jsx(Button, { variant: "contained", onClick: () => void runAllUploads(), children: "Upload all" }), _jsx(Button, { variant: "outlined", onClick: () => setUploadItems([]), children: "Clear" })] }), _jsx(TableContainer, { component: Paper, variant: "outlined", sx: { mt: 2 }, children: _jsxs(Table, { size: "small", children: [_jsx(TableHead, { children: _jsxs(TableRow, { children: [_jsx(TableCell, { children: "File" }), _jsx(TableCell, { children: "Visibility" }), _jsx(TableCell, { children: "Mode" }), _jsx(TableCell, { children: "Status" }), _jsx(TableCell, { children: "Actions" })] }) }), _jsxs(TableBody, { children: [uploadItems.map((u) => (_jsxs(TableRow, { children: [_jsxs(TableCell, { children: [_jsx(Typography, { fontWeight: 700, children: u.file.name }), _jsxs(Typography, { variant: "caption", color: "text.secondary", children: [formatBytes(u.file.size), " \u00B7", " ", u.file.type || "application/octet-stream"] }), u.error && (_jsx(Alert, { severity: u.status === "error" ? "error" : "warning", sx: { mt: 0.5, py: 0, px: 1 }, children: u.error }))] }), _jsx(TableCell, { children: _jsx(FormControl, { size: "small", sx: { minWidth: 90 }, children: _jsxs(Select, { value: u.visibility, onChange: (e) => setUploadItems((prev) => prev.map((x) => x.id === u.id
                                                                        ? {
                                                                            ...x,
                                                                            visibility: e.target.value,
                                                                        }
                                                                        : x)), children: [_jsx(MenuItem, { value: "private", children: "Private" }), _jsx(MenuItem, { value: "public", children: "Public" })] }) }) }), _jsx(TableCell, { children: _jsx(FormControl, { size: "small", sx: { minWidth: 90 }, children: _jsxs(Select, { value: u.modePreference, onChange: (e) => setUploadItems((prev) => prev.map((x) => x.id === u.id
                                                                        ? {
                                                                            ...x,
                                                                            modePreference: e.target.value,
                                                                        }
                                                                        : x)), children: [_jsx(MenuItem, { value: "auto", children: "Auto" }), _jsx(MenuItem, { value: "proxied", children: "Proxied" })] }) }) }), _jsxs(TableCell, { children: [_jsx(Typography, { variant: "body2", children: formatUploadStatus(u) }), u.progressPct !== null && (_jsxs(Box, { sx: {
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: 1,
                                                                        mt: 0.5,
                                                                    }, children: [(() => {
                                                                            const hasWarningOrError = u.status === "error" || Boolean(u.error);
                                                                            const isCompleteClean = u.status === "done" && !hasWarningOrError;
                                                                            return (_jsx(LinearProgress, { variant: "determinate", value: u.progressPct, sx: {
                                                                                    flex: 1,
                                                                                    ...(isCompleteClean && {
                                                                                        bgcolor: "success.light",
                                                                                        "& .MuiLinearProgress-bar": {
                                                                                            bgcolor: "success.main",
                                                                                        },
                                                                                    }),
                                                                                } }));
                                                                        })(), _jsxs(Typography, { variant: "caption", children: [u.progressPct, "%"] })] }))] }), _jsx(TableCell, { children: _jsxs(Stack, { direction: "row", spacing: 1, children: [(() => {
                                                                        const inFlight = u.status === "uploading" ||
                                                                            u.status === "finalizing" ||
                                                                            u.status === "processing_variants" ||
                                                                            u.status === "uploading_variants" ||
                                                                            u.status === "init";
                                                                        const hasWarningOrError = u.status === "error" || Boolean(u.error);
                                                                        const label = u.status === "error"
                                                                            ? "Retry"
                                                                            : u.status === "done"
                                                                                ? hasWarningOrError
                                                                                    ? "Reupload"
                                                                                    : "Uploaded"
                                                                                : "Upload";
                                                                        return (_jsx(Button, { size: "small", variant: "outlined", onClick: () => void runUpload(u.id), disabled: inFlight ||
                                                                                (u.status === "done" && !hasWarningOrError), children: label }));
                                                                    })(), _jsx(Tooltip, { title: "Remove", children: _jsx("span", { children: _jsx(IconButton, { size: "small", sx: { color: "error.main" }, onClick: () => setUploadItems((prev) => prev.filter((x) => x.id !== u.id)), disabled: u.status === "uploading" ||
                                                                                    u.status === "finalizing" ||
                                                                                    u.status === "processing_variants" ||
                                                                                    u.status === "uploading_variants" ||
                                                                                    u.status === "init", children: _jsx(DeleteOutlineIcon, { fontSize: "small" }) }) }) })] }) })] }, u.id))), uploadItems.length === 0 && (_jsx(TableRow, { children: _jsx(TableCell, { colSpan: 5, children: _jsx(Typography, { color: "text.secondary", variant: "body2", children: "No files queued." }) }) }))] })] }) })] }), _jsx(DialogActions, { children: _jsx(Button, { onClick: () => setIsUploadOpen(false), children: "Close" }) })] }), _jsx(Snackbar, { open: Boolean(renameSuccessMessage), autoHideDuration: 2500, anchorOrigin: { vertical: "bottom", horizontal: "center" }, sx: { zIndex: (muiTheme) => muiTheme.zIndex.snackbar + 2 }, onClose: () => setRenameSuccessMessage(null), children: _jsx(Alert, { onClose: () => setRenameSuccessMessage(null), severity: "success", variant: "filled", sx: { width: "100%" }, children: renameSuccessMessage }) }), _jsx(FmVideoViewer, { open: Boolean(expandedVideoFile), onClose: () => setExpandedVideoFile(null), src: expandedVideoFile
                    ? api.getContentUrl({ fileUid: expandedVideoFile.uid })
                    : "", mimeType: expandedVideoFile?.mime_type || "", title: expandedVideoFile ? getFileLabel(expandedVideoFile) : "" }), _jsx(FmImageViewer, { open: Boolean(expandedImageFile), onClose: () => setExpandedImageFile(null), fileUid: expandedImageFile?.uid || "", api: api, title: expandedImageFile ? getFileLabel(expandedImageFile) : "", file: expandedImageFile, onSelect: props.onSelect })] }));
};
// ─── Shared list/grid sub-components ────────────────────────────────────────
/** Inline rename text field with save/cancel, shared by list and grid views. */
const InlineRenameField = ({ value, onChange, onSubmit, onCancel, isSubmitting, compact }) => (_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [_jsx(TextField, { size: "small", multiline: !compact, maxRows: compact ? undefined : 3, value: value, disabled: isSubmitting, autoFocus: true, fullWidth: compact, onClick: (e) => stop(e), onChange: (e) => onChange(e.target.value), onKeyDown: (e) => {
                if (e.key === "Escape") {
                    if (isSubmitting) {
                        return;
                    }
                    stop(e);
                    onCancel();
                    return;
                }
                if (e.key === "Enter") {
                    if (isSubmitting) {
                        return;
                    }
                    stop(e);
                    onSubmit();
                }
            }, sx: {
                "& .MuiInputBase-root": { fontSize: compact ? 13 : 14 },
                ...(compact ? {} : { minWidth: 200 }),
            } }), _jsx(Tooltip, { title: "Save", children: _jsx(IconButton, { size: "small", disabled: isSubmitting, onClick: (e) => {
                    stop(e);
                    onSubmit();
                }, children: isSubmitting ? (_jsx(CircularProgress, { size: 16, thickness: 5 })) : (_jsx(CheckOutlinedIcon, { fontSize: "small" })) }) })] }));
/** Shared action icons: copy URL, details, delete. Used by both list and grid views. */
const FmFileActionIcons = ({ file, api, onOpenDetail, onDelete }) => (_jsxs(Stack, { direction: "row", spacing: 0.5, alignItems: "center", children: [_jsx(CopyButton, { value: api.getContentUrl({ fileUid: file.uid }), tooltip: "Copy URL", size: "small", iconFontSize: "small" }), _jsx(Tooltip, { title: "Details", children: _jsx(IconButton, { size: "small", onClick: () => onOpenDetail(file.uid), children: _jsx(InfoOutlinedIcon, { fontSize: "small" }) }) }), _jsx(Tooltip, { title: "Delete", children: _jsx(IconButton, { size: "small", sx: { color: "error.main" }, onClick: () => void onDelete(file), children: _jsx(DeleteOutlineIcon, { fontSize: "small" }) }) })] }));
/**
 * Select button with optional variant-size dropdown for images.
 *
 * For images: renders a split `ButtonGroup` — the main button selects the
 * original file; the dropdown arrow lazily loads variants from
 * `fm_file_variants` and shows resolution options (e.g. "Select size: 640×480").
 *
 * For non-images: renders a plain "Select" button.
 */
const FmSelectButton = ({ file, api, onSelect }) => {
    const [open, setOpen] = useState(false);
    const [variants, setVariants] = useState(() => {
        // Use pre-loaded variants from the file row if available (passthrough field).
        const embedded = file.variants;
        if (Array.isArray(embedded)) {
            return embedded
                .filter((v) => v.width && v.height)
                .sort((a, b) => (a.width || 0) - (b.width || 0));
        }
        return null;
    });
    const [loading, setLoading] = useState(false);
    const anchorRef = useRef(null);
    const isImage = isImageMime(file.mime_type);
    const handleToggle = useCallback(async () => {
        if (open) {
            setOpen(false);
            return;
        }
        // Already fetched (or pre-loaded) — just open.
        if (variants !== null) {
            setOpen(true);
            return;
        }
        // Fetch variants lazily on first click.
        setLoading(true);
        try {
            const result = await api.listVariants(file.uid);
            // Handle both `{ items: [...] }` and raw array responses.
            const raw = Array.isArray(result)
                ? result
                : result.items || [];
            const sized = raw
                .filter((v) => v.width && v.height)
                .sort((a, b) => (a.width || 0) - (b.width || 0));
            setVariants(sized);
            setOpen(true);
        }
        catch {
            setVariants([]);
            setOpen(true);
        }
        finally {
            setLoading(false);
        }
    }, [open, variants, api, file.uid]);
    if (!isImage) {
        return (_jsx(Button, { size: "small", variant: "contained", onClick: () => onSelect(file), sx: { minWidth: 0, px: 1, alignSelf: "flex-start" }, children: "Select" }));
    }
    return (_jsxs(_Fragment, { children: [_jsxs(ButtonGroup, { variant: "contained", size: "small", ref: anchorRef, sx: { alignSelf: "flex-start" }, children: [_jsx(Button, { onClick: () => onSelect(file), sx: { minWidth: 0, px: 1 }, children: "Select" }), _jsx(Button, { size: "small", onClick: () => void handleToggle(), sx: { minWidth: 0, px: 0.5 }, "aria-label": "Select variant size", children: loading ? (_jsx(CircularProgress, { size: 16, thickness: 5, color: "inherit" })) : (_jsx(ArrowDropDownIcon, { fontSize: "small" })) })] }), _jsx(Popper, { open: open, anchorEl: anchorRef.current, placement: "bottom-start", transition: true, sx: { zIndex: 1500 }, children: ({ TransitionProps, placement }) => (_jsx(Grow, { ...TransitionProps, style: {
                        transformOrigin: placement === "bottom-start" ? "left top" : "left bottom",
                    }, children: _jsx(Paper, { elevation: 8, children: _jsx(ClickAwayListener, { onClickAway: () => setOpen(false), children: _jsx(MenuList, { dense: true, children: variants && variants.length > 0 ? (variants.map((v) => (_jsx(MenuItem, { onClick: () => {
                                        onSelect(file, v);
                                        setOpen(false);
                                    }, children: `Select size: ${v.width}\u00D7${v.height}` }, v.uid)))) : (_jsx(MenuItem, { disabled: true, children: "No size variants" })) }) }) }) })) })] }));
};
// ─── Sub-components ─────────────────────────────────────────────────────────
const MoveForm = ({ onMove }) => {
    const [toBucket, setToBucket] = useState("");
    const [toFolderPath, setToFolderPath] = useState("");
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState(null);
    return (_jsxs(Stack, { spacing: 1.5, sx: { mt: 1 }, children: [error && (_jsx(Alert, { severity: "error", sx: { py: 0.5 }, children: error })), _jsx(TextField, { size: "small", label: "Bucket (optional)", value: toBucket, onChange: (e) => setToBucket(e.target.value) }), _jsx(TextField, { size: "small", label: "Folder path / prefix (optional)", placeholder: "e.g. images/landing/", value: toFolderPath, onChange: (e) => setToFolderPath(e.target.value) }), _jsx(Box, { children: _jsx(Button, { variant: "outlined", disabled: isBusy, onClick: () => void (async () => {
                        setIsBusy(true);
                        setError(null);
                        try {
                            await onMove(safeTrim(toBucket) || undefined, safeTrim(toFolderPath) || undefined);
                        }
                        catch (e) {
                            setError(e?.message || "Move failed");
                        }
                        finally {
                            setIsBusy(false);
                        }
                    })(), children: "Move" }) })] }));
};
const CreateLinkForm = ({ onCreate }) => {
    const [linkedEntityType, setLinkedEntityType] = useState("cms");
    const [linkedEntityUid, setLinkedEntityUid] = useState("");
    const [linkedField, setLinkedField] = useState("body");
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState(null);
    return (_jsxs(Box, { sx: { mt: 1.5 }, children: [_jsx(Typography, { fontWeight: 700, variant: "body2", children: "Add link" }), error && (_jsx(Alert, { severity: "error", sx: { mt: 1, py: 0.5 }, children: error })), _jsxs(Stack, { spacing: 1.5, sx: { mt: 1 }, children: [_jsx(TextField, { size: "small", label: "Entity type", value: linkedEntityType, onChange: (e) => setLinkedEntityType(e.target.value) }), _jsx(TextField, { size: "small", label: "Entity UID", value: linkedEntityUid, onChange: (e) => setLinkedEntityUid(e.target.value) }), _jsx(TextField, { size: "small", label: "Field", value: linkedField, onChange: (e) => setLinkedField(e.target.value) }), _jsx(Box, { children: _jsx(Button, { variant: "outlined", disabled: isBusy, onClick: () => void (async () => {
                                setError(null);
                                const t = safeTrim(linkedEntityType);
                                const u = safeTrim(linkedEntityUid);
                                const f = safeTrim(linkedField) || "body";
                                if (!t || !u) {
                                    setError("Entity type and UID are required");
                                    return;
                                }
                                setIsBusy(true);
                                try {
                                    await onCreate(t, u, f);
                                    setLinkedEntityUid("");
                                }
                                catch (e) {
                                    setError(e?.message || "Create link failed");
                                }
                                finally {
                                    setIsBusy(false);
                                }
                            })(), children: "Add" }) })] })] }));
};
export default FmMediaLibrary;
