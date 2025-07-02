import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import FileIcon from "./FileIcon";
const FileIconExample = () => {
    return (_jsxs("div", { style: {
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: "20px",
        }, children: [_jsx("h2", { children: "FileIcon Component Examples" }), _jsxs("div", { style: { display: "flex", gap: "16px", flexWrap: "wrap" }, children: [_jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "jpg" }), _jsx("span", { children: "JPG Image" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "pdf" }), _jsx("span", { children: "PDF Document" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "js" }), _jsx("span", { children: "JavaScript" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "mp4" }), _jsx("span", { children: "MP4 Video" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "mp3" }), _jsx("span", { children: "MP3 Audio" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "zip" }), _jsx("span", { children: "ZIP Archive" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "image/jpeg" }), _jsx("span", { children: "MIME: image/jpeg" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "unknown" }), _jsx("span", { children: "Unknown Type" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { type: "txt", color: "primary", fontSize: "large" }), _jsx("span", { children: "Text (Large, Primary)" })] })] }), _jsx("h3", { children: "Filename Examples" }), _jsxs("div", { style: { display: "flex", gap: "16px", flexWrap: "wrap" }, children: [_jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { filename: "document.pdf" }), _jsx("span", { children: "document.pdf" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { filename: "script.js" }), _jsx("span", { children: "script.js" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { filename: "photo.jpg" }), _jsx("span", { children: "photo.jpg" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { filename: "archive.zip" }), _jsx("span", { children: "archive.zip" })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "8px",
                        }, children: [_jsx(FileIcon, { filename: "no-extension" }), _jsx("span", { children: "no-extension" })] })] }), _jsx("h3", { children: "Generic Types" }), _jsx("div", { style: { display: "flex", gap: "16px", flexWrap: "wrap" }, children: [
                    "image",
                    "document",
                    "video",
                    "audio",
                    "code",
                    "text",
                    "program",
                    "app",
                    "unknown",
                    "generic",
                ].map((fallback) => (_jsxs("div", { style: {
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                    }, children: [_jsx(FileIcon, { type: fallback }), _jsx("span", { children: fallback })] }, fallback))) })] }));
};
export default FileIconExample;
