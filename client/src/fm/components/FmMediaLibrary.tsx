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
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDebouncedValue } from "../../helpers/debounce.js";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  ClickAwayListener,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  Grow,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  MenuList,
  Paper,
  Popper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckOutlinedIcon from "@mui/icons-material/CheckOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import RefreshIcon from "@mui/icons-material/Refresh";
import type { SelectChangeEvent } from "@mui/material/Select";
import CopyButton from "../../components/CopyButton.js";

import type {
  FmFileRow,
  FmFileVariantRow,
  FmFilesOrderBy,
} from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";
import { useFmApi } from "../FmClientProvider.js";
import { useFmListFiles } from "../hooks/useFmListFiles.js";
import {
  DEFAULT_VARIANT_WIDTHS,
  generateImageVariants,
} from "../utils/imageVariants.js";

/** Props for the {@link FmMediaLibrary} component. */
export interface FmMediaLibraryProps {
  /** Optional initial search string. */
  initialSearch?: string;
  /** If true, show archived items. */
  includeArchived?: boolean;
  /** Page size; defaults to 25. */
  pageSize?: number;
  /**
   * Called when a file is selected. The optional `variant` is provided when
   * the user picks a specific size variant instead of the original.
   */
  onSelect?: (file: FmFileRow, variant?: FmFileVariantRow) => void;
  /** Optional externally-controlled selected UID. */
  selectedFileUid?: string | null;
  /** If true, allow multi-select + bulk actions. Defaults to true when onSelect is not provided. */
  enableBulkActions?: boolean;
  /** If true, show upload UI. Defaults to true. */
  enableUpload?: boolean;
  /**
   * FmApi instance for all server communication.
   * Falls back to FmClientProvider context, then to a default FmClient().
   */
  api?: FmApi;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const formatBytes = (n: number | null | undefined): string => {
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

type ViewMode = "list" | "grid";
type PreviewMode = "thumbnails" | "icons";
type PublicFilter = "all" | "public" | "private";

type UploadStatus =
  | "queued"
  | "init"
  | "uploading"
  | "finalizing"
  | "processing_variants"
  | "uploading_variants"
  | "done"
  | "error";

const clampPct = (pct: number): number => {
  if (!Number.isFinite(pct)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(pct)));
};

const scalePct = (pct0to100: number, start: number, end: number): number => {
  const pct = clampPct(pct0to100);
  const span = Math.max(0, end - start);
  return clampPct(start + Math.round((pct / 100) * span));
};

const formatUploadStatus = (u: {
  status: UploadStatus;
  error?: string;
}): string => {
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

const isImageMime = (mime: string | null | undefined): boolean => {
  const m = (mime || "").toLowerCase();
  return m.startsWith("image/");
};

const isVideoMime = (mime: string | null | undefined): boolean => {
  const m = (mime || "").toLowerCase();
  return m.startsWith("video/");
};

const isSupportedVideoMime = (mime: string | null | undefined): boolean => {
  const m = (mime || "").toLowerCase();
  return m === "video/mp4" || m === "video/webm" || m === "video/ogg";
};

const safeTrim = (v: unknown): string => {
  if (v === null || v === undefined) {
    return "";
  }
  return String(v).trim();
};

const getExtLower = (filename: string): string => {
  const s = String(filename || "").trim();
  const base = s.split("/").pop() || s;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
};

const parseTagsCsv = (csv: string): string[] => {
  const MAX_TAGS = 20;
  const MAX_LEN = 40;

  const parts = (csv || "").split(",");
  const out: string[] = [];
  const seen = new Set<string>();
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

const formatTagsCsv = (tags: string[] | undefined): string => {
  if (!tags || !tags.length) {
    return "";
  }
  return tags.join(", ");
};

const stop = (e: React.SyntheticEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const getFileLabel = (f: FmFileRow): string => {
  const name = safeTrim(f.original_filename);
  if (name) {
    return name;
  }
  return f.uid;
};

const guessIconLabel = (f: FmFileRow): string => {
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

const uploadWithXhr = async (input: {
  method: "PUT" | "POST";
  url: string;
  headers?: Record<string, string>;
  body: Blob;
  onProgress?: (pct: number) => void;
  withCredentials?: boolean;
}): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
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
        const pct = Math.max(
          0,
          Math.min(100, Math.round((evt.loaded / evt.total) * 100)),
        );
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
export const FmMediaLibrary: React.FC<FmMediaLibraryProps> = (props) => {
  const theme = useTheme();
  const contextApi = useFmApi();
  const api: FmApi = props.api || contextApi;

  const [search, setSearch] = useState(props.initialSearch || "");
  const [offset, setOffset] = useState(0);
  const limit = props.pageSize || 25;

  const enableUpload = props.enableUpload !== false;
  const enableBulkActions =
    props.enableBulkActions !== false && !props.onSelect;

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("thumbnails");
  const [publicFilter, setPublicFilter] = useState<PublicFilter>("all");
  const [includeArchived, setIncludeArchived] = useState(
    Boolean(props.includeArchived),
  );
  const [sortBy, setSortBy] = useState<FmFilesOrderBy>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [selectedUids, setSelectedUids] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeUid, setActiveUid] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<FmFileRow | null>(null);
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [activeUrlKind, setActiveUrlKind] = useState<
    "public" | "signed" | "canonical" | null
  >(null);
  const [activeError, setActiveError] = useState<string | null>(null);
  const [activeLoading, setActiveLoading] = useState<boolean>(false);

  const activeIsLocalStorage =
    String(activeFile?.storage_location || "")
      .trim()
      .toLowerCase() === "local";

  const [tagsText, setTagsText] = useState<string>("");

  const [renamingUid, setRenamingUid] = useState<string | null>(null);
  const [renameText, setRenameText] = useState<string>("");
  const [detailIsRenaming, setDetailIsRenaming] = useState<boolean>(false);
  const [detailRenameText, setDetailRenameText] = useState<string>("");
  const [renameSubmittingUid, setRenameSubmittingUid] = useState<string | null>(
    null,
  );
  const [renameSuccessMessage, setRenameSuccessMessage] = useState<
    string | null
  >(null);

  const [linksData, setLinksData] = useState<null | {
    items: any[];
    totalCount: number;
  }>(null);
  const [linksError, setLinksError] = useState<string | null>(null);
  const [linksLoading, setLinksLoading] = useState<boolean>(false);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadItems, setUploadItems] = useState<
    Array<{
      id: string;
      file: File;
      visibility: "public" | "private";
      modePreference: "auto" | "proxied";
      status: UploadStatus;
      progressPct: number | null;
      fileUid?: string;
      error?: string;
    }>
  >([]);

  const thumbUrlCacheRef = useRef<Map<string, string | null>>(new Map());
  const [thumbTick, setThumbTick] = useState(0);

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

  const { items, totalCount, isLoading, error, reload } = useFmListFiles({
    search: debouncedSearch.trim() || undefined,
    limit,
    offset,
    includeArchived,
    isPublic:
      publicFilter === "all"
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

  const handleDeleteInline = async (f: FmFileRow) => {
    const label = getFileLabel(f);
    const ok = window.confirm(
      `Delete this file?\n\n${label}\n${f.uid}\n\nThis action cannot be undone.`,
    );
    if (!ok) {
      return;
    }
    try {
      await api.deleteFile({ fileUid: f.uid, force: true });
      await reload();
    } catch (err: any) {
      window.alert(`Delete failed: ${err?.message || err}`);
    }
  };

  const pageInfo = useMemo(() => {
    const start = totalCount === 0 ? 0 : offset + 1;
    const end = Math.min(offset + limit, totalCount);
    return { start, end, totalCount };
  }, [offset, limit, totalCount]);

  const openDetail = (uid: string) => {
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

  const requestRenameConfirmIfNeeded = useCallback(
    async (params: { previous: string; next: string }): Promise<boolean> => {
      const prevExt = getExtLower(params.previous);
      const nextExt = getExtLower(params.next);
      if (!prevExt || !nextExt || prevExt === nextExt) {
        return true;
      }
      if (typeof window === "undefined") {
        return true;
      }
      return window.confirm(
        `You changed the filename extension from .${prevExt} to .${nextExt}.\n\nChanging extensions can be misleading and may cause the file to open incorrectly.\n\nContinue?`,
      );
    },
    [],
  );

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

      setActiveUrl(
        api.getContentUrl({
          fileUid: activeUid,
          variantKind: isImageMime(f.mime_type) ? "web" : undefined,
        }),
      );
      setActiveUrlKind("canonical");
    } catch (e: any) {
      setActiveError(e?.message || "Failed to load file");
    } finally {
      setActiveLoading(false);
    }
  }, [activeUid, api]);

  const submitRename = useCallback(
    async (params: {
      fileUid: string;
      previousName: string;
      nextName: string;
      source: "list" | "detail";
    }) => {
      if (renameSubmittingUid) {
        return;
      }

      const next = String(params.nextName || "").trim();
      if (!next) {
        if (params.source === "detail") {
          setActiveError("Filename is required");
        } else {
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
        } else {
          cancelInlineRename();
          await reload();
          if (activeUid && activeUid === params.fileUid) {
            await loadDetail();
          }
        }

        setRenameSuccessMessage(`Renamed to \"${next}\"`);
      } catch (e: any) {
        if (params.source === "detail") {
          setActiveError(e?.message || "Rename failed");
        } else {
          window.alert(`Rename failed: ${e?.message || e}`);
        }
      } finally {
        setRenameSubmittingUid((current) => {
          if (current === params.fileUid) {
            return null;
          }

          return current;
        });
      }
    },
    [
      api,
      reload,
      loadDetail,
      activeUid,
      renameSubmittingUid,
      requestRenameConfirmIfNeeded,
      cancelInlineRename,
    ],
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!activeFile) {
      setTagsText("");
      return;
    }
    setTagsText(formatTagsCsv(activeFile.tags));
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
    } catch (e: any) {
      setLinksError(e?.message || "Failed to load links");
      setLinksData(null);
    } finally {
      setLinksLoading(false);
    }
  }, [activeUid, api]);

  useEffect(() => {
    if (!activeUid) {
      return;
    }
    void loadLinks();
  }, [activeUid, loadLinks]);

  const toggleSelected = (uid: string) => {
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

  const setAllSelected = (checked: boolean) => {
    if (!checked) {
      setSelectedUids(new Set());
      return;
    }
    const next = new Set<string>();
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
    const ok =
      typeof window !== "undefined"
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
    const ok =
      typeof window !== "undefined"
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
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Hard-delete ${uids.length} file(s)?\n\nIf a file is linked, the server may archive it instead unless force-delete is allowed.`,
          )
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

    const toBucketRaw =
      typeof window !== "undefined"
        ? window.prompt("Move to bucket (optional):", "")
        : "";
    if (toBucketRaw === null) {
      return;
    }
    const toFolderRaw =
      typeof window !== "undefined"
        ? window.prompt("Move to folder path / prefix (optional):", "")
        : "";
    if (toFolderRaw === null) {
      return;
    }

    const toBucket = safeTrim(toBucketRaw) || undefined;
    const toFolderPath = safeTrim(toFolderRaw) || undefined;

    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Move ${uids.length} file(s)?\n\nBucket: ${toBucket || "(unchanged)"}\nFolder: ${toFolderPath || "(unchanged)"}`,
          )
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

    const addRaw =
      typeof window !== "undefined"
        ? window.prompt("Tags to add (comma-separated):", "")
        : "";
    if (addRaw === null) {
      return;
    }

    const removeRaw =
      typeof window !== "undefined"
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

    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Update tags on ${uids.length} file(s)?\n\nAdd: ${addTags.join(", ") || "(none)"}\nRemove: ${removeTags.join(", ") || "(none)"}`,
          )
        : true;
    if (!ok) {
      return;
    }

    const removeSet = new Set(removeTags);
    for (const uid of uids) {
      const fromList = items.find((f) => f.uid === uid);
      const file = fromList || (await api.getFile(uid));
      const existing = Array.isArray(file.tags) ? file.tags : [];

      const next = new Set<string>();
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

  const ensureThumbUrl = useCallback(
    async (f: FmFileRow) => {
      if (!isImageMime(f.mime_type)) {
        return;
      }

      const cache = thumbUrlCacheRef.current;
      if (cache.has(f.uid)) {
        return;
      }

      cache.set(
        f.uid,
        api.getContentUrl({ fileUid: f.uid, variantKind: "thumb" }),
      );
      setThumbTick((x) => x + 1);
    },
    [api],
  );

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

  const enqueueUploads = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const next = arr.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      visibility: "private" as const,
      modePreference: "auto" as const,
      status: "queued" as const,
      progressPct: null as number | null,
    }));
    setUploadItems((prev) => [...next, ...prev]);
  };

  const runUpload = async (itemId: string) => {
    const item = uploadItems.find((x) => x.id === itemId);
    if (!item) {
      return;
    }

    const setItem = (patch: Partial<(typeof uploadItems)[number]>) => {
      setUploadItems((prev) =>
        prev.map((x) => (x.id === itemId ? { ...x, ...patch } : x)),
      );
    };

    const PROGRESS = {
      init: { start: 0, end: 3 },
      upload: { start: 3, end: 75 },
      finalize: { start: 75, end: 85 },
      variantsProcess: { start: 85, end: 90 },
      variantsUpload: { start: 90, end: 100 },
    } as const;

    const setProgress = (pct: number | null) => {
      if (pct === null) {
        setItem({ progressPct: null });
        return;
      }
      setItem({ progressPct: clampPct(pct) });
    };

    setItem({ status: "init", error: undefined, progressPct: 0 });

    const uploadImageVariants = async (input: {
      fileUid: string;
      file: File;
      wantsProxied: boolean;
      setProgress: (pct: number) => void;
    }) => {
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

        const startPct =
          PROGRESS.variantsUpload.start +
          Math.round(
            (i / n) *
              (PROGRESS.variantsUpload.end - PROGRESS.variantsUpload.start),
          );
        const endPct =
          PROGRESS.variantsUpload.start +
          Math.round(
            ((i + 1) / n) *
              (PROGRESS.variantsUpload.end - PROGRESS.variantsUpload.start),
          );
        input.setProgress(startPct);

        if (
          init.mode === "direct" &&
          init.presignedPut &&
          !input.wantsProxied
        ) {
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
          onProgress: (pct) =>
            setProgress(
              scalePct(pct, PROGRESS.upload.start, PROGRESS.upload.end),
            ),
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
        } catch (e: any) {
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
        onProgress: (pct) =>
          setProgress(
            scalePct(pct, PROGRESS.upload.start, PROGRESS.upload.end),
          ),
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
      } catch (e: any) {
        setItem({
          error: `Uploaded, but variants failed: ${e?.message || "unknown error"}`,
        });
      }

      setItem({ status: "done" });
      setProgress(100);
      await reload();
    } catch (e: any) {
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

  return (
    <Box>
      {/* Toolbar */}
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        alignItems="center"
        useFlexGap
      >
        <TextField
          size="small"
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 180, flex: 1 }}
        />

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="fm-visibility-label">Visibility</InputLabel>
          <Select
            labelId="fm-visibility-label"
            value={publicFilter}
            label="Visibility"
            onChange={(e: SelectChangeEvent) =>
              setPublicFilter(e.target.value as PublicFilter)
            }
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="public">Public</MenuItem>
            <MenuItem value="private">Private</MenuItem>
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Checkbox
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              size="small"
            />
          }
          label="Archived"
        />

        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel id="fm-sortby-label">Sort by</InputLabel>
          <Select
            labelId="fm-sortby-label"
            value={sortBy}
            label="Sort by"
            onChange={(e: SelectChangeEvent) =>
              setSortBy(e.target.value as FmFilesOrderBy)
            }
          >
            <MenuItem value="created_at">Created</MenuItem>
            <MenuItem value="original_filename">Filename</MenuItem>
            <MenuItem value="byte_size">Size</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel id="fm-sortorder-label">Order</InputLabel>
          <Select
            labelId="fm-sortorder-label"
            value={sortOrder}
            label="Order"
            onChange={(e: SelectChangeEvent) =>
              setSortOrder(e.target.value as "asc" | "desc")
            }
          >
            <MenuItem value="desc">Desc</MenuItem>
            <MenuItem value="asc">Asc</MenuItem>
          </Select>
        </FormControl>

        <ToggleButtonGroup
          size="small"
          value={viewMode}
          exclusive
          onChange={(_, v) => {
            if (v) {
              setViewMode(v);
            }
          }}
        >
          <ToggleButton value="list">List</ToggleButton>
          <ToggleButton value="grid">Grid</ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          size="small"
          value={previewMode}
          exclusive
          onChange={(_, v) => {
            if (v) {
              setPreviewMode(v);
            }
          }}
        >
          <ToggleButton value="thumbnails">Thumbs</ToggleButton>
          <ToggleButton value="icons">Icons</ToggleButton>
        </ToggleButtonGroup>

        <Tooltip title="Refresh">
          <span>
            <IconButton
              aria-label="Refresh"
              onClick={() => void reload()}
              disabled={isLoading}
            >
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>

        {enableUpload && (
          <Button variant="contained" onClick={() => setIsUploadOpen(true)}>
            Upload
          </Button>
        )}
      </Stack>

      {/* Bulk actions bar */}
      {enableBulkActions && selectedUids.size > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          alignItems="center"
          useFlexGap
          sx={{ mt: 1.5 }}
        >
          <Chip label={`${selectedUids.size} selected`} size="small" />
          <Button
            size="small"
            variant="outlined"
            onClick={() => void bulkArchive()}
          >
            Archive
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void bulkRestore()}
          >
            Restore
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void bulkMove()}
          >
            Move
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => void bulkTags()}
          >
            Tags
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => void bulkDelete()}
          >
            Delete
          </Button>
          <Button
            size="small"
            variant="text"
            onClick={() => setSelectedUids(new Set())}
          >
            Clear
          </Button>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}

      {/* Loading indicator for initial load */}
      {isLoading && items.length === 0 && !error && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1.5 }}>
          <Table size="small" sx={{ tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                {enableBulkActions && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={
                        items.length > 0 && selectedUids.size === items.length
                      }
                      indeterminate={
                        selectedUids.size > 0 &&
                        selectedUids.size < items.length
                      }
                      onChange={(e) => setAllSelected(e.target.checked)}
                    />
                  </TableCell>
                )}
                <TableCell sx={{ width: "55%" }}>File</TableCell>
                <TableCell sx={{ width: "25%" }}>Type</TableCell>
                <TableCell align="right" sx={{ width: 110 }}>
                  Size
                </TableCell>
                <TableCell sx={{ width: props.onSelect ? 180 : 220 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((f) => {
                const isExternallySelected = Boolean(
                  selectedUid && f.uid === selectedUid,
                );
                const isMultiSelected = selectedUids.has(f.uid);
                const thumbUrl = thumbUrlCacheRef.current.get(f.uid) || null;
                const showThumb =
                  previewMode === "thumbnails" &&
                  isImageMime(f.mime_type) &&
                  Boolean(thumbUrl);
                const isRenaming = renamingUid === f.uid;
                const isRenameSubmitting = renameSubmittingUid === f.uid;

                return (
                  <TableRow
                    key={f.uid}
                    hover
                    selected={isExternallySelected || isMultiSelected}
                    sx={{ cursor: "pointer" }}
                    onClick={() => openDetail(f.uid)}
                  >
                    {enableBulkActions && (
                      <TableCell
                        padding="checkbox"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isRenameSubmitting ? (
                          <CircularProgress size={16} thickness={5} />
                        ) : (
                          <Checkbox
                            size="small"
                            checked={isMultiSelected}
                            onChange={() => toggleSelected(f.uid)}
                          />
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box
                          sx={{
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
                          }}
                        >
                          {showThumb ? (
                            <Box
                              component="img"
                              src={thumbUrl || ""}
                              alt=""
                              sx={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="text.secondary"
                            >
                              {guessIconLabel(f)}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                          >
                            {!isRenaming && (
                              <>
                                <Typography
                                  fontWeight={700}
                                  noWrap
                                  title={getFileLabel(f)}
                                  sx={{ minWidth: 0 }}
                                >
                                  {getFileLabel(f)}
                                </Typography>
                                {isRenameSubmitting ? (
                                  <Tooltip title="Renaming...">
                                    <CircularProgress size={16} thickness={5} />
                                  </Tooltip>
                                ) : (
                                  <Tooltip title="Rename">
                                    <IconButton
                                      size="small"
                                      disabled={Boolean(renameSubmittingUid)}
                                      onClick={(e) => {
                                        stop(e);
                                        setRenamingUid(f.uid);
                                        setRenameText(getFileLabel(f));
                                      }}
                                    >
                                      <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </>
                            )}
                            {isRenaming && (
                              <InlineRenameField
                                value={renameText}
                                onChange={setRenameText}
                                onSubmit={() =>
                                  void submitRename({
                                    fileUid: f.uid,
                                    previousName: String(
                                      f.original_filename || "",
                                    ).trim(),
                                    nextName: renameText,
                                    source: "list",
                                  })
                                }
                                onCancel={cancelInlineRename}
                                isSubmitting={isRenameSubmitting}
                              />
                            )}
                          </Stack>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ display: "block" }}
                          >
                            {f.uid}
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={0.5}
                            flexWrap="wrap"
                            sx={{ mt: 0.5 }}
                          >
                            {f.is_public && (
                              <Chip
                                label="Public"
                                size="small"
                                variant="outlined"
                              />
                            )}
                            {f.archived_at && (
                              <Chip
                                label="Archived"
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        noWrap
                        title={f.mime_type}
                        sx={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {f.mime_type}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        {formatBytes(f.byte_size)}
                      </Typography>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Stack direction="column" spacing={0.5}>
                        {props.onSelect && (
                          <FmSelectButton
                            file={f}
                            api={api}
                            onSelect={props.onSelect}
                          />
                        )}
                        <FmFileActionIcons
                          file={f}
                          api={api}
                          onOpenDetail={openDetail}
                          onDelete={handleDeleteInline}
                        />
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={enableBulkActions ? 5 : 4}>
                    <Typography
                      color="text.secondary"
                      sx={{ py: 2, textAlign: "center" }}
                    >
                      No files found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 1.5,
            mt: 1.5,
          }}
        >
          {items.map((f) => {
            const isMultiSelected = selectedUids.has(f.uid);
            const thumbUrl = thumbUrlCacheRef.current.get(f.uid) || null;
            const showThumb =
              previewMode === "thumbnails" &&
              isImageMime(f.mime_type) &&
              Boolean(thumbUrl);
            const isRenaming = renamingUid === f.uid;
            const isRenameSubmitting = renameSubmittingUid === f.uid;

            return (
              <Paper
                key={f.uid}
                variant="outlined"
                sx={{
                  p: 1.25,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  outline: isMultiSelected
                    ? `2px solid ${theme.palette.primary.main}`
                    : "none",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => openDetail(f.uid)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    stop(e);
                    openDetail(f.uid);
                  }
                }}
              >
                <Box
                  sx={{
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
                  }}
                >
                  {showThumb ? (
                    <Box
                      component="img"
                      src={thumbUrl || ""}
                      alt=""
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <Box textAlign="center">
                      <Typography fontWeight={800} color="text.secondary">
                        {guessIconLabel(f)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {isImageMime(f.mime_type)
                          ? "Image"
                          : isVideoMime(f.mime_type)
                            ? "Video"
                            : "File"}
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Filename + edit icon */}
                {!isRenaming ? (
                  <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{ minWidth: 0 }}
                  >
                    <Typography
                      fontWeight={700}
                      noWrap
                      title={getFileLabel(f)}
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      {getFileLabel(f)}
                    </Typography>
                    {isRenameSubmitting ? (
                      <CircularProgress size={16} thickness={5} />
                    ) : (
                      <Tooltip title="Rename">
                        <IconButton
                          size="small"
                          disabled={Boolean(renameSubmittingUid)}
                          onClick={(e) => {
                            stop(e);
                            setRenamingUid(f.uid);
                            setRenameText(getFileLabel(f));
                          }}
                        >
                          <EditOutlinedIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                ) : (
                  <Box onClick={(e) => stop(e)}>
                    <InlineRenameField
                      value={renameText}
                      onChange={setRenameText}
                      onSubmit={() =>
                        void submitRename({
                          fileUid: f.uid,
                          previousName: String(
                            f.original_filename || "",
                          ).trim(),
                          nextName: renameText,
                          source: "list",
                        })
                      }
                      onCancel={cancelInlineRename}
                      isSubmitting={isRenameSubmitting}
                      compact
                    />
                  </Box>
                )}

                {/* Select button (picker mode) */}
                {props.onSelect && (
                  <Box onClick={(e) => stop(e)}>
                    <FmSelectButton
                      file={f}
                      api={api}
                      onSelect={props.onSelect}
                    />
                  </Box>
                )}

                {/* Status chips + action icons */}
                <Stack
                  direction="row"
                  spacing={0.5}
                  flexWrap="wrap"
                  alignItems="center"
                >
                  {f.is_public && (
                    <Chip label="Public" size="small" variant="outlined" />
                  )}
                  {f.archived_at && (
                    <Chip label="Archived" size="small" variant="outlined" />
                  )}
                  <Chip
                    label={formatBytes(f.byte_size)}
                    size="small"
                    variant="outlined"
                  />
                  <Box
                    sx={{ ml: "auto", flexShrink: 0 }}
                    onClick={(e) => stop(e)}
                  >
                    <FmFileActionIcons
                      file={f}
                      api={api}
                      onOpenDetail={openDetail}
                      onDelete={handleDeleteInline}
                    />
                  </Box>
                </Stack>
              </Paper>
            );
          })}
          {!isLoading && items.length === 0 && (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              No files found.
            </Typography>
          )}
        </Box>
      )}

      {/* Pagination */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={isLoading || offset <= 0}
        >
          Prev
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => setOffset(offset + limit)}
          disabled={isLoading || offset + limit >= totalCount}
        >
          Next
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ ml: "auto" }}>
          {pageInfo.start}-{pageInfo.end} of {pageInfo.totalCount}
        </Typography>
      </Stack>

      {/* Detail Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(activeUid)}
        onClose={closeDetail}
        slotProps={{ backdrop: { sx: { zIndex: 1400 } } }}
        sx={{ zIndex: 1400 }}
        PaperProps={{ sx: { width: "min(520px, 100vw)", p: 2, zIndex: 1400 } }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          {!detailIsRenaming && (
            <>
              <Typography
                fontWeight={800}
                noWrap
                title={activeFile ? getFileLabel(activeFile) : activeUid || ""}
                sx={{ flex: 1, minWidth: 0 }}
              >
                {activeFile ? getFileLabel(activeFile) : activeUid}
              </Typography>
              {activeFile &&
                (renameSubmittingUid === activeFile.uid ? (
                  <Tooltip title="Renaming...">
                    <CircularProgress size={16} thickness={5} />
                  </Tooltip>
                ) : (
                  <Tooltip title="Rename">
                    <IconButton
                      size="small"
                      disabled={Boolean(renameSubmittingUid)}
                      onClick={(e) => {
                        stop(e);
                        setActiveError(null);
                        setDetailIsRenaming(true);
                        setDetailRenameText(getFileLabel(activeFile));
                      }}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ))}
            </>
          )}
          {detailIsRenaming && activeFile && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ flex: 1, minWidth: 0 }}
            >
              <TextField
                size="small"
                value={detailRenameText}
                disabled={renameSubmittingUid === activeFile.uid}
                autoFocus
                fullWidth
                onClick={(e) => stop(e)}
                onChange={(e) => setDetailRenameText(e.target.value)}
                onKeyDown={(e) => {
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
                      previousName: String(
                        activeFile.original_filename || "",
                      ).trim(),
                      nextName: detailRenameText,
                      source: "detail",
                    });
                  }
                }}
              />
              <Tooltip title="Save">
                <IconButton
                  size="small"
                  disabled={renameSubmittingUid === activeFile.uid}
                  onClick={(e) => {
                    stop(e);
                    void submitRename({
                      fileUid: activeFile.uid,
                      previousName: String(
                        activeFile.original_filename || "",
                      ).trim(),
                      nextName: detailRenameText,
                      source: "detail",
                    });
                  }}
                >
                  {renameSubmittingUid === activeFile.uid ? (
                    <CircularProgress size={16} thickness={5} />
                  ) : (
                    <CheckOutlinedIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          )}
          <Button variant="outlined" onClick={closeDetail}>
            Close
          </Button>
        </Stack>

        {activeLoading && <LinearProgress sx={{ mt: 1.5 }} />}
        {activeError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {activeError}
          </Alert>
        )}

        {activeFile && (
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* UID */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                UID
              </Typography>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 0.25 }}
              >
                <Typography
                  variant="body2"
                  sx={{ wordBreak: "break-all", fontFamily: "monospace" }}
                >
                  {activeFile.uid}
                </Typography>
                <CopyButton
                  value={activeFile.uid}
                  tooltip="Copy UID"
                  size="small"
                  iconFontSize="small"
                />
              </Stack>
            </Box>

            {/* Preview */}
            <Box>
              <Typography variant="caption" color="text.secondary">
                Preview
              </Typography>
              <Paper
                variant="outlined"
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                {activeUrl && isImageMime(activeFile.mime_type) && (
                  <Box
                    component="img"
                    src={activeUrl}
                    alt=""
                    sx={{ width: "100%", maxHeight: 320, objectFit: "contain" }}
                  />
                )}
                {activeUrl && isSupportedVideoMime(activeFile.mime_type) && (
                  <Box
                    component="video"
                    controls
                    preload="metadata"
                    sx={{ width: "100%", maxHeight: 320 }}
                  >
                    <source src={activeUrl} type={activeFile.mime_type} />
                    Your browser cannot play this video.
                  </Box>
                )}
                {(!activeUrl ||
                  (!isImageMime(activeFile.mime_type) &&
                    !isSupportedVideoMime(activeFile.mime_type))) && (
                  <Typography color="text.secondary" variant="body2">
                    No inline preview available for{" "}
                    {activeFile.mime_type || "this file"}.
                  </Typography>
                )}
              </Paper>

              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                <CopyButton
                  value={api.getContentUrl({ fileUid: activeFile.uid })}
                  tooltip="Copy URL"
                  size="small"
                  iconFontSize="small"
                />
                <Button
                  size="small"
                  variant="outlined"
                  component="a"
                  href={api.getContentUrl({
                    fileUid: activeFile.uid,
                    download: true,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download
                </Button>
                {activeUrlKind && (
                  <Chip label={`URL: ${activeUrlKind}`} size="small" />
                )}
              </Stack>
            </Box>

            {/* Metadata */}
            <Box>
              <Typography fontWeight={800}>Metadata</Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                <TextField
                  size="small"
                  label="Title"
                  value={safeTrim((activeFile as any).title)}
                  onChange={(e) =>
                    setActiveFile({
                      ...activeFile,
                      title: e.target.value,
                    } as any)
                  }
                />
                <TextField
                  size="small"
                  label="Alt text (images)"
                  value={safeTrim((activeFile as any).alt_text)}
                  onChange={(e) =>
                    setActiveFile({
                      ...activeFile,
                      alt_text: e.target.value,
                    } as any)
                  }
                />
                <TextField
                  size="small"
                  label="Tags (comma-separated)"
                  placeholder="e.g. hero, landing, press"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={
                        activeIsLocalStorage
                          ? true
                          : Boolean((activeFile as any).is_public)
                      }
                      disabled={activeIsLocalStorage}
                      onChange={(e) =>
                        setActiveFile({
                          ...activeFile,
                          is_public: e.target.checked,
                        } as any)
                      }
                    />
                  }
                  label="Public"
                />
                {activeIsLocalStorage && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: -1 }}
                  >
                    Local files are always public.
                  </Typography>
                )}
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    onClick={() =>
                      void (async () => {
                        setActiveError(null);
                        try {
                          const updated = await api.patchFile({
                            fileUid: activeFile.uid,
                            patch: {
                              title: safeTrim((activeFile as any).title),
                              alt_text: safeTrim((activeFile as any).alt_text),
                              tags: parseTagsCsv(tagsText),
                              is_public: activeIsLocalStorage
                                ? true
                                : Boolean((activeFile as any).is_public),
                            },
                          });
                          setActiveFile({ ...activeFile, ...updated });
                          await reload();
                          await loadDetail();
                        } catch (e: any) {
                          setActiveError(e?.message || "Save failed");
                        }
                      })()
                    }
                  >
                    Save
                  </Button>
                  <Button variant="outlined" onClick={() => void loadDetail()}>
                    Reload
                  </Button>
                </Stack>
              </Stack>
            </Box>

            {/* Actions */}
            <Box>
              <Typography fontWeight={800}>Actions</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {!activeFile.archived_at && (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      void (async () => {
                        await api.archiveFile(activeFile.uid);
                        await reload();
                        await loadDetail();
                      })()
                    }
                  >
                    Archive
                  </Button>
                )}
                {activeFile.archived_at && (
                  <Button
                    variant="outlined"
                    onClick={() =>
                      void (async () => {
                        await api.restoreFile(activeFile.uid);
                        await reload();
                        await loadDetail();
                      })()
                    }
                  >
                    Restore
                  </Button>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() =>
                    void (async () => {
                      const ok =
                        typeof window !== "undefined"
                          ? window.confirm(
                              "Delete this file?\n\nIf it is linked, the server may archive it unless force-delete is allowed.",
                            )
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
                    })()
                  }
                >
                  Delete
                </Button>
              </Stack>
            </Box>

            {/* Move */}
            <Box>
              <Typography fontWeight={800}>Move</Typography>
              <MoveForm
                fileUid={activeFile.uid}
                onMove={async (toBucket, toFolderPath) => {
                  await api.moveFile({
                    fileUid: activeFile.uid,
                    toBucket,
                    toFolderPath,
                  });
                  await reload();
                  await loadDetail();
                }}
              />
            </Box>

            {/* Where used (Links) */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography fontWeight={800}>Where used</Typography>
                <Button
                  size="small"
                  sx={{ ml: "auto" }}
                  onClick={() => void loadLinks()}
                >
                  Refresh
                </Button>
              </Stack>

              {linksLoading && <LinearProgress sx={{ mt: 1 }} />}
              {linksError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {linksError}
                </Alert>
              )}

              <CreateLinkForm
                onCreate={async (
                  linkedEntityType,
                  linkedEntityUid,
                  linkedField,
                ) => {
                  await api.createLink({
                    fileUid: activeFile.uid,
                    linkedEntityType,
                    linkedEntityUid,
                    linkedField,
                  });
                  await loadLinks();
                }}
              />

              <TableContainer
                component={Paper}
                variant="outlined"
                sx={{ mt: 1.5 }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Entity</TableCell>
                      <TableCell>UID</TableCell>
                      <TableCell>Field</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(linksData?.items || []).map((l: any) => (
                      <TableRow key={String(l.id)}>
                        <TableCell>{l.linked_entity_type}</TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: "monospace" }}
                          >
                            {l.linked_entity_uid}
                          </Typography>
                        </TableCell>
                        <TableCell>{l.linked_field}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              void (async () => {
                                await api.deleteLink({
                                  fileUid: activeFile.uid,
                                  linkedEntityType: String(
                                    l.linked_entity_type,
                                  ),
                                  linkedEntityUid: String(l.linked_entity_uid),
                                  linkedField: String(l.linked_field || "body"),
                                });
                                await loadLinks();
                              })()
                            }
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!linksLoading && (linksData?.items || []).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Typography color="text.secondary" variant="body2">
                            No links.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        )}
      </Drawer>

      {/* Upload Dialog */}
      <Dialog
        open={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Upload</DialogTitle>
        <DialogContent dividers>
          <Paper
            variant="outlined"
            sx={{
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
            }}
            onDragOver={(e) => {
              stop(e);
              if (!isDragActive) {
                setIsDragActive(true);
              }
            }}
            onDragEnter={(e) => {
              stop(e);
              setIsDragActive(true);
            }}
            onDragLeave={(e) => {
              stop(e);
              setIsDragActive(false);
            }}
            onDrop={(e) => {
              stop(e);
              setIsDragActive(false);
              if (e.dataTransfer?.files?.length) {
                enqueueUploads(e.dataTransfer.files);
              }
            }}
          >
            <Typography fontWeight={700}>Drag & drop files here</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Or choose files
            </Typography>
            <Button variant="outlined" component="label" sx={{ mt: 1.5 }}>
              Browse
              <input
                type="file"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) {
                    enqueueUploads(e.target.files);
                  }
                  e.currentTarget.value = "";
                }}
              />
            </Button>
          </Paper>

          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => void runAllUploads()}>
              Upload all
            </Button>
            <Button variant="outlined" onClick={() => setUploadItems([])}>
              Clear
            </Button>
          </Stack>

          <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Visibility</TableCell>
                  <TableCell>Mode</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {uploadItems.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Typography fontWeight={700}>{u.file.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBytes(u.file.size)} ·{" "}
                        {u.file.type || "application/octet-stream"}
                      </Typography>
                      {u.error && (
                        <Alert
                          severity={u.status === "error" ? "error" : "warning"}
                          sx={{ mt: 0.5, py: 0, px: 1 }}
                        >
                          {u.error}
                        </Alert>
                      )}
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select
                          value={u.visibility}
                          onChange={(e: SelectChangeEvent) =>
                            setUploadItems((prev) =>
                              prev.map((x) =>
                                x.id === u.id
                                  ? {
                                      ...x,
                                      visibility: e.target.value as
                                        | "public"
                                        | "private",
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <MenuItem value="private">Private</MenuItem>
                          <MenuItem value="public">Public</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 90 }}>
                        <Select
                          value={u.modePreference}
                          onChange={(e: SelectChangeEvent) =>
                            setUploadItems((prev) =>
                              prev.map((x) =>
                                x.id === u.id
                                  ? {
                                      ...x,
                                      modePreference: e.target.value as
                                        | "auto"
                                        | "proxied",
                                    }
                                  : x,
                              ),
                            )
                          }
                        >
                          <MenuItem value="auto">Auto</MenuItem>
                          <MenuItem value="proxied">Proxied</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatUploadStatus(u)}
                      </Typography>
                      {u.progressPct !== null && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 0.5,
                          }}
                        >
                          {(() => {
                            const hasWarningOrError =
                              u.status === "error" || Boolean(u.error);
                            const isCompleteClean =
                              u.status === "done" && !hasWarningOrError;

                            return (
                              <LinearProgress
                                variant="determinate"
                                value={u.progressPct}
                                sx={{
                                  flex: 1,
                                  ...(isCompleteClean && {
                                    bgcolor: "success.light",
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor: "success.main",
                                    },
                                  }),
                                }}
                              />
                            );
                          })()}
                          <Typography variant="caption">
                            {u.progressPct}%
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        {(() => {
                          const inFlight =
                            u.status === "uploading" ||
                            u.status === "finalizing" ||
                            u.status === "processing_variants" ||
                            u.status === "uploading_variants" ||
                            u.status === "init";
                          const hasWarningOrError =
                            u.status === "error" || Boolean(u.error);
                          const label =
                            u.status === "error"
                              ? "Retry"
                              : u.status === "done"
                                ? hasWarningOrError
                                  ? "Reupload"
                                  : "Uploaded"
                                : "Upload";

                          return (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => void runUpload(u.id)}
                              disabled={
                                inFlight ||
                                (u.status === "done" && !hasWarningOrError)
                              }
                            >
                              {label}
                            </Button>
                          );
                        })()}
                        <Tooltip title="Remove">
                          <span>
                            <IconButton
                              size="small"
                              sx={{ color: "error.main" }}
                              onClick={() =>
                                setUploadItems((prev) =>
                                  prev.filter((x) => x.id !== u.id),
                                )
                              }
                              disabled={
                                u.status === "uploading" ||
                                u.status === "finalizing" ||
                                u.status === "processing_variants" ||
                                u.status === "uploading_variants" ||
                                u.status === "init"
                              }
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
                {uploadItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary" variant="body2">
                        No files queued.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsUploadOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(renameSuccessMessage)}
        autoHideDuration={2500}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ zIndex: (muiTheme) => muiTheme.zIndex.snackbar + 2 }}
        onClose={() => setRenameSuccessMessage(null)}
      >
        <Alert
          onClose={() => setRenameSuccessMessage(null)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {renameSuccessMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Shared list/grid sub-components ────────────────────────────────────────

/** Inline rename text field with save/cancel, shared by list and grid views. */
const InlineRenameField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting: boolean;
  /** Compact mode for grid view (single-line, smaller font). */
  compact?: boolean;
}> = ({ value, onChange, onSubmit, onCancel, isSubmitting, compact }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <TextField
      size="small"
      multiline={!compact}
      maxRows={compact ? undefined : 3}
      value={value}
      disabled={isSubmitting}
      autoFocus
      fullWidth={compact}
      onClick={(e) => stop(e)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
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
      }}
      sx={{
        "& .MuiInputBase-root": { fontSize: compact ? 13 : 14 },
        ...(compact ? {} : { minWidth: 200 }),
      }}
    />
    <Tooltip title="Save">
      <IconButton
        size="small"
        disabled={isSubmitting}
        onClick={(e) => {
          stop(e);
          onSubmit();
        }}
      >
        {isSubmitting ? (
          <CircularProgress size={16} thickness={5} />
        ) : (
          <CheckOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  </Stack>
);

/** Shared action icons: copy URL, details, delete. Used by both list and grid views. */
const FmFileActionIcons: React.FC<{
  file: FmFileRow;
  api: FmApi;
  onOpenDetail: (uid: string) => void;
  onDelete: (file: FmFileRow) => void;
}> = ({ file, api, onOpenDetail, onDelete }) => (
  <Stack direction="row" spacing={0.5} alignItems="center">
    <CopyButton
      value={api.getContentUrl({ fileUid: file.uid })}
      tooltip="Copy URL"
      size="small"
      iconFontSize="small"
    />
    <Tooltip title="Details">
      <IconButton size="small" onClick={() => onOpenDetail(file.uid)}>
        <InfoOutlinedIcon fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Delete">
      <IconButton
        size="small"
        sx={{ color: "error.main" }}
        onClick={() => void onDelete(file)}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

/**
 * Select button with optional variant-size dropdown for images.
 *
 * For images: renders a split `ButtonGroup` — the main button selects the
 * original file; the dropdown arrow lazily loads variants from
 * `fm_file_variants` and shows resolution options (e.g. "Select size: 640×480").
 *
 * For non-images: renders a plain "Select" button.
 */
const FmSelectButton: React.FC<{
  file: FmFileRow;
  api: FmApi;
  onSelect: (file: FmFileRow, variant?: FmFileVariantRow) => void;
}> = ({ file, api, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<FmFileVariantRow[] | null>(() => {
    // Use pre-loaded variants from the file row if available (passthrough field).
    const embedded = (file as any).variants as FmFileVariantRow[] | undefined;
    if (Array.isArray(embedded)) {
      return embedded
        .filter((v) => v.width && v.height)
        .sort((a, b) => (a.width || 0) - (b.width || 0));
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

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
      const raw: FmFileVariantRow[] = Array.isArray(result)
        ? result
        : result.items || [];
      const sized = raw
        .filter((v: FmFileVariantRow) => v.width && v.height)
        .sort(
          (a: FmFileVariantRow, b: FmFileVariantRow) =>
            (a.width || 0) - (b.width || 0),
        );
      setVariants(sized);
      setOpen(true);
    } catch {
      setVariants([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [open, variants, api, file.uid]);

  if (!isImage) {
    return (
      <Button
        size="small"
        variant="contained"
        onClick={() => onSelect(file)}
        sx={{ minWidth: 0, px: 1, alignSelf: "flex-start" }}
      >
        Select
      </Button>
    );
  }

  return (
    <>
      <ButtonGroup
        variant="contained"
        size="small"
        ref={anchorRef}
        sx={{ alignSelf: "flex-start" }}
      >
        <Button onClick={() => onSelect(file)} sx={{ minWidth: 0, px: 1 }}>
          Select
        </Button>
        <Button
          size="small"
          onClick={() => void handleToggle()}
          sx={{ minWidth: 0, px: 0.5 }}
          aria-label="Select variant size"
        >
          {loading ? (
            <CircularProgress size={16} thickness={5} color="inherit" />
          ) : (
            <ArrowDropDownIcon fontSize="small" />
          )}
        </Button>
      </ButtonGroup>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-start"
        transition
        sx={{ zIndex: 1500 }}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom-start" ? "left top" : "left bottom",
            }}
          >
            <Paper elevation={8}>
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <MenuList dense>
                  {variants && variants.length > 0 ? (
                    variants.map((v) => (
                      <MenuItem
                        key={v.uid}
                        onClick={() => {
                          onSelect(file, v);
                          setOpen(false);
                        }}
                      >
                        {`Select size: ${v.width}\u00D7${v.height}`}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem disabled>No size variants</MenuItem>
                  )}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const MoveForm: React.FC<{
  fileUid: string;
  onMove: (
    toBucket: string | undefined,
    toFolderPath: string | undefined,
  ) => Promise<void>;
}> = ({ onMove }) => {
  const [toBucket, setToBucket] = useState("");
  const [toFolderPath, setToFolderPath] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      {error && (
        <Alert severity="error" sx={{ py: 0.5 }}>
          {error}
        </Alert>
      )}
      <TextField
        size="small"
        label="Bucket (optional)"
        value={toBucket}
        onChange={(e) => setToBucket(e.target.value)}
      />
      <TextField
        size="small"
        label="Folder path / prefix (optional)"
        placeholder="e.g. images/landing/"
        value={toFolderPath}
        onChange={(e) => setToFolderPath(e.target.value)}
      />
      <Box>
        <Button
          variant="outlined"
          disabled={isBusy}
          onClick={() =>
            void (async () => {
              setIsBusy(true);
              setError(null);
              try {
                await onMove(
                  safeTrim(toBucket) || undefined,
                  safeTrim(toFolderPath) || undefined,
                );
              } catch (e: any) {
                setError(e?.message || "Move failed");
              } finally {
                setIsBusy(false);
              }
            })()
          }
        >
          Move
        </Button>
      </Box>
    </Stack>
  );
};

const CreateLinkForm: React.FC<{
  onCreate: (
    linkedEntityType: string,
    linkedEntityUid: string,
    linkedField?: string,
  ) => Promise<void>;
}> = ({ onCreate }) => {
  const [linkedEntityType, setLinkedEntityType] = useState("cms");
  const [linkedEntityUid, setLinkedEntityUid] = useState("");
  const [linkedField, setLinkedField] = useState("body");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Typography fontWeight={700} variant="body2">
        Add link
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={1.5} sx={{ mt: 1 }}>
        <TextField
          size="small"
          label="Entity type"
          value={linkedEntityType}
          onChange={(e) => setLinkedEntityType(e.target.value)}
        />
        <TextField
          size="small"
          label="Entity UID"
          value={linkedEntityUid}
          onChange={(e) => setLinkedEntityUid(e.target.value)}
        />
        <TextField
          size="small"
          label="Field"
          value={linkedField}
          onChange={(e) => setLinkedField(e.target.value)}
        />
        <Box>
          <Button
            variant="outlined"
            disabled={isBusy}
            onClick={() =>
              void (async () => {
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
                } catch (e: any) {
                  setError(e?.message || "Create link failed");
                } finally {
                  setIsBusy(false);
                }
              })()
            }
          >
            Add
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default FmMediaLibrary;
