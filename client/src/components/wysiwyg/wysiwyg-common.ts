export type WysiwygEditorKind = "tinymce" | "ckeditor" | "easymde";

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
