/**
 * CMS List Page — shared-utils
 *
 * Reusable tabbed list page (All/Draft/Published/Trash) with search,
 * bulk operations, and status-colored chips.
 *
 * The host app mounts this as a route component and provides the
 * CmsAdminUiConfig for API, navigation, and toast integration.
 */
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
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

import type { CmsHeadRow } from "../../../../utils/src/cms/types.js";
import { CmsClient } from "../CmsClient.js";
import type { CmsApi, CmsTransferInspectResult } from "../CmsApi.js";
import type { CmsAdminUiConfig } from "./CmsAdminUiConfig.js";
import { defaultToast } from "./CmsAdminUiConfig.js";

// ─── Types ────────────────────────────────────────────────────────────────

type CmsTabKey = "all" | "draft" | "published" | "trash";

export interface CmsListPageProps {
  config?: CmsAdminUiConfig;
  /** Current active tab (controlled). Default: "all". */
  activeTab?: CmsTabKey;
  /** Called when the tab changes. */
  onTabChange?: (tab: CmsTabKey) => void;
  /** Current search query (controlled). */
  searchQuery?: string;
  /** Called when search query changes. */
  onSearchChange?: (q: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const getStatusChipColor = (
  status: string,
): "default" | "success" | "warning" | "error" => {
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

const CmsListPage: React.FC<CmsListPageProps> = ({
  config,
  activeTab: controlledTab,
  onTabChange,
  searchQuery: controlledSearch,
  onSearchChange,
}) => {
  const api: CmsApi = config?.api ?? defaultApi;
  const toast = config?.toast ?? defaultToast;
  const nav = config?.navigation;
  const transferUi = config?.transfer;

  // ── Tab state ─────────────────────────────────────────────────────────
  const [internalTab, setInternalTab] = useState<CmsTabKey>("all");
  const tab = controlledTab ?? internalTab;
  const setTab = useCallback(
    (t: CmsTabKey) => {
      if (onTabChange) {
        onTabChange(t);
      } else {
        setInternalTab(t);
      }
    },
    [onTabChange],
  );

  // ── Search state ──────────────────────────────────────────────────────
  const [internalSearch, setInternalSearch] = useState("");
  const q = controlledSearch ?? internalSearch;
  const setQ = useCallback(
    (v: string) => {
      if (onSearchChange) {
        onSearchChange(v);
      } else {
        setInternalSearch(v);
      }
    },
    [onSearchChange],
  );

  // ── Data state ────────────────────────────────────────────────────────
  const [items, setItems] = useState<CmsHeadRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferImportOpen, setTransferImportOpen] = useState(false);
  const [transferImportAutoOpenFilePicker, setTransferImportAutoOpenFilePicker] =
    useState(false);
  const [transferInspectOpen, setTransferInspectOpen] = useState(false);
  const [transferPackageText, setTransferPackageText] = useState("");
  const [transferInspectResult, setTransferInspectResult] =
    useState<CmsTransferInspectResult | null>(null);
  const newButtonGroupRef = useRef<HTMLDivElement | null>(null);

  const hasTransferImport = Boolean(
    transferUi?.renderImportDialog && transferUi?.renderInspectDialog,
  );

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
    } catch (err: any) {
      setError(err?.message || "Failed to load CMS content");
    } finally {
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

  const handleOpenTransferImport = useCallback(
    (mode: "paste" | "upload") => {
      handleCloseNewMenu();
      setTransferError(null);
      setTransferImportOpen(true);
      setTransferImportAutoOpenFilePicker(mode === "upload");
    },
    [handleCloseNewMenu],
  );

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

  const handleInspectTransferPackageText = useCallback(
    async (packageText: string) => {
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
      } catch (err: any) {
        const message = err?.message || "Failed to inspect transfer package";
        setTransferError(message);
        toast.error(message);
      } finally {
        setTransferBusy(false);
      }
    },
    [api, toast],
  );

  const handleApplyTransferPackage = useCallback(
    async (request: {
      entryResolution: {
        mode: "update_existing" | "create_copy";
        slug?: string;
      };
      assetResolutions: Array<{
        assetId: string;
        mode:
          | "reuse_existing_asset"
          | "upload_packaged_asset"
          | "rename_upload";
      }>;
    }) => {
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
      } catch (err: any) {
        const message = err?.message || "Failed to import transfer package";
        setTransferError(message);
        toast.error(message);
      } finally {
        setTransferBusy(false);
      }
    },
    [api, load, nav, toast, transferPackageText],
  );

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
      } catch (err: any) {
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
    } catch (err: any) {
      toast.error(err?.message || "Failed to empty trash");
    }
  };

  // ── Selection helpers ─────────────────────────────────────────────────
  const toggleSelect = (uid: string) => {
    setSelectedUids((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUids.size === items.length) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(items.map((i) => i.uid)));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack
        direction="row"
        sx={{ mb: 2, justifyContent: "space-between", alignItems: "center" }}
      >
        <Typography variant="h5">CMS Content</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={() => void load()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          {hasTransferImport ? (
            <>
              <ButtonGroup
                variant="contained"
                ref={newButtonGroupRef}
                aria-label="New CMS item actions"
              >
                <Button
                  startIcon={<AddIcon />}
                  onClick={() => nav?.goToCreate?.()}
                >
                  New
                </Button>
                <Button
                  size="small"
                  aria-label="Open new item import options"
                  aria-controls={newMenuOpen ? "cms-new-import-menu" : undefined}
                  aria-expanded={newMenuOpen ? "true" : undefined}
                  aria-haspopup="menu"
                  onClick={handleToggleNewMenu}
                >
                  <ArrowDropDownIcon />
                </Button>
              </ButtonGroup>
              <Popper
                open={newMenuOpen}
                anchorEl={newButtonGroupRef.current}
                placement="bottom-end"
                transition
                disablePortal
                sx={{ zIndex: 1300 }}
              >
                {({ TransitionProps }) => (
                  <Grow {...TransitionProps}>
                    <Paper elevation={8} sx={{ mt: 0.5 }}>
                      <ClickAwayListener onClickAway={handleCloseNewMenu}>
                        <MenuList id="cms-new-import-menu" autoFocusItem={newMenuOpen}>
                          <MenuItem
                            onClick={() => handleOpenTransferImport("paste")}
                          >
                            Import: Paste JSON
                          </MenuItem>
                          <MenuItem
                            onClick={() => handleOpenTransferImport("upload")}
                          >
                            Import: Upload JSON File
                          </MenuItem>
                        </MenuList>
                      </ClickAwayListener>
                    </Paper>
                  </Grow>
                )}
              </Popper>
            </>
          ) : (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => nav?.goToCreate?.()}
            >
              New
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Search + Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Stack direction="row" sx={{ px: 2, pt: 1, alignItems: "center" }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: 300 }}
          />
        </Stack>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v as CmsTabKey)}
          sx={{ px: 2 }}
        >
          <Tab label="All" value="all" />
          <Tab label="Draft" value="draft" />
          <Tab label="Published" value="published" />
          <Tab label="Trash" value="trash" />
        </Tabs>
      </Paper>

      {/* Bulk actions */}
      {selectedUids.size > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            {selectedUids.size} selected
          </Typography>
          {tab === "trash" && (
            <>
              <Button
                size="small"
                startIcon={<RestoreIcon />}
                onClick={handleBulkRestore}
              >
                Restore selected
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<DeleteForeverIcon />}
                onClick={handleEmptyTrash}
              >
                Empty trash
              </Button>
            </>
          )}
        </Stack>
      )}

      {/* Loading */}
      {isLoading && <LinearProgress sx={{ mb: 1 }} />}

      {/* Error */}
      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {/* Items */}
      <Paper>
        {items.length === 0 && !isLoading && (
          <Typography sx={{ p: 3, textAlign: "center" }} color="text.secondary">
            No content found
          </Typography>
        )}

        {items.length > 0 && (
          <Box>
            {/* Header row */}
            <Stack
              direction="row"
              sx={{
                px: 2,
                py: 1,
                borderBottom: 1,
                borderColor: "divider",
                alignItems: "center",
              }}
            >
              <Checkbox
                size="small"
                checked={selectedUids.size === items.length && items.length > 0}
                indeterminate={
                  selectedUids.size > 0 && selectedUids.size < items.length
                }
                onChange={toggleSelectAll}
              />
              <Typography variant="caption" sx={{ flex: 1, ml: 1 }}>
                Title
              </Typography>
              <Typography
                variant="caption"
                sx={{ width: 100, textAlign: "center" }}
              >
                Status
              </Typography>
              <Typography
                variant="caption"
                sx={{ width: 100, textAlign: "center" }}
              >
                Type
              </Typography>
              <Typography
                variant="caption"
                sx={{ width: 140, textAlign: "right" }}
              >
                Updated
              </Typography>
            </Stack>

            {/* Data rows */}
            {items.map((item) => (
              <Stack
                key={item.uid}
                direction="row"
                sx={{
                  px: 2,
                  py: 1,
                  borderBottom: 1,
                  borderColor: "divider",
                  alignItems: "center",
                  cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => nav?.goToEdit?.(item.uid)}
              >
                <Checkbox
                  size="small"
                  checked={selectedUids.has(item.uid)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(item.uid)}
                />
                <Box sx={{ flex: 1, ml: 1, minWidth: 0 }}>
                  <Typography noWrap>{item.title || "(untitled)"}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    /{item.slug}
                  </Typography>
                </Box>
                <Box sx={{ width: 100, textAlign: "center" }}>
                  <Chip
                    label={item.status}
                    size="small"
                    color={getStatusChipColor(item.status || "")}
                  />
                </Box>
                <Typography
                  variant="caption"
                  sx={{ width: 100, textAlign: "center" }}
                  color="text.secondary"
                >
                  {item.post_type}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ width: 140, textAlign: "right" }}
                  color="text.secondary"
                >
                  {item.updated_at
                    ? new Date(item.updated_at).toLocaleDateString()
                    : "—"}
                </Typography>
              </Stack>
            ))}
          </Box>
        )}
      </Paper>

      {/* Footer */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mt: 1, display: "block" }}
      >
        Showing {items.length} of {totalCount} item(s)
      </Typography>

      {transferUi?.renderImportDialog?.({
        open: transferImportOpen,
        busy: transferBusy,
        autoOpenFilePicker: transferImportAutoOpenFilePicker,
        defaultPackageText: transferPackageText,
        error: transferError,
        onClose: handleCloseTransferImport,
        onInspectPackageText: handleInspectTransferPackageText,
        onInspectFileText: (packageText: string) => {
          return handleInspectTransferPackageText(packageText);
        },
      })}

      {transferUi?.renderInspectDialog?.({
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
      })}
    </Container>
  );
};

export default CmsListPage;
