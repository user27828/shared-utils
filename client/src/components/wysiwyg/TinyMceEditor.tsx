/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @see {@link ./TinyMceBundle.tsx}
 * @module TinyMceEditor
 */
import React, { useRef, useEffect } from "react";
import { default as Editor } from "./TinyMceBundle.js";

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
   * Additional props passed to the TinyMCE editor
   */
  [key: string]: any;
}

/**
 * Rich text editor component based on TinyMCE's free version
 */
const TinyMceEditor: React.FC<TinyMceEditorProps> = (props) => {
  const { data, onChange, ...otherProps } = props;
  const editorRef = useRef<any>(null);
  const initialValueRef = useRef<string>(data || "");

  // Update initialValueRef when data prop changes, but only when the editor isn't focused
  // This prevents cursor jumping during typing while still allowing content updates on edit
  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasFocus()) {
      initialValueRef.current = data || "";
    }
  }, [data]);

  // For compatibility with the previous API that used editor.getData()
  const handleEditorChange = (content: string) => {
    if (onChange) {
      // Create an object similar to CKEditor's structure to maintain backward compatibility
      const editorInstance = {
        getData: () => content,
      };
      onChange(null, editorInstance);
    }
  };

  return (
    <Editor
      // No API key needed for self-hosted or community version
      onInit={(evt: any, editor: any) => {
        editorRef.current = editor;
      }}
      initialValue={initialValueRef.current}
      value={data || ""}
      onEditorChange={handleEditorChange}
      init={{
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
      }}
      {...otherProps}
    />
  );
};

export default TinyMceEditor;
