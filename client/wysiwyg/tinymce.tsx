import React, { lazy, Suspense, useCallback, useMemo } from "react";
import type {
  TinyMceEditorProps,
  TinyMceImageUploadRequest,
  TinyMcePickRequest,
} from "../src/components/wysiwyg/TinyMceEditor.js";
import {
  type WysiwygEditorAdapterProps,
  type WysiwygAssetKind,
  type WysiwygPickResult,
  normalizeCssSize,
} from "../src/components/wysiwyg/wysiwyg-common.js";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";

const LazyTinyMceEditor = lazy(async () => {
  try {
    return await import("../src/components/wysiwyg/TinyMceEditor.js");
  } catch (error) {
    return {
      default: (props: TinyMceEditorProps) => (
        <EditorImportFailure
          engine="TinyMCE"
          error={error}
          value={props.data}
          height={props.init?.height}
          readOnly={props.disabled}
          onChange={(value) =>
            props.onChange?.(undefined, { getData: () => value })
          }
        />
      ),
    };
  }
});

export const TinyMceEditor: React.FC<TinyMceEditorProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <LazyTinyMceEditor {...props} />
    </Suspense>
  );
};

TinyMceEditor.displayName = "TinyMceEditor";

export const TinyMceWysiwygAdapter: React.FC<WysiwygEditorAdapterProps> = (
  props,
) => {
  const {
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
  } = props;
  const options = (editorProps ?? {}) as Partial<TinyMceEditorProps>;

  const pickFile = useCallback(
    async (request: TinyMcePickRequest) => {
      if (!onPickAsset) {
        return null;
      }
      const kind: WysiwygAssetKind =
        request.meta?.filetype === "image" || request.meta?.filetype === "media"
          ? request.meta.filetype
          : "file";
      const picked = await onPickAsset({ value: request.value, kind });
      return picked ? toTinyMcePickResult(picked) : null;
    },
    [onPickAsset],
  );

  const uploadImage = useCallback(
    async (request: TinyMceImageUploadRequest) => {
      if (!onUploadImage) {
        throw new Error(
          "TinyMCE image upload requires an onUploadImage handler",
        );
      }
      return await onUploadImage({
        blob: request.blob,
        filename: request.filename,
        mimeType: request.mimeType,
        sizeBytes: request.sizeBytes,
        progress: request.progress,
      });
    },
    [onUploadImage],
  );

  const init = useMemo(() => {
    return {
      ...(options.init as Record<string, unknown> | undefined),
      ...(height === undefined ? {} : { height: normalizeCssSize(height) }),
      ...(readOnly === undefined ? {} : { readonly: readOnly }),
    };
  }, [height, options.init, readOnly]);

  return (
    <LazyTinyMceEditor
      {...options}
      init={init}
      data={value}
      disabled={!!readOnly}
      darkMode={darkMode}
      canonicalizeUrl={canonicalizeUrl}
      onChange={(event, instance) => {
        onChange?.(instance?.getData?.() ?? "", event);
      }}
      onEditorInstance={onEditorInstance}
      onPickFile={onPickAsset ? pickFile : undefined}
      onUploadImage={onUploadImage ? uploadImage : undefined}
    />
  );
};

TinyMceWysiwygAdapter.displayName = "TinyMceWysiwygAdapter";

const toTinyMcePickResult = (picked: WysiwygPickResult) => {
  return {
    url: picked.url,
    title: picked.title,
    text: picked.text,
    alt: picked.alt,
  };
};

export type {
  TinyMceEditorProps,
  TinyMceFilePickerMeta,
  TinyMceImageUploadRequest,
  TinyMceImageUploadResult,
  TinyMcePickRequest,
  TinyMcePickResult,
  TinyMceProgressFn,
} from "../src/components/wysiwyg/TinyMceEditor.js";
export type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";

export default TinyMceEditor;
