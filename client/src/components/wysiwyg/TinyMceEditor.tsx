/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @module TinyMceEditor
 */
import React, { useRef, useEffect } from "react";
import { Editor } from "@tinymce/tinymce-react";
import { merge } from "lodash-es";
// TinyMCE so the global var exists
import "tinymce/tinymce";
// DOM model
import "tinymce/models/dom/model";
// Theme
import "tinymce/themes/silver";
// Toolbar icons
import "tinymce/icons/default";
// Editor styles
import "tinymce/skins/ui/oxide/skin";
// Dark theme styles
import "tinymce/skins/ui/oxide-dark/skin";
// Plugins
import "tinymce/plugins/advlist";
import "tinymce/plugins/anchor";
import "tinymce/plugins/autolink";
import "tinymce/plugins/autoresize";
import "tinymce/plugins/autosave";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/codesample";
import "tinymce/plugins/directionality";
import "tinymce/plugins/emoticons";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/help";
import "tinymce/plugins/help/js/i18n/keynav/en";
import "tinymce/plugins/image";
import "tinymce/plugins/importcss";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/nonbreaking";
import "tinymce/plugins/pagebreak";
import "tinymce/plugins/preview";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/save";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/visualchars";
import "tinymce/plugins/wordcount";
// Plugin resources
import "tinymce/plugins/emoticons/js/emojis";
// Content styles
import "tinymce/skins/content/default/content";
import "tinymce/skins/ui/oxide/content";
// Dark theme content styles
import "tinymce/skins/content/dark/content";
import "tinymce/skins/ui/oxide-dark/content";

export type TinyMceFilePickerMeta = {
  filetype?: "file" | "image" | "media";
  fieldname?: string;
};

export type TinyMcePickRequest = {
  value: string;
  meta: TinyMceFilePickerMeta;
};

export type TinyMcePickResult = {
  url: string;
  title?: string;
  text?: string;
  alt?: string;
};

export type TinyMceProgressFn = (percent: number) => void;

export type TinyMceImageUploadRequest = {
  blob: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  progress?: TinyMceProgressFn;
};

export type TinyMceImageUploadResult = {
  url: string;
};

export interface TinyMceEditorProps {
  /**
   * Initial editor content
   */
  data?: string;
  /**
   * Change handler function
   */
  onChange?: (event: any, editor: { getData: () => string }) => void;
  /**
   * Callback to receive the TinyMCE editor instance
   */
  onEditorInstance?: (editor: any) => void;

  /**
   * Optional hook to provide a custom file picker (e.g. open a media library).
   *
   * If provided, TinyMceEditor will wire this into TinyMCE's `file_picker_callback`.
   */
  onPickFile?: (request: TinyMcePickRequest) => Promise<TinyMcePickResult | null>;

  /**
   * Optional hook to upload images (pasted/dragged/selected) and return a URL.
   *
   * If provided, TinyMceEditor will wire this into TinyMCE's `images_upload_handler`.
   */
  onUploadImage?: (
    request: TinyMceImageUploadRequest,
  ) => Promise<TinyMceImageUploadResult>;

  /**
   * Optional URL canonicalizer.
   * Useful when you want inserted URLs to always use a canonical public route.
   */
  canonicalizeUrl?: (url: string) => string;

  /**
   * Optional URL path to TinyMCE UI skin directory.
   * Use this when serving skins as static files (required for Vite).
   * Example: "/tinymce/skins/ui/oxide" or "/tinymce/skins/ui/oxide-dark"
   */
  skinUrl?: string;

  /**
   * Optional URL path to TinyMCE content CSS file.
   * Use this when serving skins as static files (required for Vite).
   * Example: "/tinymce/skins/content/default/content.css"
   */
  contentCss?: string;

  /**
   * Additional props passed to the TinyMCE editor
   */
  [key: string]: any;
}

/**
 * Rich text editor component based on TinyMCE's free version
 */
const TinyMceEditor: React.FC<TinyMceEditorProps> = (props) => {
  const {
    data,
    onChange,
    onEditorInstance,
    onPickFile,
    onUploadImage,
    canonicalizeUrl,
    skinUrl,
    contentCss,
    ...otherProps
  } = props;
  const editorRef = useRef<any>(null);
  const initialValueRef = useRef<string>(data || "");

  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasFocus()) {
      initialValueRef.current = data || "";
    }
  }, [data]);

  const handleEditorChange = (content: string) => {
    if (onChange) {
      const editorInstance = {
        getData: () => content,
      };
      onChange(null, editorInstance);
    }
  };

  const defaultInit = {
    license_key: "gpl",
    height: 500,
    menubar: true,
    plugins: [
      "advlist",
      "anchor",
      "autolink",
      "help",
      "image",
      "link",
      "lists",
      "searchreplace",
      "table",
      "wordcount",
    ],
    toolbar:
      "undo redo | blocks | " +
      "bold italic forecolor | alignleft aligncenter " +
      "alignright alignjustify | bullist numlist outdent indent | " +
      "removeformat | help",
    content_style:
      "body { font-family:Helvetica,Arial,sans-serif; font-size:14px }",
    branding: false,
    promotion: false,
  };

  const filePickerCallback =
    onPickFile &&
    ((callback: any, value: string, meta: any) => {
      void (async () => {
        const pick = await onPickFile({
          value,
          meta: {
            filetype: meta?.filetype,
            fieldname: meta?.fieldname,
          },
        });

        if (!pick) {
          return;
        }

        const url = canonicalizeUrl ? canonicalizeUrl(pick.url) : pick.url;
        const callbackMeta: Record<string, any> = {};

        // TinyMCE supports a limited set of meta fields per picker type.
        if (meta?.filetype === "image") {
          if (pick.alt) {
            callbackMeta.alt = pick.alt;
          }
          if (pick.title) {
            callbackMeta.title = pick.title;
          }
        } else if (meta?.filetype === "file") {
          if (pick.text) {
            callbackMeta.text = pick.text;
          }
          if (pick.title) {
            callbackMeta.title = pick.title;
          }
        } else {
          if (pick.text) {
            callbackMeta.text = pick.text;
          }
          if (pick.title) {
            callbackMeta.title = pick.title;
          }
        }

        callback(url, callbackMeta);
      })().catch((err) => {
        // Keep shared-utils standalone; no external logger dependency.
        console.error("TinyMceEditor file_picker_callback failed", err);
      });
    });

  const imagesUploadHandler =
    onUploadImage &&
    (async (blobInfo: any, progress: any) => {
      try {
        const blob: Blob = blobInfo?.blob?.() || blobInfo;
        const filename: string =
          (typeof blobInfo?.filename === "function" && blobInfo.filename()) ||
          "image";
        const mimeType: string = blob?.type || "application/octet-stream";
        const sizeBytes: number = typeof blob?.size === "number" ? blob.size : 0;

        if (typeof progress === "function") {
          progress(0);
        }

        const result = await onUploadImage({
          blob,
          filename,
          mimeType,
          sizeBytes,
          progress: typeof progress === "function" ? progress : undefined,
        });

        if (typeof progress === "function") {
          progress(100);
        }

        const url = canonicalizeUrl ? canonicalizeUrl(result.url) : result.url;
        return url;
      } catch (err: any) {
        console.error("TinyMceEditor images_upload_handler failed", err);
        throw new Error(err?.message || "Image upload failed");
      }
    });

  return (
    <Editor
      // No API key needed for self-hosted or community version
      onInit={(evt: any, editor: any) => {
        editorRef.current = editor;
        if (onEditorInstance) {
          onEditorInstance(editor);
        }
      }}
      initialValue={initialValueRef.current}
      value={data || ""}
      onEditorChange={handleEditorChange}
      init={merge({}, defaultInit, otherProps.init, {
        ...(skinUrl ? { skin_url: skinUrl } : {}),
        ...(contentCss ? { content_css: contentCss } : {}),
        ...(filePickerCallback ? { file_picker_callback: filePickerCallback } : {}),
        ...(imagesUploadHandler ? { images_upload_handler: imagesUploadHandler } : {}),
      })}
      {...otherProps}
    />
  );
};

TinyMceEditor.displayName = "TinyMceEditor";

export default TinyMceEditor;
