/**
 * Shared functions
 */
import { isDev as utilsIsDev } from "../../../utils/index.js";
/**
 * @deprecated Use the consolidated `isDev` from '@shared-utils/utils' instead.
 * This version will be removed in a future release.
 */
export const isDev = ({ xCriteria = null, } = {}) => utilsIsDev({ xCriteria, environment: "client" });
/**
 * Similar to path.join(), but for URLs - either full, absolute, or relative
 * @param args - The URL parts to join
 * @returns The joined URL
 */
export const pathJoinUrl = (...args) => {
    const parts = [];
    let protocolPart = ""; // Will store "http://", "https://", or "//"
    let isAbsolutePath = false; // For paths like /foo/bar
    args.forEach((arg, index) => {
        const currentArg = String(arg);
        if (index === 0) {
            if (currentArg.includes("://")) {
                // Case 1: Full URL like http://example.com
                const [proto, ...rest] = currentArg.split("://");
                protocolPart = proto + "://";
                const pathAfterProtocol = rest.join("://");
                parts.push(...pathAfterProtocol.split("/").filter(Boolean));
            }
            else if (currentArg.startsWith("//")) {
                // Case 2: Protocol-relative like //example.com
                protocolPart = "//";
                const pathAfterProtocolRelative = currentArg.substring(2); // Remove leading //
                parts.push(...pathAfterProtocolRelative.split("/").filter(Boolean));
            }
            else if (currentArg.startsWith("/")) {
                // Case 3: Absolute path like /foo/bar
                isAbsolutePath = true;
                parts.push(...currentArg.split("/").filter(Boolean));
            }
            else {
                // Case 4: Relative path like foo/bar
                parts.push(...currentArg.split("/").filter(Boolean));
            }
        }
        else {
            // For subsequent arguments
            parts.push(...currentArg.split("/").filter(Boolean));
        }
    });
    let joinedPath = parts.join("/");
    if (protocolPart) {
        return protocolPart + joinedPath; // Full URL or protocol-relative
    }
    else if (isAbsolutePath) {
        return "/" + joinedPath; // Absolute path
    }
    else {
        return joinedPath; // Relative path, no leading slash
    }
};
/**
 * Validates if a string is a properly formatted URL
 *
 * @param url - The URL to validate
 * @param options - Validation options
 * @param options.requireProtocol - Whether to require http/https protocol (default: false)
 * @param options.allowQueryParams - Whether to allow query parameters (default: true)
 * @param options.allowFragments - Whether to allow URL fragments (default: true)
 * @returns True if the URL is valid, false otherwise
 */
export const isValidUrl = (url, options = {}) => {
    // Return false for empty values to allow optional URLs
    if (!url || url.trim() === "") {
        return true;
    }
    const { requireProtocol = false, allowQueryParams = true, allowFragments = true, } = options;
    try {
        // Check basic format with regex first (more efficient than try/catch URL)
        const protocolPattern = requireProtocol
            ? "^https?:\\/\\/"
            : "^(https?:\\/\\/)?";
        const queryPattern = allowQueryParams ? "(\\?[;&a-z\\d%_.~+=-]*)?" : "";
        const fragmentPattern = allowFragments ? "(\\#[-a-z\\d_]*)?" : "";
        const pattern = new RegExp(protocolPattern + // Protocol (optional or required)
            "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // Domain name
            "((\\d{1,3}\\.){3}\\d{1,3}))" + // OR IP (v4) address
            "(\\:\\d+)?" + // Port
            "(\\/[-a-z\\d%_.~+]*)*" + // Path
            queryPattern + // Query string
            fragmentPattern + // Fragment locator
            "$", "i");
        if (!pattern.test(url)) {
            return false;
        }
        // For additional validation, try creating a URL object
        // This catches more edge cases than regex alone
        new URL(requireProtocol ? url : url.startsWith("http") ? url : `https://${url}`);
        return true;
    }
    catch (e) {
        return false;
    }
};
/**
 * Format date to YYYY/MM/DD
 * @param dateString - The date string to format (parsable by Date constructor)
 * @returns Formatted date string in YYYY/MM/DD format or "N/A" if invalid
 */
export const formatDateYYMMDD = (dateString) => {
    if (!dateString) {
        return "N/A";
    }
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return dateString;
    }
    return (date.getFullYear() +
        "/" +
        String(date.getMonth() + 1).padStart(2, "0") +
        "/" +
        String(date.getDate()).padStart(2, "0"));
};
