import React from "react";
export interface EditorImportFailureProps {
    engine: string;
    error: unknown;
    value?: string;
    height?: string | number;
    readOnly?: boolean;
    onChange: (value: string) => void;
}
declare const EditorImportFailure: React.FC<EditorImportFailureProps>;
export default EditorImportFailure;
