import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Component to handle file uploads and existing file selection
 * This does not handle the API-side, only the visual appearance.
 * Features ability to list files that were uploaded/existing, and initiate new uploads
 */
import { useEffect, useState, useRef, useCallback, } from "react";
import { get, isArray, isFunction, isNumber, isString, size } from "lodash-es";
import { Alert, Button, Card, CardContent, CardHeader, CircularProgress, FormControl, IconButton, InputLabel, ListItemIcon, MenuItem, Select, Stack, } from "@mui/material";
import { AttachFile as AttachFileIcon, DeleteForever as DeleteForeverIcon, } from "@mui/icons-material";
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
const FileUploadList = ({ title = "", uploadText = "Upload File...", selectText = "Existing Uploads", multipleSelect = false, multipleUpload = false, showExistingFiles = false, loadList = () => { }, // Function to load the list of existing files, if applicable
uploadFile = () => { }, // Function to handle file upload, if applicable
fileExtensions = ["csv", "tsv", "txt"], //".csv, .tsv, .txt"
// eslint-disable-next-line @typescript-eslint/no-unused-vars
showDeleteExistingFiles = false, selectedFile = null, // Newly uploaded file becomes selected | the one selected from the list
selectDefault = undefined, // If null/undefined/true: select first item if present. If string: select item with that name if present. If false: do not auto-select.
onUploadFileSelect = () => { }, onFileUpload = true, // Use local file upload capability
onExistingFileSelect = () => { }, onDeleteExistingFile = () => { }, onError = () => { }, }) => {
    const [menuOpen, setMenuOpen] = useState(false); // Uploaded items menu
    const [existingUpload, setExistingUpload] = useState(null); // State for selected existing upload(s)
    const [existingUploads, setExistingUploads] = useState([]); // State for the list of existing uploads
    const [isProcessing, setIsProcessing] = useState(false); // State for tracking file processing
    const fileInputRef = useRef(null);
    const _fileExtensions = isArray(fileExtensions) && fileExtensions
        ? "." + fileExtensions.join(", .")
        : fileExtensions; // Convert array to string like: ".csv, .tsv, .txt"
    // Handler to programmatically click the hidden file input
    const handleFileClick = useCallback(() => {
        // Don't clear the selection immediately - let the user select a new file first
        // The selection will be cleared when a new file is selected or the operation is cancelled
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Clear previous selection visually in browser
            fileInputRef.current?.click();
        }
    }, []);
    /**
     * Handles changes to the existing uploads/file selection
     */
    const handleExistingUploadChange = useCallback((event) => {
        const value = event.target?.value;
        if (multipleSelect) {
            // Handle multiple selection
            const values = Array.isArray(value) ? value : [value];
            // Check if upload option is selected
            if (values.includes("UPLOAD_OPTION")) {
                handleFileClick();
                return;
            }
            // Filter out empty values and upload option
            const selectedNames = values.filter((v) => v && v !== "UPLOAD_OPTION");
            if (selectedNames.length === 0) {
                // No selection
                setExistingUpload(null);
                onUploadFileSelect(null);
                if (onExistingFileSelect) {
                    onExistingFileSelect(null);
                }
            }
            else {
                // Multiple files selected
                const selectedFiles = existingUploads.filter((f) => selectedNames.includes(f.name));
                setExistingUpload(selectedFiles);
                onUploadFileSelect(selectedFiles);
                if (onExistingFileSelect) {
                    onExistingFileSelect(selectedFiles);
                }
            }
        }
        else {
            // Handle single selection (existing logic)
            const singleValue = Array.isArray(value) ? value[0] : value;
            const stringValue = singleValue ?? "";
            // Check if the selected value is the upload option
            if (stringValue === "UPLOAD_OPTION") {
                // If there are no files, always trigger upload
                handleFileClick();
                // Also clear selection so the dropdown resets
                setExistingUpload(null);
                onUploadFileSelect(null);
                if (onExistingFileSelect) {
                    onExistingFileSelect(null);
                }
                return;
            }
            // Handle "No Selection" case (empty string)
            if (stringValue === "") {
                setExistingUpload(null);
                onUploadFileSelect(null);
                if (onExistingFileSelect) {
                    onExistingFileSelect(null);
                }
                return;
            }
            const selectedFileData = existingUploads.find((f) => f.name === stringValue) || null;
            setExistingUpload(selectedFileData);
            onUploadFileSelect(selectedFileData);
            if (onExistingFileSelect) {
                onExistingFileSelect(selectedFileData);
            }
        }
    }, [
        multipleSelect,
        onExistingFileSelect,
        onUploadFileSelect,
        existingUploads,
        handleFileClick,
    ]);
    /**
     * Call file population function to fetch existing uploads
     * @returns {ModeUploadFileProps[] | void}
     */
    const _fetchExistingUploads = useCallback(() => {
        if (!isFunction(loadList) || !showExistingFiles) {
            setExistingUploads([]);
            return;
        }
        try {
            const result = loadList();
            if (result !== undefined && isFunction(get(result, "then"))) {
                // If loadList returns a promise, wait for it to resolve
                result.then((data) => setExistingUploads(isArray(data) ? data : []));
            }
            else if (isArray(result)) {
                // If loadList returns an array directly
                setExistingUploads(result);
            }
            else {
                setExistingUploads([]);
            }
            return result;
        }
        catch (error) {
            console.error("Error in _fetchExistingUploads:", error);
            setExistingUploads([]);
        }
    }, [loadList, showExistingFiles]);
    /**
     * Handles file upload for single or multiple files
     */
    const handleFileUpload = useCallback(async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            onUploadFileSelect(null);
            return;
        }
        // Convert FileList to array
        const fileArray = Array.from(files);
        // Clear existing upload selection when new files are selected
        setExistingUpload(null);
        if (onExistingFileSelect) {
            onExistingFileSelect(null);
        }
        setIsProcessing(true);
        // Always notify parent component about file selection
        if (multipleUpload) {
            onUploadFileSelect(fileArray);
        }
        else {
            onUploadFileSelect(fileArray[0]);
        }
        if (onFileUpload === false || onFileUpload === null) {
            setIsProcessing(false);
            return;
        }
        else if (isFunction(onFileUpload)) {
            const result = onFileUpload(event);
            if (result && typeof result.then === "function") {
                result.finally(() => setIsProcessing(false));
            }
            else {
                setIsProcessing(false);
            }
            return;
        }
        // onFileUpload===true will continue running this function
        try {
            setIsProcessing(true);
            const uploadResults = [];
            const errors = [];
            // Process each file
            for (const file of fileArray) {
                try {
                    // Prepare form data for upload
                    const formData = new FormData();
                    formData.append("file", file);
                    // Send the file to the handler
                    const uploadResponse = await uploadFile({
                        method: "POST",
                        body: formData,
                    });
                    if (!uploadResponse.ok) {
                        throw new Error(`Upload failed for ${file.name} with status: ${uploadResponse.status}`);
                    }
                    const result = await uploadResponse.json();
                    uploadResults.push(result);
                    console.log(`File ${file.name} uploaded successfully:`, result);
                }
                catch (error) {
                    const errorMessage = `Error uploading ${file.name}: ${error}`;
                    console.error(errorMessage);
                    errors.push(errorMessage);
                }
            }
            // Handle errors
            if (errors.length > 0) {
                const errorMessage = errors.join("; ");
                onError(errorMessage);
                if (errors.length === fileArray.length) {
                    // All uploads failed
                    onUploadFileSelect(null);
                    return;
                }
            }
            // Refresh the list of existing files after upload
            const uploads = await _fetchExistingUploads();
            // Find the uploaded files in the refreshed list
            const uploadedFiles = uploads?.filter((f) => uploadResults.some((result) => f.name === result.filename)) || [];
            if (uploadedFiles.length > 0) {
                if (multipleUpload) {
                    setExistingUpload(uploadedFiles);
                    onUploadFileSelect(uploadedFiles);
                    if (onExistingFileSelect) {
                        onExistingFileSelect(uploadedFiles);
                    }
                }
                else {
                    // Single file mode - use the first uploaded file
                    const firstUploadedFile = uploadedFiles[0];
                    setExistingUpload(firstUploadedFile);
                    onUploadFileSelect(firstUploadedFile);
                    if (onExistingFileSelect) {
                        onExistingFileSelect(firstUploadedFile);
                    }
                }
            }
            else {
                console.warn("Uploaded files not found in the refreshed file list");
            }
        }
        catch (error) {
            const errorMessage = `Error uploading files: ${error}`;
            console.error(errorMessage);
            onError(errorMessage);
            onUploadFileSelect(null);
        }
        finally {
            setIsProcessing(false);
        }
    }, [
        multipleUpload,
        onExistingFileSelect,
        onUploadFileSelect,
        onError,
        _fetchExistingUploads,
        onFileUpload,
        uploadFile,
    ]);
    // Fetches the list of existing uploads if enabled
    useEffect(() => {
        if (showExistingFiles) {
            _fetchExistingUploads();
        }
    }, [showExistingFiles]); // Re-fetch if apiUrl or showExistingFiles changes
    // Separate effect to sync selectedFile with existingUpload for existing files
    useEffect(() => {
        if (multipleSelect) {
            // Handle multiple selection mode
            if (Array.isArray(selectedFile) && existingUploads.length > 0) {
                const selectedFiles = selectedFile
                    .filter((f) => isString(f))
                    .map((fileName) => {
                    // Try exact match first
                    let found = existingUploads.find((f) => f.name === fileName);
                    // Try without extension if no exact match
                    if (!found) {
                        found = existingUploads.find((f) => {
                            if (!f || !f.name) {
                                return false;
                            }
                            const nameWithoutExt = f.name.lastIndexOf(".") > 0
                                ? f.name.substring(0, f.name.lastIndexOf("."))
                                : f.name;
                            return nameWithoutExt === fileName;
                        });
                    }
                    return found;
                })
                    .filter(Boolean);
                setExistingUpload(selectedFiles.length > 0 ? selectedFiles : null);
            }
            else if (!selectedFile) {
                setExistingUpload(null);
            }
        }
        else {
            // Handle single selection mode (existing logic)
            if (selectedFile &&
                isString(selectedFile) &&
                existingUploads.length > 0) {
                let _existingUpload = existingUploads.find((f) => f.name === selectedFile);
                if (!_existingUpload) {
                    _existingUpload = existingUploads.find((f) => {
                        if (!f || !f.name) {
                            return false;
                        }
                        const fileNameWithoutExt = f.name.lastIndexOf(".") > 0
                            ? f.name.substring(0, f.name.lastIndexOf("."))
                            : f.name;
                        return fileNameWithoutExt === selectedFile;
                    });
                }
                setExistingUpload(_existingUpload || null);
            }
            else if (!selectedFile) {
                setExistingUpload(null);
            }
        }
    }, [selectedFile, existingUploads, multipleSelect]);
    // Calculate the effective value for the Select component
    const getEffectiveSelectValue = () => {
        if (!showExistingFiles) {
            if (multipleSelect) {
                return [];
            }
            else {
                return "";
            }
        }
        if (multipleSelect) {
            // Always return an array for multiple mode
            if (Array.isArray(existingUpload)) {
                const selectedNames = existingUpload
                    .map((f) => f.name)
                    .filter((name) => validExistingUploads.some((upload) => upload.name === name));
                return selectedNames.length > 0 ? selectedNames : [];
            }
            return [];
        }
        else {
            // Single select
            const currentSelectedFileName = get(existingUpload, "name", "");
            const isActuallySelectedInList = validExistingUploads.some((upload) => upload.name === currentSelectedFileName);
            const shouldDefaultToUpload = validExistingUploads.length === 0;
            return currentSelectedFileName && isActuallySelectedInList
                ? currentSelectedFileName
                : shouldDefaultToUpload
                    ? "UPLOAD_OPTION"
                    : "";
        }
    };
    // Ensure existingUploads is always an array for .some()
    const validExistingUploads = Array.isArray(existingUploads)
        ? existingUploads
        : [];
    const effectiveSelectValue = getEffectiveSelectValue();
    // Auto-select default item if needed
    useEffect(() => {
        if (!showExistingFiles || !validExistingUploads.length) {
            return;
        }
        // Only auto-select if nothing is selected
        const nothingSelected = (!existingUpload ||
            (Array.isArray(existingUpload) && !existingUpload.length)) &&
            (!selectedFile || (Array.isArray(selectedFile) && !selectedFile.length));
        if (!nothingSelected) {
            return;
        }
        // If selectDefault is false, do not auto-select
        if (selectDefault === false) {
            return;
        }
        if (multipleSelect) {
            // For multiple select, only select if selectDefault is a string and matches
            if (typeof selectDefault === "string") {
                const found = validExistingUploads.find((f) => f.name === selectDefault);
                if (found) {
                    setExistingUpload([found]);
                    onUploadFileSelect([found]);
                    if (onExistingFileSelect)
                        onExistingFileSelect([found]);
                }
            }
            else if (selectDefault === true || selectDefault == null) {
                // true/null/undefined: select first if only one
                if (validExistingUploads.length === 1) {
                    setExistingUpload([validExistingUploads[0]]);
                    onUploadFileSelect([validExistingUploads[0]]);
                    if (onExistingFileSelect)
                        onExistingFileSelect([validExistingUploads[0]]);
                }
            }
        }
        else {
            // Single select
            let defaultItem;
            if (typeof selectDefault === "string") {
                defaultItem = validExistingUploads.find((f) => f.name === selectDefault);
            }
            else if (selectDefault === true) {
                // true: select first item if present
                if (validExistingUploads.length > 0) {
                    defaultItem = validExistingUploads[0];
                }
            }
            if (defaultItem) {
                setExistingUpload(defaultItem);
                onUploadFileSelect(defaultItem);
                if (onExistingFileSelect)
                    onExistingFileSelect(defaultItem);
            }
        }
    }, [
        showExistingFiles,
        validExistingUploads,
        selectDefault,
        multipleSelect,
        existingUpload,
        selectedFile,
        onUploadFileSelect,
        onExistingFileSelect,
    ]);
    return (_jsxs(Card, { raised: true, sx: { m: 1, mt: 3 }, children: [_jsx(CardHeader, { disableTypography: true, title: title, sx: { p: 1 } }), _jsxs(CardContent, { children: [!showExistingFiles && (_jsx(_Fragment, { children: _jsxs("label", { htmlFor: "contained-button-file", children: [_jsx("input", { accept: _fileExtensions, id: "contained-button-file", type: "file", multiple: multipleUpload, onChange: handleFileUpload, ref: fileInputRef, style: { display: "none" }, "data-testid": "file-input" }), _jsx(Button, { variant: "contained", size: "small", fullWidth: true, onClick: handleFileClick, startIcon: _jsx(AttachFileIcon, {}), children: uploadText }), selectedFile && isProcessing && (_jsx(Alert, { variant: "outlined", severity: "info", icon: _jsx(CircularProgress, { size: 20 }), sx: { m: 1 }, children: _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [Array.isArray(selectedFile)
                                                ? selectedFile
                                                    .map((f) => (isString(f) ? f : get(f, "name", "")))
                                                    .join(", ")
                                                : isString(selectedFile)
                                                    ? selectedFile
                                                    : get(selectedFile, "name", ""), " ", "Processing"] }) }))] }) })), showExistingFiles && (_jsx("input", { accept: _fileExtensions, id: "contained-button-file", type: "file", multiple: multipleUpload, onChange: handleFileUpload, ref: fileInputRef, style: { display: "none" }, "data-testid": "file-input" })), showExistingFiles && selectedFile && isProcessing && (_jsx(Alert, { variant: "outlined", severity: "info", icon: _jsx(CircularProgress, { size: 20 }), sx: { m: 1, mb: 2 }, children: _jsxs(Stack, { direction: "row", spacing: 1, alignItems: "center", children: [Array.isArray(selectedFile)
                                    ? selectedFile
                                        .map((f) => (isString(f) ? f : get(f, "name", "")))
                                        .join(", ")
                                    : isString(selectedFile)
                                        ? selectedFile
                                        : get(selectedFile, "name", ""), " ", "Processing"] }) })), showExistingFiles && (_jsxs(FormControl, { fullWidth: true, children: [_jsx(InputLabel, { id: "existing-upload-label", children: selectText }), _jsxs(Select, { labelId: "existing-upload-label", id: "existing-upload", value: effectiveSelectValue, label: selectText, onChange: handleExistingUploadChange, open: menuOpen, onOpen: () => setMenuOpen(true), onClose: () => setMenuOpen(false), multiple: multipleSelect, children: [_jsx(MenuItem, { value: "UPLOAD_OPTION", onClick: () => {
                                            if (effectiveSelectValue === "UPLOAD_OPTION") {
                                                handleFileClick();
                                            }
                                        }, children: validExistingUploads.length === 0
                                            ? `${uploadText} (no existing uploads)`
                                            : `*${uploadText}*` }), validExistingUploads.length > 0 && (_jsx(MenuItem, { value: "", children: "*No Selection*" })), isArray(existingUploads) &&
                                        size(existingUploads) > 0 &&
                                        existingUploads.map((item) => {
                                            if (!item || !isString(item.name) || !isNumber(item.size)) {
                                                return null;
                                            }
                                            const { name: filename, size } = item;
                                            if (!filename || !size) {
                                                return null;
                                            }
                                            return (_jsxs(MenuItem, { value: filename, sx: {
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                }, children: [filename, " (", (size / (1024 * 1024)).toFixed(2), " MB)", showDeleteExistingFiles &&
                                                        menuOpen &&
                                                        filename &&
                                                        size && (_jsx(ListItemIcon, { children: _jsx(IconButton, { edge: "end", "aria-label": "delete", size: "small", onClick: (event) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                onDeleteExistingFile(item);
                                                            }, sx: { ml: -0.5, opacity: 0.9 }, children: _jsx(DeleteForeverIcon, { color: "error", fontSize: "small" }) }) }))] }, filename));
                                        })] })] }))] })] }));
};
export default FileUploadList;
