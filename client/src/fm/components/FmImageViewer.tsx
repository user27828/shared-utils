/**
 * FmImageViewer — Full-width image viewing dialog with variant size selection.
 *
 * Used by FmMediaLibrary to expand image previews from grid and detail views
 * into a larger viewer with a size picker. Lazily loads available variants
 * via the FmApi and displays a toggle group for switching between the original
 * image and generated size variants.
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
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import type {
  FmFileRow,
  FmFileVariantRow,
} from "../../../../utils/src/fm/types.js";
import type { FmApi } from "../FmApi.js";

/** Sentinel value representing the original (non-variant) image. */
const ORIGINAL_SIZE = "original" as const;

/** Size option representing either the original or a specific variant width. */
interface SizeOption {
  /** Display label (e.g. "Original", "640×480"). */
  label: string;
  /** `"original"` for original, numeric width for variants. */
  value: typeof ORIGINAL_SIZE | number;
  /** The variant row (only for non-original options). */
  variant?: FmFileVariantRow;
}

/** Props for the {@link FmImageViewer} component. */
export interface FmImageViewerProps {
  /** Whether the viewer dialog is open. */
  open: boolean;
  /** Called when the viewer should close. */
  onClose: () => void;
  /** UID of the file to display. */
  fileUid: string;
  /** FmApi instance for content URLs and variant fetching. */
  api: FmApi;
  /** Optional title displayed in the dialog header. */
  title?: string;
  /**
   * Optional file row — required when `onSelect` is provided so the callback
   * can pass the full file row to the picker consumer.
   */
  file?: FmFileRow | null;
  /**
   * When provided, the viewer is in "picker" mode and shows a "Select" button.
   * Clicking it passes the file and (optionally) the selected variant.
   */
  onSelect?: (file: FmFileRow, variant?: FmFileVariantRow) => void;
}

/**
 * Full-width image viewer dialog with variant size selection.
 *
 * Renders the image at maximum horizontal width inside an MUI Dialog.
 * Provides:
 * - A toggle button group showing "Original" + all available variant sizes
 *   (displayed above the image)
 * - Lazy variant loading on first open (cached for lifetime of mount)
 * - Current selection visually indicated via the ToggleButtonGroup value
 * - An optional "Select" button when `onSelect` is provided (picker mode)
 *
 * The dialog content is unmounted when closed (MUI default), so no
 * resources remain loaded while the viewer is hidden.
 */
export const FmImageViewer: React.FC<FmImageViewerProps> = ({
  open,
  onClose,
  fileUid,
  api,
  title,
  file,
  onSelect,
}) => {
  const [variants, setVariants] = useState<FmFileVariantRow[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [variantsFetched, setVariantsFetched] = useState(false);
  /** Selected size: `"original"` = original, number = variant width. */
  const [selectedSize, setSelectedSize] = useState<
    typeof ORIGINAL_SIZE | number
  >(ORIGINAL_SIZE);
  /** Track the fileUid that variants were fetched for, to reset on change. */
  const [fetchedForUid, setFetchedForUid] = useState<string>("");
  /** Ref guard to prevent the fetch effect cleanup from cancelling in-flight requests. */
  const fetchingRef = useRef(false);
  /** Whether the image is currently loading after a size/url change. */
  const [imageLoading, setImageLoading] = useState(false);

  // Reset state when fileUid changes or dialog opens with a new file.
  useEffect(() => {
    if (!open) {
      return;
    }
    if (fetchedForUid === fileUid) {
      return;
    }
    // New file — reset everything and fetch variants.
    setSelectedSize(ORIGINAL_SIZE);
    setVariants([]);
    setVariantsFetched(false);
    fetchingRef.current = false;
    setFetchedForUid(fileUid);
  }, [open, fileUid, fetchedForUid]);

  // Fetch variants lazily when dialog opens.
  // NOTE: `loadingVariants` is intentionally excluded from deps to prevent the
  // effect cleanup from cancelling the in-flight fetch when `setLoadingVariants`
  // triggers a re-render.
  useEffect(() => {
    if (!open || !fileUid || variantsFetched || fetchingRef.current) {
      return;
    }
    let cancelled = false;
    fetchingRef.current = true;
    const fetchVariants = async () => {
      setLoadingVariants(true);
      try {
        const result = await api.listVariants(fileUid);
        if (cancelled) {
          return;
        }
        const raw: FmFileVariantRow[] = Array.isArray(result)
          ? result
          : result.items || [];
        const sized = raw
          .filter((v) => v.width && v.height)
          .sort((a, b) => (a.width || 0) - (b.width || 0));
        setVariants(sized);
      } catch {
        if (!cancelled) {
          setVariants([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingVariants(false);
          setVariantsFetched(true);
          fetchingRef.current = false;
        }
      }
    };
    void fetchVariants();
    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fileUid, variantsFetched, api]);

  // Build size options: original first, then variants ascending by width.
  const sizeOptions: SizeOption[] = useMemo(() => {
    const opts: SizeOption[] = [{ label: "Original", value: ORIGINAL_SIZE }];
    for (const v of variants) {
      opts.push({
        label: `${v.width}\u00D7${v.height}`,
        value: v.width!,
        variant: v,
      });
    }
    return opts;
  }, [variants]);

  // Build the image URL based on the selected size.
  const imageUrl = useMemo(() => {
    if (!fileUid) {
      return "";
    }
    if (selectedSize === ORIGINAL_SIZE) {
      return api.getContentUrl({ fileUid });
    }
    return api.getContentUrl({ fileUid, variantWidth: selectedSize });
  }, [fileUid, selectedSize, api]);

  /** The currently-selected variant row (undefined when "Original" is chosen). */
  const selectedVariant = useMemo(() => {
    if (selectedSize === ORIGINAL_SIZE) {
      return undefined;
    }
    return sizeOptions.find((o) => o.value === selectedSize)?.variant;
  }, [selectedSize, sizeOptions]);

  const handleSizeChange = useCallback(
    (
      _: React.MouseEvent<HTMLElement>,
      value: typeof ORIGINAL_SIZE | number | undefined,
    ) => {
      // ToggleButtonGroup passes undefined when deselecting — keep current.
      if (value === undefined) {
        return;
      }
      setImageLoading(true);
      setSelectedSize(value);
    },
    [],
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(() => {
    if (onSelect && file) {
      onSelect(file, selectedVariant);
    }
  }, [onSelect, file, selectedVariant]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { bgcolor: "background.default" } }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        sx={{ px: 2, py: 1 }}
      >
        <Typography fontWeight={700} noWrap sx={{ flex: 1, minWidth: 0 }}>
          {title || "Image"}
        </Typography>
        <Tooltip title="Close">
          <IconButton size="small" edge="end" onClick={handleClose}>
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>
        {/* Size selection bar — above the image */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" fontWeight={600} color="text.secondary">
            Size:
          </Typography>
          {loadingVariants ? (
            <CircularProgress size={20} thickness={5} />
          ) : (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={selectedSize}
              onChange={handleSizeChange}
              aria-label="Image size selection"
            >
              {sizeOptions.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          {/* Select button in picker mode */}
          {onSelect && file && (
            <Button
              variant="contained"
              size="small"
              onClick={handleSelect}
              sx={{ ml: "auto" }}
            >
              Select
            </Button>
          )}
        </Box>

        {/* Image display */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 200,
            p: 2,
          }}
        >
          {imageUrl ? (
            <Box sx={{ position: "relative", display: "inline-flex" }}>
              <Box
                component="img"
                src={imageUrl}
                alt={title || ""}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
                sx={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  display: "block",
                  opacity: imageLoading ? 0.4 : 1,
                  transition: "opacity 0.2s ease",
                }}
              />
              {imageLoading && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={36} thickness={4} />
                </Box>
              )}
            </Box>
          ) : (
            <Typography color="text.secondary">No image available</Typography>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default FmImageViewer;
