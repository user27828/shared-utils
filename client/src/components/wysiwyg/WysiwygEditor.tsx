import React, { Suspense, useMemo, useRef } from "react";

import type {
  TinyMceEditorProps,
  TinyMceImageUploadRequest,
  TinyMcePickRequest,
  TinyMcePickResult,
} from "./TinyMceEditor.js";

import type {
  CKEditor5ClassicProps,
  CKEditor5ImageUploadRequest,
  CKEditor5PickRequest,
  CKEditor5PickResult,
} from "./CKEditor5Classic.js";

import type { EasyMDEEditorProps } from "./EasyMDEEditor.js";

import {
  type WysiwygEditorKind,
  type WysiwygAssetKind,
  type WysiwygImageUploadRequest,
  type WysiwygImageUploadResult,
  type WysiwygPickRequest,
  type WysiwygPickResult,
  normalizeCssSize,
} from "./wysiwyg-common.js";

const CKEditor5ClassicLazy = React.lazy(() => import("./CKEditor5Classic.js"));
const EasyMDEEditorLazy = React.lazy(() => import("./EasyMDEEditor.js"));
const TinyMceEditorLazy = React.lazy(() => import("./TinyMceEditor.js"));

export type { WysiwygAssetKind, WysiwygEditorKind } from "./wysiwyg-common.js";
export type {
  WysiwygImageUploadRequest,
  WysiwygImageUploadResult,
  WysiwygPickRequest,
  WysiwygPickResult,
  WysiwygProgressFn,
} from "./wysiwyg-common.js";

export type WysiwygChangeContext = {
  editor: WysiwygEditorKind;
  instance: any;
  rawEvent?: any;
};

export type WysiwygTinymceOverrides = Omit<
  TinyMceEditorProps,
  | "data"
  | "onChange"
  | "onEditorInstance"
  | "onPickFile"
  | "onUploadImage"
  | "canonicalizeUrl"
>;

export type WysiwygCkeditorOverrides = Omit<
  CKEditor5ClassicProps,
  | "data"
  | "onChange"
  | "onEditorInstance"
  | "onPickFile"
  | "onUploadImage"
  | "canonicalizeUrl"
  | "readOnly"
  | "height"
>;

export type WysiwygEasyMdeOverrides = Omit<
  EasyMDEEditorProps,
  | "value"
  | "onChange"
  | "onEditorInstance"
  | "onPickAsset"
  | "onUploadImage"
  | "canonicalizeUrl"
  | "readOnly"
  | "height"
>;

export interface WysiwygEditorProps {
  editor?: WysiwygEditorKind;

  value?: string;

  readOnly?: boolean;

  height?: string | number;

  onChange?: (value: string, ctx: WysiwygChangeContext) => void;

  onEditorInstance?: (
    instance: any,
    ctx: { editor: WysiwygEditorKind },
  ) => void;

  onPickAsset?: (
    request: WysiwygPickRequest,
  ) => Promise<WysiwygPickResult | null>;

  onUploadImage?: (
    request: WysiwygImageUploadRequest,
  ) => Promise<WysiwygImageUploadResult>;

  canonicalizeUrl?: (url: string) => string;

  tinymce?: WysiwygTinymceOverrides;

  ckeditor?: WysiwygCkeditorOverrides;

  easymde?: WysiwygEasyMdeOverrides;

  /**
   * Suspense fallback used while lazily loading editor implementations.
   */
  suspenseFallback?: React.ReactNode;
}

const filetypeToAssetKind = (filetype: any): WysiwygAssetKind => {
  if (filetype === "image") {
    return "image";
  }

  if (filetype === "media") {
    return "media";
  }

  return "file";
};

const normalizePickResultForTinyMce = (
  pick: WysiwygPickResult,
): TinyMcePickResult => {
  return {
    url: pick.url,
    title: pick.title,
    text: pick.text,
    alt: pick.alt,
  };
};

const normalizePickResultForCkeditor = (
  pick: WysiwygPickResult,
): CKEditor5PickResult => {
  return {
    url: pick.url,
    title: pick.title,
    text: pick.text,
    alt: pick.alt,
    kind: pick.kind,
  };
};

const WysiwygEditor: React.FC<WysiwygEditorProps> = (props) => {
  const {
    editor = "tinymce",
    value,
    readOnly,
    height,
    onChange,
    onEditorInstance,
    onPickAsset,
    onUploadImage,
    canonicalizeUrl,
    tinymce,
    ckeditor,
    easymde,
    suspenseFallback,
  } = props;

  const instanceRef = useRef<any>(null);

  const normalizedHeight = useMemo(() => {
    return normalizeCssSize(height);
  }, [height]);

  const handleInstance = (kind: WysiwygEditorKind) => {
    return (instance: any) => {
      instanceRef.current = instance;
      if (onEditorInstance) {
        onEditorInstance(instance, { editor: kind });
      }
    };
  };

  const handleChange = (kind: WysiwygEditorKind) => {
    return (rawEvent: any, editorLike: { getData: () => string }) => {
      if (!onChange) {
        return;
      }

      const nextValue = editorLike?.getData?.() || "";
      onChange(nextValue, {
        editor: kind,
        instance: instanceRef.current,
        rawEvent,
      });
    };
  };

  const tinymcePickFile = useMemo(() => {
    if (!onPickAsset) {
      return undefined;
    }

    return async (
      request: TinyMcePickRequest,
    ): Promise<TinyMcePickResult | null> => {
      const kind = filetypeToAssetKind(request.meta?.filetype);

      const pick = await onPickAsset({
        value: request.value,
        kind,
      });

      if (!pick) {
        return null;
      }

      return normalizePickResultForTinyMce(pick);
    };
  }, [onPickAsset]);

  const tinymceUploadImage = useMemo(() => {
    if (!onUploadImage) {
      return undefined;
    }

    return async (
      request: TinyMceImageUploadRequest,
    ): Promise<WysiwygImageUploadResult> => {
      return await onUploadImage({
        blob: request.blob,
        filename: request.filename,
        mimeType: request.mimeType,
        sizeBytes: request.sizeBytes,
        progress: request.progress,
      });
    };
  }, [onUploadImage]);

  const ckeditorPickFile = useMemo(() => {
    if (!onPickAsset) {
      return undefined;
    }

    return async (
      request: CKEditor5PickRequest,
    ): Promise<CKEditor5PickResult | null> => {
      const kind = filetypeToAssetKind(request.meta?.filetype);

      const pick = await onPickAsset({
        value: request.value,
        kind,
      });

      if (!pick) {
        return null;
      }

      return normalizePickResultForCkeditor(pick);
    };
  }, [onPickAsset]);

  const ckeditorUploadImage = useMemo(() => {
    if (!onUploadImage) {
      return undefined;
    }

    return async (
      request: CKEditor5ImageUploadRequest,
    ): Promise<WysiwygImageUploadResult> => {
      return await onUploadImage({
        file: request.file,
        filename: request.filename,
        mimeType: request.mimeType,
        sizeBytes: request.sizeBytes,
        progress: request.progress,
      });
    };
  }, [onUploadImage]);

  if (editor === "tinymce") {
    const init = {
      ...(tinymce?.init || {}),
      ...(normalizedHeight ? { height: normalizedHeight } : {}),
      ...(typeof readOnly === "boolean" ? { readonly: readOnly } : {}),
    };

    return (
      <Suspense fallback={suspenseFallback || null}>
        <TinyMceEditorLazy
          {...(tinymce as any)}
          init={init}
          disabled={!!readOnly}
          data={value}
          canonicalizeUrl={canonicalizeUrl}
          onChange={handleChange("tinymce")}
          onEditorInstance={handleInstance("tinymce")}
          onPickFile={tinymcePickFile}
          onUploadImage={tinymceUploadImage as any}
        />
      </Suspense>
    );
  }

  if (editor === "ckeditor") {
    return (
      <Suspense fallback={suspenseFallback || null}>
        <CKEditor5ClassicLazy
          {...(ckeditor as any)}
          data={value}
          height={normalizedHeight}
          readOnly={readOnly}
          canonicalizeUrl={canonicalizeUrl}
          onChange={handleChange("ckeditor")}
          onEditorInstance={handleInstance("ckeditor")}
          onPickFile={ckeditorPickFile}
          onUploadImage={ckeditorUploadImage}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={suspenseFallback || null}>
      <EasyMDEEditorLazy
        {...(easymde as any)}
        value={value}
        height={normalizedHeight}
        readOnly={readOnly}
        canonicalizeUrl={canonicalizeUrl}
        onChange={(next) => {
          if (!onChange) {
            return;
          }

          onChange(next, {
            editor: "easymde",
            instance: instanceRef.current,
          });
        }}
        onEditorInstance={handleInstance("easymde")}
        onPickAsset={onPickAsset}
        onUploadImage={onUploadImage}
      />
    </Suspense>
  );
};

WysiwygEditor.displayName = "WysiwygEditor";

export default WysiwygEditor;
