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
import {
  // Image icons
  ImageOutlined,
  PhotoCameraOutlined,

  // Document icons
  DescriptionOutlined,
  ArticleOutlined,
  PictureAsPdfOutlined,
  TableChartOutlined,
  SlideshowOutlined,

  // Code icons
  CodeOutlined,
  IntegrationInstructionsOutlined,
  DataObjectOutlined,

  // Audio/Video icons
  AudioFileOutlined,
  VideoFileOutlined,
  MusicNoteOutlined,
  MovieOutlined,

  // Archive icons
  FolderZipOutlined,

  // App/Program icons
  AppsOutlined,
  MemoryOutlined,

  // Text icons
  TextSnippetOutlined,

  // Generic icons
  InsertDriveFileOutlined,
  HelpOutlineOutlined,

  // Web icons
  LanguageOutlined,

  // Font icons
  FontDownloadOutlined,

  // Database icons
  StorageOutlined,

  // Settings/Config icons
  SettingsOutlined,

  // Certificate/Security icons
  SecurityOutlined,
  VerifiedUserOutlined,
  Cloud,
  CloudOutlined,
} from "@mui/icons-material";
import { SvgIconProps } from "@mui/material/SvgIcon";

interface FileIconProps extends Omit<SvgIconProps, "children"> {
  /** File extension, MIME type, or generic type (e.g., "jpg", "application/pdf", "image") */
  type?: string;
  /** Full filename to extract extension from (e.g., "document.pdf", "script.js") */
  filename?: string;
}

const FileIcon: React.FC<FileIconProps> = ({
  type,
  filename,
  ...iconProps
}) => {
  // Extract extension from filename if provided
  const getExtensionFromFilename = (fileName: string): string => {
    const lastDotIndex = fileName.lastIndexOf(".");
    if (lastDotIndex === -1 || lastDotIndex === fileName.length - 1) {
      return "";
    }
    return fileName.slice(lastDotIndex + 1);
  };

  // Determine the type to use (filename extension takes priority over type prop)
  const resolvedType = filename
    ? getExtensionFromFilename(filename)
    : type || "generic";

  const getIconFromType = (inputType: string) => {
    const typeInput = inputType.toLowerCase().replace(".", "");

    // Handle MIME types first
    if (typeInput.includes("/")) {
      return getIconFromMimeType(typeInput);
    }

    // Handle file extensions
    return getIconFromExtension(typeInput);
  };
  const getIconFromExtension = (extension: string) => {
    const ext = extension.toLowerCase().replace(".", "");

    // Image formats
    if (
      [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "bmp",
        "webp",
        "svg",
        "ico",
        "tiff",
        "tif",
      ].includes(ext)
    ) {
      return ImageOutlined;
    }
    if (["raw", "cr2", "nef", "arw", "dng"].includes(ext)) {
      return PhotoCameraOutlined;
    }

    // Document formats
    if (["pdf"].includes(ext)) {
      return PictureAsPdfOutlined;
    }
    if (["doc", "docx", "odt", "rtf"].includes(ext)) {
      return DescriptionOutlined;
    }
    if (["txt", "md", "readme", "log"].includes(ext)) {
      return TextSnippetOutlined;
    }
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) {
      return TableChartOutlined;
    }
    if (["ppt", "pptx", "odp"].includes(ext)) {
      return SlideshowOutlined;
    }

    // Code formats
    if (["js", "jsx", "ts", "tsx", "vue", "svelte"].includes(ext)) {
      return CodeOutlined;
    }
    if (["html", "htm", "xml", "xhtml"].includes(ext)) {
      return LanguageOutlined;
    }
    if (["css", "scss", "sass", "less", "stylus"].includes(ext)) {
      return CodeOutlined;
    }
    if (["json", "yaml", "yml", "toml", "ini", "cfg", "conf"].includes(ext)) {
      return DataObjectOutlined;
    }
    if (
      [
        "py",
        "rb",
        "php",
        "java",
        "c",
        "cpp",
        "h",
        "hpp",
        "cs",
        "go",
        "rs",
        "swift",
        "kt",
        "scala",
        "pl",
        "sh",
        "bash",
        "zsh",
        "fish",
        "ps1",
        "bat",
        "cmd",
      ].includes(ext)
    ) {
      return IntegrationInstructionsOutlined;
    }
    if (["sql", "db", "sqlite", "sqlite3"].includes(ext)) {
      return StorageOutlined;
    }

    // Audio formats
    if (
      ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "opus"].includes(ext)
    ) {
      return AudioFileOutlined;
    }
    if (["mid", "midi"].includes(ext)) {
      return MusicNoteOutlined;
    }

    // Video formats
    if (
      ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v", "3gp"].includes(
        ext,
      )
    ) {
      return VideoFileOutlined;
    }
    if (["mpg", "mpeg", "vob"].includes(ext)) {
      return MovieOutlined;
    }

    // Archive formats
    if (
      [
        "zip",
        "rar",
        "7z",
        "tar",
        "gz",
        "bz2",
        "xz",
        "lz",
        "lzma",
        "z",
      ].includes(ext)
    ) {
      return FolderZipOutlined;
    }

    // Executable/Application formats
    if (
      ["exe", "msi", "app", "deb", "rpm", "dmg", "pkg", "appimage"].includes(
        ext,
      )
    ) {
      return AppsOutlined;
    }
    if (["dll", "so", "dylib", "lib", "a"].includes(ext)) {
      return MemoryOutlined;
    }

    // Font formats
    if (["ttf", "otf", "woff", "woff2", "eot"].includes(ext)) {
      return FontDownloadOutlined;
    }

    // Certificate/Security formats
    if (["pem", "crt", "cer", "p12", "pfx", "key", "pub"].includes(ext)) {
      return SecurityOutlined;
    }

    // Config/Settings formats
    if (["env", "properties", "settings", "prefs", "config"].includes(ext)) {
      return SettingsOutlined;
    }

    return null;
  };

  const getIconFromMimeType = (mimeType: string) => {
    const mime = mimeType.toLowerCase();

    // Image MIME types
    if (mime.startsWith("image/")) {
      return ImageOutlined;
    }

    // Document MIME types
    if (mime === "application/pdf") {
      return PictureAsPdfOutlined;
    }
    if (mime.includes("document") || mime.includes("word")) {
      return DescriptionOutlined;
    }
    if (mime.includes("spreadsheet") || mime.includes("excel")) {
      return TableChartOutlined;
    }
    if (mime.includes("presentation") || mime.includes("powerpoint")) {
      return SlideshowOutlined;
    }
    if (mime.startsWith("text/")) {
      if (mime.includes("html") || mime.includes("xml")) {
        return LanguageOutlined;
      }
      if (mime.includes("css")) {
        return CodeOutlined;
      }
      if (mime.includes("javascript") || mime.includes("typescript")) {
        return CodeOutlined;
      }
      return TextSnippetOutlined;
    }

    // Code MIME types
    if (
      mime.includes("javascript") ||
      mime.includes("typescript") ||
      mime.includes("json")
    ) {
      return CodeOutlined;
    }
    if (mime.includes("html") || mime.includes("xml")) {
      return LanguageOutlined;
    }

    // Audio MIME types
    if (mime.startsWith("audio/")) {
      return AudioFileOutlined;
    }

    // Video MIME types
    if (mime.startsWith("video/")) {
      return VideoFileOutlined;
    }

    // Archive MIME types
    if (
      mime.includes("zip") ||
      mime.includes("archive") ||
      mime.includes("compressed")
    ) {
      return FolderZipOutlined;
    }

    // Application MIME types
    if (mime.includes("executable") || mime.includes("octet-stream")) {
      return AppsOutlined;
    }

    // Font MIME types
    if (mime.includes("font")) {
      return FontDownloadOutlined;
    }

    return null;
  };

  const getFallbackIcon = (fallbackType: string) => {
    const type = fallbackType.toLowerCase();

    // Handle generic category types
    if (
      type.includes("image") ||
      type === "img" ||
      type === "picture" ||
      type === "photo"
    ) {
      return ImageOutlined;
    }
    if (type.includes("document") || type === "doc" || type === "file") {
      return DescriptionOutlined;
    }
    if (type.includes("video") || type === "movie" || type === "film") {
      return VideoFileOutlined;
    }
    if (type.includes("audio") || type === "sound" || type === "music") {
      return AudioFileOutlined;
    }
    if (type.includes("code") || type === "programming" || type === "script") {
      return CodeOutlined;
    }
    if (type.includes("text") || type === "txt") {
      return TextSnippetOutlined;
    }
    if (
      type.includes("program") ||
      type.includes("app") ||
      type.includes("application") ||
      type === "exe"
    ) {
      return AppsOutlined;
    }
    if (type.includes("cloud") || type === "remote") {
      return CloudOutlined;
    }
    if (type.includes("unknown") || type === "?" || type === "mystery") {
      return HelpOutlineOutlined;
    }

    // Default generic file icon
    return InsertDriveFileOutlined;
  };

  // Determine which icon to use
  let IconComponent = getIconFromType(resolvedType);

  // Use generic fallback if no match found
  if (!IconComponent) {
    IconComponent = getFallbackIcon(resolvedType);
  }

  return <IconComponent {...iconProps} />;
};

export default FileIcon;
