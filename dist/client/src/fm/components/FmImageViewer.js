import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { Box, Button, CircularProgress, Dialog, DialogContent, IconButton, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography, } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
/** Sentinel value representing the original (non-variant) image. */
const ORIGINAL_SIZE = "original";
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
export const FmImageViewer = ({ open, onClose, fileUid, api, title, file, onSelect, }) => {
    const [variants, setVariants] = useState([]);
    const [loadingVariants, setLoadingVariants] = useState(false);
    const [variantsFetched, setVariantsFetched] = useState(false);
    /** Selected size: `"original"` = original, number = variant width. */
    const [selectedSize, setSelectedSize] = useState(ORIGINAL_SIZE);
    /** Track the fileUid that variants were fetched for, to reset on change. */
    const [fetchedForUid, setFetchedForUid] = useState("");
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
                const raw = Array.isArray(result)
                    ? result
                    : result.items || [];
                const sized = raw
                    .filter((v) => v.width && v.height)
                    .sort((a, b) => (a.width || 0) - (b.width || 0));
                setVariants(sized);
            }
            catch {
                if (!cancelled) {
                    setVariants([]);
                }
            }
            finally {
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
    const sizeOptions = useMemo(() => {
        const opts = [{ label: "Original", value: ORIGINAL_SIZE }];
        for (const v of variants) {
            opts.push({
                label: `${v.width}\u00D7${v.height}`,
                value: v.width,
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
    const handleSizeChange = useCallback((_, value) => {
        // ToggleButtonGroup passes undefined when deselecting — keep current.
        if (value === undefined) {
            return;
        }
        setImageLoading(true);
        setSelectedSize(value);
    }, []);
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);
    const handleSelect = useCallback(() => {
        if (onSelect && file) {
            onSelect(file, selectedVariant);
        }
    }, [onSelect, file, selectedVariant]);
    return (_jsxs(Dialog, { open: open, onClose: handleClose, fullWidth: true, maxWidth: "lg", PaperProps: { sx: { bgcolor: "background.default" } }, children: [_jsxs(Stack, { direction: "row", alignItems: "center", spacing: 1, sx: { px: 2, py: 1 }, children: [_jsx(Typography, { fontWeight: 700, noWrap: true, sx: { flex: 1, minWidth: 0 }, children: title || "Image" }), _jsx(Tooltip, { title: "Close", children: _jsx(IconButton, { size: "small", edge: "end", onClick: handleClose, children: _jsx(CloseIcon, {}) }) })] }), _jsxs(DialogContent, { sx: { p: 0, display: "flex", flexDirection: "column" }, children: [_jsxs(Box, { sx: {
                            px: 2,
                            py: 1.5,
                            borderBottom: 1,
                            borderColor: "divider",
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                            flexWrap: "wrap",
                        }, children: [_jsx(Typography, { variant: "body2", fontWeight: 600, color: "text.secondary", children: "Size:" }), loadingVariants ? (_jsx(CircularProgress, { size: 20, thickness: 5 })) : (_jsx(ToggleButtonGroup, { size: "small", exclusive: true, value: selectedSize, onChange: handleSizeChange, "aria-label": "Image size selection", children: sizeOptions.map((opt) => (_jsx(ToggleButton, { value: opt.value, children: opt.label }, opt.value))) })), onSelect && file && (_jsx(Button, { variant: "contained", size: "small", onClick: handleSelect, sx: { ml: "auto" }, children: "Select" }))] }), _jsx(Box, { sx: {
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minHeight: 200,
                            p: 2,
                        }, children: imageUrl ? (_jsxs(Box, { sx: { position: "relative", display: "inline-flex" }, children: [_jsx(Box, { component: "img", src: imageUrl, alt: title || "", onLoad: () => setImageLoading(false), onError: () => setImageLoading(false), sx: {
                                        maxWidth: "100%",
                                        maxHeight: "70vh",
                                        objectFit: "contain",
                                        display: "block",
                                        opacity: imageLoading ? 0.4 : 1,
                                        transition: "opacity 0.2s ease",
                                    } }), imageLoading && (_jsx(Box, { sx: {
                                        position: "absolute",
                                        inset: 0,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }, children: _jsx(CircularProgress, { size: 36, thickness: 4 }) }))] })) : (_jsx(Typography, { color: "text.secondary", children: "No image available" })) })] })] }));
};
export default FmImageViewer;
