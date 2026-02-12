/**
 * CMS Body Editor — shared-utils
 *
 * Multi-format content editor that switches between:
 * - HTML: TinyMCE or CKEditor (from shared-utils/client/wysiwyg)
 * - Markdown: MDXEditor (from shared-utils/client/wysiwyg)
 * - JSON/Text: Plain textarea
 *
 * Media picker integration is injectable via callbacks.
 */
import React, { useMemo, useRef, useState, lazy, Suspense } from "react";
import { Box, LinearProgress, Typography, useColorScheme } from "@mui/material";
import type { CmsEditorPreference } from "./CmsAdminUiConfig.js";

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
  /** Callback to pick a media file (opens host-provided media picker). */
  onPickAsset?: () => Promise<{
    uid: string;
    name?: string;
    url?: string;
  } | null>;
  /** Callback to upload an image directly. */
  onUploadImage?: (file: File) => Promise<string | null>;
}

// ─── Component ────────────────────────────────────────────────────────────

const CmsBodyEditor: React.FC<CmsBodyEditorProps> = ({
  contentType,
  value,
  onChange,
  height = 500,
  label,
  editor = "ckeditor",
  onPickAsset,
  onUploadImage,
}) => {
  const [editorLoading, setEditorLoading] = useState(true);

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
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            {label}
          </Typography>
        )}
        <Box sx={containerSx}>
          <Suspense fallback={<LinearProgress />}>
            <HtmlEditor
              value={value}
              onChange={onChange}
              height={height}
              editor={editor}
              onPickAsset={onPickAsset}
              onUploadImage={onUploadImage}
              onReady={() => setEditorLoading(false)}
            />
          </Suspense>
          {editorLoading && <LinearProgress />}
        </Box>
      </Box>
    );
  }

  if (contentType === "markdown") {
    return (
      <Box>
        {label && (
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
            {label}
          </Typography>
        )}
        <Box sx={containerSx}>
          <Suspense fallback={<LinearProgress />}>
            <MarkdownEditor
              value={value}
              onChange={onChange}
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
          background: "transparent",
          color: "text.primary",
        }}
      />
    </Box>
  );
};

// ─── Sub-editors (lazy-loaded) ────────────────────────────────────────────

/**
 * HTML editor — loads TinyMCE or CKEditor from shared-utils/client/wysiwyg
 * based on the `editor` prop. Falls back to textarea if the import fails.
 */
const HtmlEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  height: number;
  editor: CmsEditorPreference;
  onPickAsset?: CmsBodyEditorProps["onPickAsset"];
  onUploadImage?: CmsBodyEditorProps["onUploadImage"];
  onReady?: () => void;
}> = ({
  value,
  onChange,
  height,
  editor,
  onPickAsset,
  onUploadImage,
  onReady,
}) => {
  const [EditorComponent, setEditorComponent] =
    useState<React.ComponentType<any> | null>(null);
  const loadedRef = useRef<CmsEditorPreference | null>(null);
  const { mode, systemMode } = useColorScheme();
  const isDark = (mode === "system" ? systemMode : mode) === "dark";

  // Re-load when editor preference changes
  React.useEffect(() => {
    if (loadedRef.current === editor) {
      return;
    }
    loadedRef.current = editor;
    setEditorComponent(null);

    import("../../../wysiwyg")
      .then((mod) => {
        if (editor === "tinymce") {
          setEditorComponent(() => mod.TinyMceEditor);
        } else {
          setEditorComponent(() => mod.CKEditor5Classic);
        }
        onReady?.();
      })
      .catch(() => {
        onReady?.();
      });
  }, [editor, onReady]);

  if (!EditorComponent) {
    return (
      <Box
        component="textarea"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        sx={{
          width: "100%",
          height,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          p: 2,
          resize: "none",
          border: "none",
          background: "transparent",
          color: "text.primary",
        }}
      />
    );
  }

  if (editor === "tinymce") {
    return (
      <EditorComponent
        value={value}
        onEditorChange={onChange}
        darkMode={isDark}
        init={{
          license_key: "gpl",
          height,
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
          file_picker_callback: onPickAsset
            ? (_cb: any, _value: any, _meta: any) => {
                onPickAsset().then((result) => {
                  if (result?.url) {
                    _cb(result.url, { title: result.name || "" });
                  }
                });
              }
            : undefined,
          images_upload_handler: onUploadImage
            ? async (blobInfo: any) => {
                const url = await onUploadImage(blobInfo.blob());
                if (!url) {
                  throw new Error("Upload failed");
                }
                return url;
              }
            : undefined,
        }}
      />
    );
  }

  // CKEditor — onChange receives (event, { getData }) per CKEditor5Classic API
  return (
    <EditorComponent
      key={`ck-${editor}`}
      data={value}
      darkMode={isDark}
      height={height}
      onChange={(_event: any, helpers: { getData: () => string }) =>
        onChange(helpers.getData())
      }
      onPickFile={
        onPickAsset
          ? async (request: any) => {
              const result = await onPickAsset();
              if (!result?.url) {
                return null;
              }
              return {
                url: result.url,
                title: result.name || "",
                alt: result.name || "",
              };
            }
          : undefined
      }
      onUploadImage={
        onUploadImage
          ? async (request: any) => {
              const blob: Blob = request?.blob || request;
              const file =
                blob instanceof File
                  ? blob
                  : new File([blob], "image", { type: blob.type });
              const url = await onUploadImage(file);
              if (!url) {
                throw new Error("Upload failed");
              }
              return { url };
            }
          : undefined
      }
    />
  );
};

/**
 * Markdown editor using MDXEditor from shared-utils/client/wysiwyg.
 */
const MarkdownEditor: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onPickAsset?: CmsBodyEditorProps["onPickAsset"];
  onUploadImage?: CmsBodyEditorProps["onUploadImage"];
}> = ({ value, onChange, onPickAsset, onUploadImage }) => {
  const [MdEditor, setMdEditor] = useState<React.ComponentType<any> | null>(
    null,
  );
  const loadedRef = useRef(false);

  React.useEffect(() => {
    if (loadedRef.current) {
      return;
    }
    loadedRef.current = true;

    import("../../../wysiwyg")
      .then((mod) => {
        setMdEditor(() => mod.MDXEditor);
      })
      .catch(() => {
        // Fallback
      });
  }, []);

  if (!MdEditor) {
    return (
      <Box
        component="textarea"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
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

  return <MdEditor markdown={value} onChange={onChange} />;
};

export default CmsBodyEditor;
