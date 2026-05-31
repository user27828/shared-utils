import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * CMS List Page — shared-utils
 *
 * Reusable tabbed list page (All/Draft/Published/Trash) with search,
 * bulk operations, and status-colored chips.
 *
 * The host app mounts this as a route component and provides the
 * CmsAdminUiConfig for API, navigation, and toast integration.
 */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useDebouncedValue } from "../../helpers/debounce.js";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Container from "@mui/material/Container";
import Grow from "@mui/material/Grow";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import RestoreIcon from "@mui/icons-material/Restore";
import { CmsClient } from "../CmsClient.js";
import { defaultToast } from "./CmsAdminUiConfig.js";
// ─── Helpers ──────────────────────────────────────────────────────────────
const getStatusChipColor = (status) => {
    switch (status) {
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
const CmsListPage = ({ config, activeTab: controlledTab, onTabChange, searchQuery: controlledSearch, onSearchChange, }) => {
    const api = config?.api ?? defaultApi;
    const toast = config?.toast ?? defaultToast;
    const nav = config?.navigation;
    const transferUi = config?.transfer;
    // ── Tab state ─────────────────────────────────────────────────────────
    const [internalTab, setInternalTab] = useState("all");
    const tab = controlledTab ?? internalTab;
    const setTab = useCallback((t) => {
        if (onTabChange) {
            onTabChange(t);
        }
        else {
            setInternalTab(t);
        }
    }, [onTabChange]);
    // ── Search state ──────────────────────────────────────────────────────
    const [internalSearch, setInternalSearch] = useState("");
    const q = controlledSearch ?? internalSearch;
    const setQ = useCallback((v) => {
        if (onSearchChange) {
            onSearchChange(v);
        }
        else {
            setInternalSearch(v);
        }
    }, [onSearchChange]);
    // ── Data state ────────────────────────────────────────────────────────
    const [items, setItems] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedUids, setSelectedUids] = useState(new Set());
    const [newMenuOpen, setNewMenuOpen] = useState(false);
    const [transferBusy, setTransferBusy] = useState(false);
    const [transferError, setTransferError] = useState(null);
    const [transferImportOpen, setTransferImportOpen] = useState(false);
    const [transferImportAutoOpenFilePicker, setTransferImportAutoOpenFilePicker] = useState(false);
    const [transferInspectOpen, setTransferInspectOpen] = useState(false);
    const [transferPackageText, setTransferPackageText] = useState("");
    const [transferInspectResult, setTransferInspectResult] = useState(null);
    const newButtonGroupRef = useRef(null);
    const hasTransferImport = Boolean(transferUi?.renderImportDialog && transferUi?.renderInspectDialog);
    const statusFilter = useMemo(() => {
        if (tab === "draft") {
            return "draft";
        }
        if (tab === "published") {
            return "published";
        }
        if (tab === "trash") {
            return "trash";
        }
        return undefined;
    }, [tab]);
    // Debounce search query to avoid firing an API request on every keystroke.
    const [debouncedQ] = useDebouncedValue(q, { wait: 300 });
    // ── Load ──────────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const resp = await api.adminList({
                q: debouncedQ || undefined,
                status: statusFilter,
                includeTrash: tab === "trash" ? true : undefined,
                limit: 50,
                offset: 0,
                orderBy: "updated_at",
                orderDirection: "desc",
            });
            setItems(resp.items);
            setTotalCount(resp.totalCount);
            setSelectedUids(new Set());
        }
        catch (err) {
            setError(err?.message || "Failed to load CMS content");
        }
        finally {
            setIsLoading(false);
        }
    }, [api, debouncedQ, statusFilter, tab]);
    useEffect(() => {
        void load();
    }, [load]);
    const handleToggleNewMenu = useCallback(() => {
        if (!hasTransferImport) {
            return;
        }
        setNewMenuOpen((prev) => !prev);
    }, [hasTransferImport]);
    const handleCloseNewMenu = useCallback(() => {
        setNewMenuOpen(false);
    }, []);
    const handleOpenTransferImport = useCallback((mode) => {
        handleCloseNewMenu();
        setTransferError(null);
        setTransferImportOpen(true);
        setTransferImportAutoOpenFilePicker(mode === "upload");
    }, [handleCloseNewMenu]);
    const handleCloseTransferImport = useCallback(() => {
        if (transferBusy) {
            return;
        }
        setTransferImportOpen(false);
        setTransferImportAutoOpenFilePicker(false);
        setTransferError(null);
    }, [transferBusy]);
    const handleCloseTransferInspect = useCallback(() => {
        if (transferBusy) {
            return;
        }
        setTransferInspectOpen(false);
        setTransferError(null);
    }, [transferBusy]);
    const handleInspectTransferPackageText = useCallback(async (packageText) => {
        setTransferBusy(true);
        setTransferError(null);
        try {
            const result = await api.adminInspectTransferPackage({
                packageText,
            });
            setTransferPackageText(packageText);
            setTransferInspectResult(result);
            setTransferImportOpen(false);
            setTransferImportAutoOpenFilePicker(false);
            setTransferInspectOpen(true);
            toast.success("Transfer package inspected");
        }
        catch (err) {
            const message = err?.message || "Failed to inspect transfer package";
            setTransferError(message);
            toast.error(message);
        }
        finally {
            setTransferBusy(false);
        }
    }, [api, toast]);
    const handleApplyTransferPackage = useCallback(async (request) => {
        if (!transferPackageText) {
            setTransferError("No transfer package is loaded.");
            return;
        }
        setTransferBusy(true);
        setTransferError(null);
        try {
            const result = await api.adminApplyTransferPackage({
                package: transferPackageText,
                entryResolution: request.entryResolution,
                assetResolutions: request.assetResolutions,
            });
            setTransferInspectOpen(false);
            setTransferImportOpen(false);
            setTransferImportAutoOpenFilePicker(false);
            setTransferInspectResult(null);
            setTransferPackageText("");
            toast.success("Transfer package imported");
            if (result.appliedUid && nav?.goToEdit) {
                nav.goToEdit(result.appliedUid);
                return;
            }
            await load();
        }
        catch (err) {
            const message = err?.message || "Failed to import transfer package";
            setTransferError(message);
            toast.error(message);
        }
        finally {
            setTransferBusy(false);
        }
    }, [api, load, nav, toast, transferPackageText]);
    // ── Bulk operations ───────────────────────────────────────────────────
    const handleBulkRestore = async () => {
        const uids = Array.from(selectedUids);
        let restored = 0;
        for (const uid of uids) {
            const item = items.find((i) => i.uid === uid);
            if (!item) {
                continue;
            }
            try {
                await api.adminRestore({ uid, ifMatch: item.etag || "*" });
                restored++;
            }
            catch (err) {
                toast.error(`Failed to restore ${uid}: ${err?.message}`);
            }
        }
        if (restored > 0) {
            toast.success(`Restored ${restored} item(s)`);
            void load();
        }
    };
    const handleEmptyTrash = async () => {
        try {
            const result = await api.adminEmptyTrash(100);
            toast.success(`Deleted ${result.deletedCount} trashed item(s)`);
            void load();
        }
        catch (err) {
            toast.error(err?.message || "Failed to empty trash");
        }
    };
    // ── Selection helpers ─────────────────────────────────────────────────
    const toggleSelect = (uid) => {
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
    const toggleSelectAll = () => {
        if (selectedUids.size === items.length) {
            setSelectedUids(new Set());
        }
        else {
            setSelectedUids(new Set(items.map((i) => i.uid)));
        }
    };
    // ── Render ────────────────────────────────────────────────────────────
    return (_jsxs(Container, { maxWidth: "lg", sx: { py: 3 }, children: [_jsxs(Stack, { direction: "row", sx: { mb: 2, justifyContent: "space-between", alignItems: "center" }, children: [_jsx(Typography, { variant: "h5", children: "CMS Content" }), _jsxs(Stack, { direction: "row", spacing: 1, children: [_jsx(Tooltip, { title: "Refresh", children: _jsx(IconButton, { onClick: () => void load(), children: _jsx(RefreshIcon, {}) }) }), hasTransferImport ? (_jsxs(_Fragment, { children: [_jsxs(ButtonGroup, { variant: "contained", ref: newButtonGroupRef, "aria-label": "New CMS item actions", children: [_jsx(Button, { startIcon: _jsx(AddIcon, {}), onClick: () => nav?.goToCreate?.(), children: "New" }), _jsx(Button, { size: "small", "aria-label": "Open new item import options", "aria-controls": newMenuOpen ? "cms-new-import-menu" : undefined, "aria-expanded": newMenuOpen ? "true" : undefined, "aria-haspopup": "menu", onClick: handleToggleNewMenu, children: _jsx(ArrowDropDownIcon, {}) })] }), _jsx(Popper, { open: newMenuOpen, anchorEl: newButtonGroupRef.current, placement: "bottom-end", transition: true, disablePortal: true, sx: { zIndex: 1300 }, children: ({ TransitionProps }) => (_jsx(Grow, { ...TransitionProps, children: _jsx(Paper, { elevation: 8, sx: { mt: 0.5 }, children: _jsx(ClickAwayListener, { onClickAway: handleCloseNewMenu, children: _jsxs(MenuList, { id: "cms-new-import-menu", autoFocusItem: newMenuOpen, children: [_jsx(MenuItem, { onClick: () => handleOpenTransferImport("paste"), children: "Import: Paste JSON" }), _jsx(MenuItem, { onClick: () => handleOpenTransferImport("upload"), children: "Import: Upload JSON File" })] }) }) }) })) })] })) : (_jsx(Button, { variant: "contained", startIcon: _jsx(AddIcon, {}), onClick: () => nav?.goToCreate?.(), children: "New" }))] })] }), _jsxs(Paper, { sx: { mb: 2 }, children: [_jsx(Stack, { direction: "row", sx: { px: 2, pt: 1, alignItems: "center" }, children: _jsx(TextField, { size: "small", placeholder: "Search...", value: q, onChange: (e) => setQ(e.target.value), slotProps: {
                                input: {
                                    startAdornment: (_jsx(InputAdornment, { position: "start", children: _jsx(SearchIcon, { fontSize: "small" }) })),
                                },
                            }, sx: { width: 300 } }) }), _jsxs(Tabs, { value: tab, onChange: (_, v) => setTab(v), sx: { px: 2 }, children: [_jsx(Tab, { label: "All", value: "all" }), _jsx(Tab, { label: "Draft", value: "draft" }), _jsx(Tab, { label: "Published", value: "published" }), _jsx(Tab, { label: "Trash", value: "trash" })] })] }), selectedUids.size > 0 && (_jsxs(Stack, { direction: "row", spacing: 1, sx: { mb: 1 }, children: [_jsxs(Typography, { variant: "body2", sx: { alignSelf: "center" }, children: [selectedUids.size, " selected"] }), tab === "trash" && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "small", startIcon: _jsx(RestoreIcon, {}), onClick: handleBulkRestore, children: "Restore selected" }), _jsx(Button, { size: "small", color: "error", startIcon: _jsx(DeleteForeverIcon, {}), onClick: handleEmptyTrash, children: "Empty trash" })] }))] })), isLoading && _jsx(LinearProgress, { sx: { mb: 1 } }), error && (_jsx(Typography, { color: "error", sx: { mb: 1 }, children: error })), _jsxs(Paper, { children: [items.length === 0 && !isLoading && (_jsx(Typography, { sx: { p: 3, textAlign: "center" }, color: "text.secondary", children: "No content found" })), items.length > 0 && (_jsxs(Box, { children: [_jsxs(Stack, { direction: "row", sx: {
                                    px: 2,
                                    py: 1,
                                    borderBottom: 1,
                                    borderColor: "divider",
                                    alignItems: "center",
                                }, children: [_jsx(Checkbox, { size: "small", checked: selectedUids.size === items.length && items.length > 0, indeterminate: selectedUids.size > 0 && selectedUids.size < items.length, onChange: toggleSelectAll }), _jsx(Typography, { variant: "caption", sx: { flex: 1, ml: 1 }, children: "Title" }), _jsx(Typography, { variant: "caption", sx: { width: 100, textAlign: "center" }, children: "Status" }), _jsx(Typography, { variant: "caption", sx: { width: 100, textAlign: "center" }, children: "Type" }), _jsx(Typography, { variant: "caption", sx: { width: 140, textAlign: "right" }, children: "Updated" })] }), items.map((item) => (_jsxs(Stack, { direction: "row", sx: {
                                    px: 2,
                                    py: 1,
                                    borderBottom: 1,
                                    borderColor: "divider",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    "&:hover": { bgcolor: "action.hover" },
                                }, onClick: () => nav?.goToEdit?.(item.uid), children: [_jsx(Checkbox, { size: "small", checked: selectedUids.has(item.uid), onClick: (e) => e.stopPropagation(), onChange: () => toggleSelect(item.uid) }), _jsxs(Box, { sx: { flex: 1, ml: 1, minWidth: 0 }, children: [_jsx(Typography, { noWrap: true, children: item.title || "(untitled)" }), _jsxs(Typography, { variant: "caption", color: "text.secondary", noWrap: true, children: ["/", item.slug] })] }), _jsx(Box, { sx: { width: 100, textAlign: "center" }, children: _jsx(Chip, { label: item.status, size: "small", color: getStatusChipColor(item.status || "") }) }), _jsx(Typography, { variant: "caption", sx: { width: 100, textAlign: "center" }, color: "text.secondary", children: item.post_type }), _jsx(Typography, { variant: "caption", sx: { width: 140, textAlign: "right" }, color: "text.secondary", children: item.updated_at
                                            ? new Date(item.updated_at).toLocaleDateString()
                                            : "—" })] }, item.uid)))] }))] }), _jsxs(Typography, { variant: "caption", color: "text.secondary", sx: { mt: 1, display: "block" }, children: ["Showing ", items.length, " of ", totalCount, " item(s)"] }), transferUi?.renderImportDialog?.({
                open: transferImportOpen,
                busy: transferBusy,
                autoOpenFilePicker: transferImportAutoOpenFilePicker,
                defaultPackageText: transferPackageText,
                error: transferError,
                onClose: handleCloseTransferImport,
                onInspectPackageText: handleInspectTransferPackageText,
                onInspectFileText: (packageText) => {
                    return handleInspectTransferPackageText(packageText);
                },
            }), transferUi?.renderInspectDialog?.({
                open: transferInspectOpen,
                busy: transferBusy,
                error: transferError,
                summary: transferInspectResult?.packageSummary ?? null,
                entryConflict: transferInspectResult?.entryConflict ?? null,
                assetConflicts: transferInspectResult?.assetConflicts ?? [],
                publicEligibility: transferInspectResult?.publicEligibility ?? null,
                validationErrors: transferInspectResult?.validationErrors ?? [],
                warnings: transferInspectResult?.warnings ?? [],
                onClose: handleCloseTransferInspect,
                onApply: handleApplyTransferPackage,
            })] }));
};
export default CmsListPage;
