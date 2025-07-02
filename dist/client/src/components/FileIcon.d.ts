/**
 * Component to display an icon based on the file type.
 * Examples:
 * - <FileIcon type="jpg" />
 * - <FileIcon type="application/pdf" />
 * - <FileIcon type="image" />
 * - <FileIcon filename="document.pdf" />
 * - <FileIcon filename="script.js" />
 */
import React from "react";
import { SvgIconProps } from "@mui/material/SvgIcon";
interface FileIconProps extends Omit<SvgIconProps, "children"> {
    /** File extension, MIME type, or generic type (e.g., "jpg", "application/pdf", "image") */
    type?: string;
    /** Full filename to extract extension from (e.g., "document.pdf", "script.js") */
    filename?: string;
}
declare const FileIcon: React.FC<FileIconProps>;
export default FileIcon;
//# sourceMappingURL=FileIcon.d.ts.map