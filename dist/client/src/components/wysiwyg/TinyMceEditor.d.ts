/**
 * WYSIWYG editor component using TinyMCE (Free Version)
 * @see {@link ./TinyMceBundle.tsx}
 * @module TinyMceEditor
 */
import React from "react";
export interface TinyMceEditorProps {
    /**
     * Initial editor content
     */
    data?: string;
    /**
     * Change handler function
     */
    onChange?: (event: any, editor: {
        getData: () => string;
    }) => void;
    /**
     * Additional props passed to the TinyMCE editor
     */
    [key: string]: any;
}
/**
 * Rich text editor component based on TinyMCE's free version
 */
declare const TinyMceEditor: React.FC<TinyMceEditorProps>;
export default TinyMceEditor;
//# sourceMappingURL=TinyMceEditor.d.ts.map