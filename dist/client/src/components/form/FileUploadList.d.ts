/**
 * Component to handle file uploads and existing file selection
 * This does not handle the API-side, only the visual appearance.
 * Features ability to list files that were uploaded/existing, and initiate new uploads
 */
import React, { ChangeEvent } from "react";
export interface ModeUploadFileProps {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    ext: string;
}
export interface FileUploadListProps {
    selectedFile: File | ModeUploadFileProps | string | null | (File | ModeUploadFileProps | string)[];
    onUploadFileSelect: (file: File | ModeUploadFileProps | null | (File | ModeUploadFileProps)[]) => void;
    selectDefault?: string | null | boolean;
    title?: string;
    uploadText?: string;
    selectText?: string;
    multipleSelect?: boolean;
    multipleUpload?: boolean;
    loadList?: () => void | Promise<ModeUploadFileProps[]> | ModeUploadFileProps[];
    uploadFile?: ({ method, body, }: {
        method: string;
        body: FormData;
    }) => any | Promise<any>;
    fileExtensions?: string[] | string;
    showExistingFiles?: boolean;
    showDeleteExistingFiles?: boolean;
    onFileUpload?: ((event: ChangeEvent<HTMLInputElement>) => void | Promise<void>) | boolean | null;
    onExistingFileSelect?: (file: ModeUploadFileProps | null | ModeUploadFileProps[]) => void;
    onDeleteExistingFile?: (file: ModeUploadFileProps | null) => void;
    onError?: (error: string | Error) => void;
}
/**
 * File upload/selection component
 * @param {boolean} props.multiple - Multiple file upload?
 * @param {boolean} props.showExistingFiles - Show existing files in the associated webservice dir?
 * @param {File|string|null} props.selectedFile - Newly uploaded file becomes selected | the one selected from the list.  Uploads must
 *   populate this value from the caller to indicate upload/handling success.  Type is string if the file is already existing and not an upload
 * @param {null|boolean|string} props.selectDefault - If null/undefined/true: select first item if present. If string: select item with that name if present. If false: do not auto-select.
 * @param {function} props.loadList - Function to load the list of existing files, if applicable
 * @param {function} props.uploadFile - Function to handle file upload, if applicable
 * @param {function} props.onUploadFileSelect - Callback function when a NEW file is selected/deselected.
 * @param {function} props.onExistingFileSelect - Action to take if/when an existing file is selected
 * @param {function} props.onDeleteExistingFile - Action to take if/when an existing file is deleted
 * @param {function} props.onFileUpload - Callback function when a file is uploaded.  If true, the default upload action is taken.
 * @param {function} props.onError - Callback function when an error occurs
 * @param {string} [props.title] - Title of the upload component
 * @param {string} [props.uploadText] - Text for the upload button
 * @param {string} [props.selectText] - Text for the select button
 * @param {boolean} [props.multipleSelect] - Allow multiple existing file selection?
 * @param {boolean} [props.multipleUpload] - Allow multiple file upload?
 * @param {string[]} [props.fileExtensions] - Acceptable file types
 * @param {boolean} [props.showDeleteExistingFiles] - Delete functionality for existing files?
 * @returns {React.JSX}
 * @component
 */
declare const FileUploadList: React.FC<FileUploadListProps>;
export default FileUploadList;
//# sourceMappingURL=FileUploadList.d.ts.map