import React, { Suspense, useCallback, useEffect, useRef } from "react";
import {
  type WysiwygEditorAdapterMap,
  type WysiwygEditorKind,
  type WysiwygEditorAdapterProps,
  type WysiwygPickRequest,
  type WysiwygPickResult,
  type WysiwygImageUploadRequest,
  type WysiwygImageUploadResult,
} from "./wysiwyg-common.js";

export type {
  WysiwygAssetKind,
  WysiwygEditorAdapter,
  WysiwygEditorAdapterMap,
  WysiwygEditorAdapterProps,
  WysiwygEditorKind,
  WysiwygImageUploadRequest,
  WysiwygImageUploadResult,
  WysiwygPickRequest,
  WysiwygPickResult,
  WysiwygProgressFn,
} from "./wysiwyg-common.js";

export type WysiwygChangeContext = {
  editor: WysiwygEditorKind;
  instance: unknown;
  rawEvent?: unknown;
};

export interface WysiwygEditorProps {
  /** Editor kind selected from the explicitly supplied adapter map. */
  editor?: WysiwygEditorKind;
  /** Stable adapter components imported by the host application. */
  adapters?: WysiwygEditorAdapterMap;
  value?: string;
  readOnly?: boolean;
  height?: string | number;
  darkMode?: boolean;
  onChange?: (value: string, ctx: WysiwygChangeContext) => void;
  onEditorInstance?: (
    instance: unknown,
    ctx: { editor: WysiwygEditorKind },
  ) => void;
  onPickAsset?: (
    request: WysiwygPickRequest,
  ) => Promise<WysiwygPickResult | null>;
  onUploadImage?: (
    request: WysiwygImageUploadRequest,
  ) => Promise<WysiwygImageUploadResult>;
  canonicalizeUrl?: (url: string) => string;
  /** Opaque engine-specific props, read only by the selected adapter. */
  editorProps?: Partial<Record<WysiwygEditorKind, Record<string, unknown>>>;
  /** @deprecated Use `editorProps.tinymce`. */
  tinymce?: Record<string, unknown>;
  /** @deprecated Use `editorProps.ckeditor`. */
  ckeditor?: Record<string, unknown>;
  /** @deprecated Use `editorProps.easymde`. */
  easymde?: Record<string, unknown>;
  /** @deprecated Use `editorProps.mdx`. */
  mdx?: Record<string, unknown>;
  suspenseFallback?: React.ReactNode;
}

const legacyEditorProps = (
  props: WysiwygEditorProps,
  editor: WysiwygEditorKind,
): Record<string, unknown> | undefined => {
  switch (editor) {
    case "tinymce":
      return props.tinymce;
    case "ckeditor":
      return props.ckeditor;
    case "easymde":
      return props.easymde;
    case "mdx":
      return props.mdx;
  }
};

const WysiwygEditor: React.FC<WysiwygEditorProps> = (props) => {
  const {
    editor = "tinymce",
    adapters,
    value,
    readOnly,
    height,
    darkMode,
    onChange,
    onEditorInstance,
    onPickAsset,
    onUploadImage,
    canonicalizeUrl,
    editorProps,
    suspenseFallback = null,
  } = props;
  const instanceRef = useRef<unknown>(null);
  const Adapter = adapters?.[editor];

  useEffect(() => {
    instanceRef.current = null;
  }, [editor]);

  const handleChange = useCallback(
    (nextValue: string, rawEvent?: unknown) => {
      onChange?.(nextValue, {
        editor,
        instance: instanceRef.current,
        rawEvent,
      });
    },
    [editor, onChange],
  );

  const handleInstance = useCallback(
    (instance: unknown) => {
      instanceRef.current = instance;
      onEditorInstance?.(instance, { editor });
    },
    [editor, onEditorInstance],
  );

  if (!Adapter) {
    return (
      <div role="alert" data-editor-adapter-missing={editor}>
        No WYSIWYG adapter is configured for {editor}.
      </div>
    );
  }

  const selectedEditorProps =
    editorProps?.[editor] ?? legacyEditorProps(props, editor);
  const adapterProps: WysiwygEditorAdapterProps = {
    value,
    readOnly,
    height,
    darkMode,
    onChange: handleChange,
    onEditorInstance: handleInstance,
    onPickAsset,
    onUploadImage,
    canonicalizeUrl,
    editorProps: selectedEditorProps,
  };

  return (
    <Suspense fallback={suspenseFallback}>
      <Adapter key={editor} {...adapterProps} />
    </Suspense>
  );
};

WysiwygEditor.displayName = "WysiwygEditor";

export default WysiwygEditor;
