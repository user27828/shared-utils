import React from "react";

export interface EditorImportFailureProps {
  engine: string;
  error: unknown;
  value?: string;
  height?: string | number;
  readOnly?: boolean;
  onChange: (value: string) => void;
}

const EditorImportFailure: React.FC<EditorImportFailureProps> = ({
  engine,
  error,
  value = "",
  height = 320,
  readOnly,
  onChange,
}) => {
  const message = error instanceof Error ? error.message : String(error);
  const minHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div role="alert" data-editor-import-error={engine}>
      <p>
        {engine} could not be loaded: {message}
      </p>
      <textarea
        aria-label={`${engine} fallback editor`}
        value={value}
        disabled={readOnly}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: "100%", minHeight, resize: "vertical" }}
      />
    </div>
  );
};

export default EditorImportFailure;
