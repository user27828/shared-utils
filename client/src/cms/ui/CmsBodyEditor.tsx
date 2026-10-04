/**
 * CMS Body Editor — shared-utils
 *
 * Multi-format content editor that switches between:
 * - HTML: a host-injected TinyMCE or CKEditor adapter
 * - Markdown: a host-injected MDXEditor adapter
 * - JSON/Text: Plain textarea
 *
 * Media picker integration is injectable via callbacks.
 */
import React, {
  useMemo,
  useRef,
  Suspense,
  useCallback,
  useEffect,
} from "react";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import { useColorScheme } from "@mui/material/styles";
import type {
  CmsBodyEditorAdapterMap,
  CmsBodyEditorEngineProps,
  CmsEditorPreference,
  CmsImageUploadHandler,
} from "./CmsAdminUiConfig.js";
import type {
  WysiwygImageUploadRequest,
  WysiwygPickRequest,
} from "../../components/wysiwyg/WysiwygEditor.js";
import {
  hasEmbeddedBase64Image,
  normalizeEmbeddedHtmlImages,
} from "./normalizeEmbeddedHtmlImages.js";

// ─── Paste sanitization helpers ───────────────────────────────────────────

/**
 * Returns true when `src` is a local-filesystem URL that can never be loaded
 * by the browser from a web origin — e.g. the `file:///C:/Users/.../msohtmlclip`
 * temp paths that Microsoft Word embeds when pasting rich content.
 */
const isLocalFileImageSrc = (src: string): boolean => {
  const trimmed = src.trim().toLowerCase();
  // Covers file:///... and file:\\... (Windows UNC) paths
  return trimmed.startsWith("file://") || trimmed.startsWith("file:\\");
};

const LOCAL_FILE_IMAGE_PLACEHOLDER =
  "[!! Pasted Image Unavailable - Replace or delete this notice !!]";

/**
 * Parse `html` and replace any `<img>` tags whose `src` is a local-file URL
 * with a visible inline text placeholder.  The browser can never load these
 * paths from a web origin (they are Windows `file:///` temp paths produced by
 * Microsoft Word on paste), so replacing them early prevents broken-image
 * icons from being saved into CMS content.
 *
 * Operates on a detached DOM fragment — no side-effects on the live document.
 * A fast regex pre-check skips the DOM work in the common (no local-file) case.
 */
export const stripLocalFileImages = (html: string): string => {
  // Fast path: nothing to do
  if (!/src\s*=\s*["']\s*file:/i.test(html)) {
    return html;
  }

  if (typeof document === "undefined") {
    // SSR fallback — regex replacement (best effort)
    return html.replace(
      /<img\b[^>]*\bsrc\s*=\s*["']\s*file:[^"']*["'][^>]*\/?>/gi,
      LOCAL_FILE_IMAGE_PLACEHOLDER,
    );
  }

  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (isLocalFileImageSrc(src)) {
      const placeholder = document.createTextNode(LOCAL_FILE_IMAGE_PLACEHOLDER);
      img.parentNode?.replaceChild(placeholder, img);
    }
  });

  return template.innerHTML;
};

// ─── Content type helpers ─────────────────────────────────────────────────

export type CmsEditorContentType = "html" | "markdown" | "json" | "text";

export const contentTypeToMime = (
  shorthand: CmsEditorContentType,
): "text/html" | "text/markdown" | "application/json" | "text/plain" => {
  switch (shorthand) {
    case "html":
      return "text/html";
    case "markdown":
      return "text/markdown";
    case "json":
      return "application/json";
    case "text":
      return "text/plain";
    default:
      return "text/html";
  }
};

export const mimeToContentType = (
  mime: string | undefined,
): CmsEditorContentType => {
  switch (mime) {
    case "text/html":
      return "html";
    case "text/markdown":
      return "markdown";
    case "application/json":
      return "json";
    case "text/plain":
      return "text";
    default:
      return "html";
  }
};

// ─── Props ────────────────────────────────────────────────────────────────

export interface CmsBodyEditorProps {
  contentType: CmsEditorContentType;
  value: string;
  onChange: (nextValue: string) => void;
  height?: number;
  label?: string;
  /** Which WYSIWYG editor to use for HTML content. Defaults to "ckeditor". */
  editor?: CmsEditorPreference;
  /** Optional explicit engine adapters supplied by the host application. */
  editorAdapters?: CmsBodyEditorAdapterMap;
  /** Optional engine-specific props passed to the selected adapter. */
  editorProps?: CmsBodyEditorEngineProps;
  /** Callback to pick a media file (opens host-provided media picker). */
  onPickAsset?: () => Promise<{
    uid: string;
    name?: string;
    url?: string;
    width?: number;
    height?: number;
    /** MIME type of the selected file (e.g. "video/mp4", "image/png"). */
    mimeType?: string;
  } | null>;
  /** Callback to upload an image directly. */
  onUploadImage?: CmsImageUploadHandler;
}

// ─── Component ────────────────────────────────────────────────────────────

const CmsBodyEditor: React.FC<CmsBodyEditorProps> = React.memo(
  ({
    contentType,
    value,
    onChange,
    height = 500,
    label,
    editor = "ckeditor",
    editorAdapters,
    editorProps,
    onPickAsset,
    onUploadImage,
  }) => {
    const latestHtmlRef = useRef(value);
    const htmlNormalizationRunRef = useRef(0);
    const mountedRef = useRef(true);
    const normTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );

    React.useEffect(() => {
      latestHtmlRef.current = value;
    }, [value]);

    // Cleanup normalization timer on unmount.
    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (normTimerRef.current !== undefined) {
          clearTimeout(normTimerRef.current);
          normTimerRef.current = undefined;
        }
      };
    }, []);

    /**
     * Kick off base64 image normalization after a 500ms debounce.
     * This avoids redundant upload attempts during rapid typing while
     * images are embedded.  The epoch guard (htmlNormalizationRunRef) still
     * protects against stale results from earlier runs.
     */
    const scheduleNormalization = useCallback(
      (nextValue: string) => {
        if (!mountedRef.current) {
          return;
        }
        if (normTimerRef.current !== undefined) {
          clearTimeout(normTimerRef.current);
        }

        normTimerRef.current = setTimeout(() => {
          normTimerRef.current = undefined;
          if (!mountedRef.current) {
            return;
          }

          const runId = htmlNormalizationRunRef.current + 1;
          htmlNormalizationRunRef.current = runId;

          void normalizeEmbeddedHtmlImages({
            html: nextValue,
            uploadImage: async (file, context) => {
              return await onUploadImage!(file, context);
            },
          })
            .then((normalizedValue) => {
              if (!mountedRef.current) {
                return;
              }
              if (htmlNormalizationRunRef.current !== runId) {
                return;
              }

              if (latestHtmlRef.current !== nextValue) {
                return;
              }

              if (normalizedValue === nextValue) {
                return;
              }

              latestHtmlRef.current = normalizedValue;
              onChange(normalizedValue);
            })
            .catch((err) => {
              console.error(
                "CmsBodyEditor base64 image normalization failed",
                err,
              );
            });
        }, 500);
      },
      [onChange, onUploadImage],
    );

    const handleHtmlEditorChange = React.useCallback(
      (nextValue: string) => {
        latestHtmlRef.current = nextValue;
        onChange(nextValue);

        if (!onUploadImage) {
          return;
        }

        if (!hasEmbeddedBase64Image(nextValue)) {
          return;
        }

        scheduleNormalization(nextValue);
      },
      [onChange, onUploadImage, scheduleNormalization],
    );

    const containerSx = useMemo(
      () => ({
        minHeight: height,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
      }),
      [height],
    );

    if (contentType === "html") {
      return (
        <Box>
          {label && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              {label}
            </Typography>
          )}
          <Box sx={containerSx}>
            <Suspense fallback={<LinearProgress />}>
              <HtmlEditor
                value={value}
                onChange={handleHtmlEditorChange}
                height={height}
                editor={editor}
                editorAdapters={editorAdapters}
                editorProps={editorProps}
                onPickAsset={onPickAsset}
                onUploadImage={onUploadImage}
              />
            </Suspense>
          </Box>
        </Box>
      );
    }

    if (contentType === "markdown") {
      return (
        <Box>
          {label && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 0.5 }}
            >
              {label}
            </Typography>
          )}
          <Box sx={containerSx}>
            <Suspense fallback={<LinearProgress />}>
              <MarkdownEditor
                value={value}
                onChange={onChange}
                editorAdapter={editorAdapters?.mdx}
                editorProps={editorProps?.mdx}
                onPickAsset={onPickAsset}
                onUploadImage={onUploadImage}
              />
            </Suspense>
          </Box>
        </Box>
      );
    }

    // JSON or Plain text — use a simple textarea
    return (
      <Box>
        {label && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            {label} ({contentType === "json" ? "JSON" : "Plain text"})
          </Typography>
        )}
        <Box
          component="textarea"
          value={value}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onChange(e.target.value)
          }
          sx={{
            ...containerSx,
            width: "100%",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            p: 2,
            resize: "vertical",
            overflow: "auto",
            background: "transparent",
            color: "text.primary",
          }}
        />
      </Box>
    );
  },
);

// ─── Injected editor adapters ─────────────────────────────────────────────

const DEFAULT_CMS_TINYMCE_PROPS: Record<string, unknown> = {
  init: {
    license_key: "gpl",
    menubar: true,
    plugins: [
      "advlist",
      "autolink",
      "lists",
      "link",
      "image",
      "charmap",
      "preview",
      "anchor",
      "searchreplace",
      "visualblocks",
      "code",
      "fullscreen",
      "insertdatetime",
      "media",
      "table",
      "help",
      "wordcount",
    ],
    toolbar:
      "undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image | code fullscreen",
    paste_data_images: true,
    automatic_uploads: true,
    paste_preprocess: (_pluginApi: unknown, data: { content: string }) => {
      data.content = stripLocalFileImages(data.content);
    },
  },
};

const useCmsEditorHandlers = (
  onPickAsset: CmsBodyEditorProps["onPickAsset"],
  onUploadImage: CmsBodyEditorProps["onUploadImage"],
) => {
  const pickAsset = useCallback(
    async (request: WysiwygPickRequest) => {
      if (!onPickAsset) {
        return null;
      }
      const picked = await onPickAsset();
      if (!picked?.url) {
        return null;
      }
      return {
        url: picked.url,
        kind: request.kind,
        title: picked.name,
        text: picked.name,
        alt: picked.name,
        mimeType: picked.mimeType,
      };
    },
    [onPickAsset],
  );

  const uploadImage = useCallback(
    async (request: WysiwygImageUploadRequest) => {
      if (!onUploadImage) {
        throw new Error("CMS image upload requires an onUploadImage handler");
      }
      const file =
        request.file ??
        (request.blob
          ? new File([request.blob], request.filename, {
              type: request.mimeType || "application/octet-stream",
            })
          : undefined);
      if (!file) {
        throw new Error("CMS image upload requires a file or blob");
      }
      const url = await onUploadImage(file, { source: "editor-upload" });
      if (!url) {
        throw new Error("Upload failed");
      }
      return { url };
    },
    [onUploadImage],
  );

  return {
    pickAsset: onPickAsset ? pickAsset : undefined,
    uploadImage: onUploadImage ? uploadImage : undefined,
  };
};

const HtmlEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  height: number;
  editor: CmsEditorPreference;
  editorAdapters?: CmsBodyEditorAdapterMap;
  editorProps?: CmsBodyEditorProps["editorProps"];
  onPickAsset?: CmsBodyEditorProps["onPickAsset"];
  onUploadImage?: CmsBodyEditorProps["onUploadImage"];
}> = ({
  value,
  onChange,
  height,
  editor,
  editorAdapters,
  editorProps,
  onPickAsset,
  onUploadImage,
}) => {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";
  const Adapter = editorAdapters?.[editor];
  const editorSpecificProps =
    editorProps?.[editor] ??
    (editor === "tinymce" ? DEFAULT_CMS_TINYMCE_PROPS : undefined);
  const handlers = useCmsEditorHandlers(onPickAsset, onUploadImage);

  if (!Adapter) {
    return (
      <Box
        component="textarea"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        sx={{
          width: "100%",
          height,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          p: 2,
          resize: "none",
          overflow: "auto",
          border: "none",
          background: "transparent",
          color: "text.primary",
        }}
      />
    );
  }

  return (
    <Adapter
      value={value}
      height={height}
      darkMode={isDark}
      editorProps={editorSpecificProps}
      onChange={onChange}
      onPickAsset={handlers.pickAsset}
      onUploadImage={handlers.uploadImage}
    />
  );
};

const MarkdownEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  editorAdapter?: CmsBodyEditorAdapterMap["mdx"];
  editorProps?: CmsBodyEditorEngineProps["mdx"];
  onPickAsset?: CmsBodyEditorProps["onPickAsset"];
  onUploadImage?: CmsBodyEditorProps["onUploadImage"];
}> = ({
  value,
  onChange,
  editorAdapter: Adapter,
  editorProps,
  onPickAsset,
  onUploadImage,
}) => {
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";
  const handlers = useCmsEditorHandlers(onPickAsset, onUploadImage);

  if (!Adapter) {
    return (
      <Box
        component="textarea"
        value={value}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(event.target.value)
        }
        sx={{
          width: "100%",
          minHeight: 400,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          p: 2,
          resize: "vertical",
          border: "none",
          background: "transparent",
          color: "text.primary",
        }}
      />
    );
  }

  return (
    <Adapter
      value={value}
      height={400}
      darkMode={isDark}
      editorProps={editorProps}
      onChange={onChange}
      onPickAsset={handlers.pickAsset}
      onUploadImage={handlers.uploadImage}
    />
  );
};

CmsBodyEditor.displayName = "CmsBodyEditor";

export default CmsBodyEditor;
