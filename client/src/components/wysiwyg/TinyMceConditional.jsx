/**
 * Conditional TinyMCE Bundle - only loads if dependencies are available
 * This prevents build errors when TinyMCE dependencies are not installed
 */
import React, { useState, useEffect } from "react";

const MissingDependencyComponent = (props) => {
  console.warn(
    "TinyMCE components require @tinymce/tinymce-react and tinymce to be installed",
  );
  return (
    <div
      style={{
        padding: "1rem",
        border: "1px dashed #ccc",
        borderRadius: "4px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <p>
        <strong>TinyMCE Editor</strong>
      </p>
      <p>
        Install <code>@tinymce/tinymce-react</code> and <code>tinymce</code> to
        use this component.
      </p>
    </div>
  );
};

// Dynamic wrapper component for TinyMceBundle
const TinyMceBundle = (props) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        // Try to resolve the TinyMCE dependencies first
        const { Editor } = await import("@tinymce/tinymce-react");

        // If successful, dynamically create the component
        const TinyMceBundleComponent = (props) => {
          // Import TinyMCE core files
          import("tinymce/tinymce.js");
          import("tinymce/models/dom/model.js");
          import("tinymce/themes/silver/index.js");
          import("tinymce/icons/default/index.js");
          import("tinymce/skins/ui/oxide/skin.js");

          return <Editor {...props} />;
        };

        setComponent(() => TinyMceBundleComponent);
      } catch (error) {
        console.warn("TinyMCE bundle not available:", error.message);
        setComponent(() => MissingDependencyComponent);
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, []);

  if (loading) {
    return <div>Loading editor...</div>;
  }

  return Component ? (
    <Component {...props} />
  ) : (
    <MissingDependencyComponent {...props} />
  );
};

// Dynamic wrapper component for TinyMceEditor
const TinyMceEditor = (props) => {
  const [Component, setComponent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadComponent = async () => {
      try {
        // Try to resolve the TinyMCE dependencies first
        const { Editor } = await import("@tinymce/tinymce-react");

        // If successful, create a simplified editor component
        const TinyMceEditorComponent = (props) => {
          return (
            <Editor
              {...props}
              init={{
                height: 300,
                menubar: false,
                plugins: [
                  "advlist",
                  "autolink",
                  "lists",
                  "link",
                  "image",
                  "charmap",
                  "preview",
                  "anchor",
                  "searchreplace",
                  "visualblocks",
                  "code",
                  "fullscreen",
                  "insertdatetime",
                  "media",
                  "table",
                  "code",
                  "help",
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
                ...props.init,
              }}
            />
          );
        };

        setComponent(() => TinyMceEditorComponent);
      } catch (error) {
        console.warn("TinyMCE editor not available:", error.message);
        setComponent(() => MissingDependencyComponent);
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, []);

  if (loading) {
    return <div>Loading editor...</div>;
  }

  return Component ? (
    <Component {...props} />
  ) : (
    <MissingDependencyComponent {...props} />
  );
};

export { TinyMceBundle, TinyMceEditor };
export default TinyMceBundle;
