import type React from "react";

export type WysiwygEditorKind = "tinymce" | "ckeditor" | "easymde" | "mdx";

export type WysiwygAssetKind = "file" | "image" | "media";

export type WysiwygPickRequest = {
  value: string;
  kind: WysiwygAssetKind;
};

export type WysiwygPickResult = {
  url: string;
  title?: string;
  text?: string;
  alt?: string;
  kind?: WysiwygAssetKind;
  /** MIME type of the picked asset (e.g. "video/mp4", "image/png"). */
  mimeType?: string;
};

export type WysiwygProgressFn = (percent: number) => void;

export type WysiwygImageUploadRequest = {
  file?: File;
  blob?: Blob;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  progress?: WysiwygProgressFn;
};

export type WysiwygImageUploadResult = {
  url: string;
};

/** Stable, engine-neutral contract implemented by an explicitly imported editor adapter. */
export interface WysiwygEditorAdapterProps {
  value?: string;
  readOnly?: boolean;
  height?: string | number;
  darkMode?: boolean;
  onChange?: (value: string, rawEvent?: unknown) => void;
  onEditorInstance?: (instance: unknown) => void;
  onPickAsset?: (
    request: WysiwygPickRequest,
  ) => Promise<WysiwygPickResult | null>;
  onUploadImage?: (
    request: WysiwygImageUploadRequest,
  ) => Promise<WysiwygImageUploadResult>;
  canonicalizeUrl?: (url: string) => string;
  editorProps?: Record<string, unknown>;
}

export type WysiwygEditorAdapter =
  React.ComponentType<WysiwygEditorAdapterProps>;

export type WysiwygEditorAdapterMap = Partial<
  Record<WysiwygEditorKind, WysiwygEditorAdapter>
>;

export const normalizeCssSize = (
  value: string | number | undefined,
): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "number") {
    return `${value}px`;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed;
};

export const pickLocalFile = async (options: {
  accept?: string;
}): Promise<File | null> => {
  const { accept } = options;

  return await new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";

    if (accept) {
      input.accept = accept;
    }

    const cleanup = () => {
      input.value = "";
      input.remove();
    };

    input.addEventListener(
      "change",
      () => {
        const file =
          input.files && input.files.length > 0 ? input.files[0] : null;
        cleanup();
        resolve(file);
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        cleanup();
        resolve(null);
      },
      { once: true } as any,
    );

    document.body.appendChild(input);
    input.click();
  });
};
