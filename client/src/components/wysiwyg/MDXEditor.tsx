/**
 * WYSIWYG editor component using MDXEditor
 * @module MDXEditor
 */
import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  MDXEditor as BaseMDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps as BaseMDXEditorProps,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  linkPlugin,
  linkDialogPlugin,
  imagePlugin,
  tablePlugin,
  toolbarPlugin,
  markdownShortcutPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";

/**
 * Dark theme CSS variables for MDXEditor
 * Injected as a style element when darkMode is enabled
 */
const DARK_THEME_STYLES = `
.mdx-editor-dark-theme {
  --baseBase: #111113;
  --baseBgSubtle: #18191b;
  --baseBg: #212225;
  --baseBgHover: #272a2d;
  --baseBgActive: #2e3135;
  --baseLine: #363a3f;
  --baseBorder: #43484e;
  --baseBorderHover: #5a6169;
  --baseSolid: #696e77;
  --baseSolidHover: #777b84;
  --baseText: #b0b4ba;
  --baseTextContrast: #edeef0;
  --accentBase: #0d1520;
  --accentBgSubtle: #111927;
  --accentBg: #0d2847;
  --accentBgHover: #003362;
  --accentBgActive: #004074;
  --accentLine: #104d87;
  --accentBorder: #205d9e;
  --accentBorderHover: #2870bd;
  --accentSolid: #0090ff;
  --accentSolidHover: #3b9eff;
  --accentText: #70b8ff;
  --accentTextContrast: #c2e6ff;
  --basePageBg: #1a1a1a;
  background: var(--basePageBg);
  color: var(--baseText);
}
.mdx-editor-dark-theme .mdxeditor-toolbar {
  background: #18191b;
  border-bottom: 1px solid #43484e;
}
.mdx-editor-dark-theme [class*="ContentEditable"] {
  background: #1a1a1a;
  color: #edeef0;
}
`;

/**
 * Hook to inject dark theme styles into the document head
 */
const useDarkThemeStyles = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const styleId = "mdx-editor-dark-theme-styles";
    let styleElement = document.getElementById(
      styleId,
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = styleId;
      styleElement.textContent = DARK_THEME_STYLES;
      document.head.appendChild(styleElement);
    }

    // Cleanup is optional - we leave the styles in place for performance
    // since they may be reused by other MDXEditor instances
  }, [enabled]);
};

/**
 * Image upload request matching TinyMCE pattern
 */
export type MDXEditorImageUploadRequest = {
  file: File;
  filename: string;
  mimeType: string;
  sizeBytes: number;
};

/**
 * Image upload result
 */
export type MDXEditorImageUploadResult = {
  url: string;
};

export interface MDXEditorComponentProps {
  /**
   * Initial markdown content
   */
  data?: string;
  /**
   * Change handler function - matches TinyMCE pattern
   */
  onChange?: (event: any, editor: { getData: () => string }) => void;
  /**
   * Callback to receive the MDXEditor ref/methods
   */
  onEditorInstance?: (editor: MDXEditorMethods) => void;
  /**
   * Optional hook to upload images and return a URL.
   * Similar to TinyMCE's onUploadImage pattern.
   */
  onUploadImage?: (
    request: MDXEditorImageUploadRequest,
  ) => Promise<MDXEditorImageUploadResult>;
  /**
   * Optional URL canonicalizer for image URLs.
   */
  canonicalizeUrl?: (url: string) => string;
  /**
   * Enable dark mode styling
   */
  darkMode?: boolean;
  /**
   * Editor height (CSS value)
   */
  height?: string | number;
  /**
   * Image autocomplete suggestions
   */
  imageAutocompleteSuggestions?: string[];
  /**
   * Whether to show the toolbar
   */
  showToolbar?: boolean;
  /**
   * Additional className for the editor root
   */
  className?: string;
  /**
   * Placeholder text when editor is empty
   */
  placeholder?: string;
  /**
   * Read-only mode
   */
  readOnly?: boolean;
  /**
   * Additional plugins to include
   */
  additionalPlugins?: BaseMDXEditorProps["plugins"];
}

/**
 * Default toolbar component for MDXEditor
 */
const DefaultToolbarContents: React.FC = () => (
  <>
    <UndoRedo />
    <BlockTypeSelect />
    <BoldItalicUnderlineToggles />
    <ListsToggle />
    <CreateLink />
    <InsertImage />
    <InsertTable />
    <InsertThematicBreak />
  </>
);

/**
 * Rich text/markdown editor component based on MDXEditor
 */
const MDXEditorComponent = forwardRef<
  MDXEditorMethods,
  MDXEditorComponentProps
>((props, ref) => {
  const {
    data,
    onChange,
    onEditorInstance,
    onUploadImage,
    canonicalizeUrl,
    darkMode = false,
    height = 400,
    imageAutocompleteSuggestions,
    showToolbar = true,
    className,
    placeholder,
    readOnly = false,
    additionalPlugins = [],
  } = props;

  const editorRef = useRef<MDXEditorMethods>(null);
  const initialContentRef = useRef<string>(data || "");
  const createdObjectUrlsRef = useRef<string[]>([]);
  const onEditorInstanceRef = useRef(onEditorInstance);

  // Keep volatile callback in ref
  useEffect(() => {
    onEditorInstanceRef.current = onEditorInstance;
  }, [onEditorInstance]);

  // Cleanup on unmount: revoke object URLs and notify parent
  useEffect(() => {
    return () => {
      // Revoke any object URLs we created for local file preview insertion
      for (const url of createdObjectUrlsRef.current) {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Ignore
        }
      }
      createdObjectUrlsRef.current = [];
    };
  }, []);

  // Inject dark theme styles when needed
  useDarkThemeStyles(darkMode);

  // Expose the editor ref through the forwarded ref
  useImperativeHandle(ref, () => editorRef.current as MDXEditorMethods, []);

  // Update content when data prop changes (if editor not focused)
  useEffect(() => {
    if (editorRef.current && data !== undefined) {
      // Only update if content differs to prevent cursor jumping
      const currentContent = editorRef.current.getMarkdown();
      if (currentContent !== data) {
        editorRef.current.setMarkdown(data);
      }
    }
  }, [data]);

  // Notify parent when editor is ready
  useEffect(() => {
    if (editorRef.current && onEditorInstance) {
      onEditorInstance(editorRef.current);
    }
  }, [onEditorInstance]);

  /**
   * Handle content changes - wraps in TinyMCE-compatible callback pattern
   */
  const handleChange = (markdown: string) => {
    if (onChange) {
      const editorInstance = {
        getData: () => markdown,
      };
      onChange(null, editorInstance);
    }
  };

  /**
   * Image upload handler - bridges MDXEditor's File-based API to our typed interface
   */
  const imageUploadHandler = async (file: File): Promise<string> => {
    if (!onUploadImage) {
      // No upload handler provided - create a tracked blob URL
      console.warn(
        "MDXEditor: No onUploadImage handler provided for image upload",
      );
      const objectUrl = URL.createObjectURL(file);
      createdObjectUrlsRef.current.push(objectUrl);
      return objectUrl;
    }

    try {
      const result = await onUploadImage({
        file,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const url = canonicalizeUrl ? canonicalizeUrl(result.url) : result.url;
      return url;
    } catch (err: any) {
      console.error("MDXEditor: Image upload failed", err);
      throw new Error(err?.message || "Image upload failed");
    }
  };

  // Build plugins array
  const plugins: BaseMDXEditorProps["plugins"] = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    tablePlugin(),
    markdownShortcutPlugin(),
    imagePlugin({
      imageUploadHandler: onUploadImage ? imageUploadHandler : undefined,
      imageAutocompleteSuggestions,
    }),
    ...(showToolbar
      ? [toolbarPlugin({ toolbarContents: () => <DefaultToolbarContents /> })]
      : []),
    ...additionalPlugins,
  ];

  // Build className for theming
  const editorClassName = [
    darkMode ? "dark-theme mdx-editor-dark-theme" : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  // Height style
  const heightValue = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      style={{
        minHeight: heightValue,
        border: "1px solid",
        borderColor: darkMode ? "#555" : "#ccc",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <BaseMDXEditor
        ref={editorRef}
        markdown={initialContentRef.current}
        onChange={handleChange}
        plugins={plugins}
        className={editorClassName}
        placeholder={placeholder}
        readOnly={readOnly}
        contentEditableClassName="mdxeditor-content-editable"
      />
    </div>
  );
});

MDXEditorComponent.displayName = "MDXEditor";

export default MDXEditorComponent;

// Re-export MDXEditorMethods type for consumers
export type { MDXEditorMethods };
