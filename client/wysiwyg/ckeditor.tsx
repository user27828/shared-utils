import React, { lazy, Suspense, useCallback } from "react";
import type {
  CKEditor5ClassicProps,
  CKEditor5ImageUploadRequest,
  CKEditor5PickRequest,
} from "../src/components/wysiwyg/CKEditor5Classic.js";
import {
  type WysiwygEditorAdapterProps,
  type WysiwygAssetKind,
} from "../src/components/wysiwyg/wysiwyg-common.js";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";

const LazyCKEditor5Classic = lazy(async () => {
  try {
    return await import("../src/components/wysiwyg/CKEditor5Classic.js");
  } catch (error) {
    return {
      default: (props: CKEditor5ClassicProps) => (
        <EditorImportFailure
          engine="CKEditor 5"
          error={error}
          value={props.data}
          height={props.height}
          readOnly={props.readOnly}
          onChange={(value) =>
            props.onChange?.(undefined, { getData: () => value })
          }
        />
      ),
    };
  }
});

export const CKEditor5Classic: React.FC<CKEditor5ClassicProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <LazyCKEditor5Classic {...props} />
    </Suspense>
  );
};

CKEditor5Classic.displayName = "CKEditor5Classic";

export const CKEditorWysiwygAdapter: React.FC<WysiwygEditorAdapterProps> = (
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
  const options = (editorProps ?? {}) as Partial<CKEditor5ClassicProps>;

  const pickFile = useCallback(
    async (request: CKEditor5PickRequest) => {
      if (!onPickAsset) {
        return null;
      }
      const kind: WysiwygAssetKind =
        request.meta?.filetype === "image" || request.meta?.filetype === "media"
          ? request.meta.filetype
          : "file";
      const picked = await onPickAsset({ value: request.value, kind });
      if (!picked) {
        return null;
      }
      return {
        url: picked.url,
        title: picked.title,
        text: picked.text,
        alt: picked.alt,
        kind: picked.kind,
        mimeType: picked.mimeType,
      };
    },
    [onPickAsset],
  );

  const uploadImage = useCallback(
    async (request: CKEditor5ImageUploadRequest) => {
      if (!onUploadImage) {
        throw new Error(
          "CKEditor image upload requires an onUploadImage handler",
        );
      }
      return await onUploadImage({
        file: request.file,
        filename: request.filename,
        mimeType: request.mimeType,
        sizeBytes: request.sizeBytes,
        progress: request.progress,
      });
    },
    [onUploadImage],
  );

  return (
    <LazyCKEditor5Classic
      {...options}
      data={value}
      readOnly={readOnly}
      height={height}
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

CKEditorWysiwygAdapter.displayName = "CKEditorWysiwygAdapter";

export type {
  CKEditor5ClassicProps,
  CKEditor5FilePickerMeta,
  CKEditor5ImageUploadRequest,
  CKEditor5ImageUploadResult,
  CKEditor5PickRequest,
  CKEditor5PickResult,
  CKEditor5ProgressFn,
} from "../src/components/wysiwyg/CKEditor5Classic.js";
export type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";

export default CKEditor5Classic;
