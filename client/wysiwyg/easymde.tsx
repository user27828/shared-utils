import React, { lazy, Suspense } from "react";
import type { EasyMDEEditorProps } from "../src/components/wysiwyg/EasyMDEEditor.js";
import type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";
import EditorImportFailure from "../src/components/wysiwyg/EditorImportFailure.js";

const LazyEasyMDEEditor = lazy(async () => {
  try {
    return await import("../src/components/wysiwyg/EasyMDEEditor.js");
  } catch (error) {
    return {
      default: (props: EasyMDEEditorProps) => (
        <EditorImportFailure
          engine="EasyMDE"
          error={error}
          value={props.value}
          height={props.height}
          readOnly={props.readOnly}
          onChange={(value) => props.onChange?.(value)}
        />
      ),
    };
  }
});

export const EasyMDEEditor: React.FC<EasyMDEEditorProps> = (props) => {
  return (
    <Suspense fallback={null}>
      <LazyEasyMDEEditor {...props} />
    </Suspense>
  );
};

EasyMDEEditor.displayName = "EasyMDEEditor";

export const EasyMDEWysiwygAdapter: React.FC<WysiwygEditorAdapterProps> = (
  props,
) => {
  const {
    value,
    readOnly,
    height,
    onChange,
    onEditorInstance,
    onPickAsset,
    onUploadImage,
    canonicalizeUrl,
    editorProps,
  } = props;
  const options = (editorProps ?? {}) as Partial<EasyMDEEditorProps>;

  return (
    <LazyEasyMDEEditor
      {...options}
      value={value}
      readOnly={readOnly}
      height={height}
      onChange={(nextValue) => onChange?.(nextValue)}
      onEditorInstance={onEditorInstance}
      onPickAsset={onPickAsset}
      onUploadImage={onUploadImage}
      canonicalizeUrl={canonicalizeUrl}
    />
  );
};

EasyMDEWysiwygAdapter.displayName = "EasyMDEWysiwygAdapter";

export type { EasyMDEEditorProps } from "../src/components/wysiwyg/EasyMDEEditor.js";
export type { WysiwygEditorAdapterProps } from "../src/components/wysiwyg/wysiwyg-common.js";

export default EasyMDEEditor;
