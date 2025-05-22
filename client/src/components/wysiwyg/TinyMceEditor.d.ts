import React from 'react';
import { Editor } from '@tinymce/tinymce-react';

export interface TinyMceEditorProps {
  /**
   * Value for the editor
   */
  value?: string;
  /**
   * Handler for when the editor content changes
   */
  onChange?: (content: string) => void;
  /**
   * Additional editor options
   */
  editorOptions?: Record<string, any>;
  /**
   * Height of the editor
   */
  height?: number | string;
  /**
   * Whether the editor is disabled
   */
  disabled?: boolean;
}

export function TinyMceEditor(props: TinyMceEditorProps): JSX.Element;