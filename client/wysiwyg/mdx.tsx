import React, { lazy, Suspense } from "react";
import type {
  MDXEditorComponentProps,
  MDXEditorImageUploadRequest,
  MDXEditorMethods,
} from "../src/components/wysiwyg/MDXEditor.js";
import type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";

const LazyMDXEditor = lazy(async () => {
  try {
    return await import("../src/components/wysiwyg/MDXEditor.js");
  } catch (error) {
    const FailedMDXEditor = React.forwardRef<
      MDXEditorMethods,
      MDXEditorComponentProps
    >((props) => (
      <EditorImportFailure
        engine="MDXEditor"
        error={error}
        value={props.data}
        height={props.height}
        readOnly={props.readOnly}
        onChange={(value) =>
          props.onChange?.(undefined, { getData: () => value })
        }
      />
    ));
    return {
      default: FailedMDXEditor,
    };
  }
});

export const MDXEditor = React.forwardRef<
  MDXEditorMethods,
  MDXEditorComponentProps
>((props, ref) => {
  return (
    <Suspense fallback={null}>
      <LazyMDXEditor {...props} ref={ref} />
    </Suspense>
  );
});

MDXEditor.displayName = "MDXEditor";

export const MDXWysiwygAdapter: React.FC<WysiwygEditorAdapterProps> = (
  props,
) => {
  const {
    value,
    readOnly,
    height,
    darkMode,
    onChange,
    onEditorInstance,
    onUploadImage,
    canonicalizeUrl,
    editorProps,
  } = props;
  const options = (editorProps ?? {}) as Partial<MDXEditorComponentProps>;

  const uploadImage = onUploadImage
    ? async (request: MDXEditorImageUploadRequest) => {
        return await onUploadImage({
          file: request.file,
          filename: request.filename,
          mimeType: request.mimeType,
          sizeBytes: request.sizeBytes,
        });
      }
    : undefined;

  return (
    <LazyMDXEditor
      {...options}
      data={value}
      readOnly={readOnly}
      height={height}
      darkMode={darkMode}
      onChange={(event, instance) => {
        onChange?.(instance?.getData?.() ?? "", event);
      }}
      onEditorInstance={onEditorInstance as (editor: MDXEditorMethods) => void}
      onUploadImage={uploadImage}
      canonicalizeUrl={canonicalizeUrl}
    />
  );
};

MDXWysiwygAdapter.displayName = "MDXWysiwygAdapter";

export type {
  MDXEditorComponentProps,
  MDXEditorImageUploadRequest,
  MDXEditorImageUploadResult,
  MDXEditorMethods,
} from "../src/components/wysiwyg/MDXEditor.js";
export type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";

export default MDXEditor;
