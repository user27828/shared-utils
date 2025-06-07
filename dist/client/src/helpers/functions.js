"use strict";
/**
 * Shared functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateYYMMDD = exports.isValidUrl = exports.pathJoinUrl = exports.isDev = void 0;
/**
 * Check if the current environment is development
 * @param {function} param0.xCriteria - eXtra criteria to check if the environment is development - additional check to default
 */
const isDev = ({ xCriteria = null } = {}) => {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    const isDevelopmentEnv = process.env.NODE_ENV === "development";
    let result = isLocalhost || isDevelopmentEnv;
    if (typeof xCriteria === "function") {
        result = result || xCriteria();
    }
    return result;
};
exports.isDev = isDev;
/**
 * Similar to path.join(), but for URLs - either full, absolute, or relative
 * @param  {...any} args - The URL parts to join
 * @returns {string} The joined URL
 */
const pathJoinUrl = (...args) => {
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
exports.pathJoinUrl = pathJoinUrl;
/**
 * Validates if a string is a properly formatted URL
 *
 * @param {string} url - The URL to validate
 * @param {Object} options - Validation options
 * @param {boolean} options.requireProtocol - Whether to require http/https protocol (default: false)
 * @param {boolean} options.allowQueryParams - Whether to allow query parameters (default: true)
 * @param {boolean} options.allowFragments - Whether to allow URL fragments (default: true)
 * @returns {boolean} True if the URL is valid, false otherwise
 */
const isValidUrl = (url, options = {}) => {
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
exports.isValidUrl = isValidUrl;
/**
 * Format date to YYYY/MM/DD
 * @param {string} dateString - The date string to format (parsable by Date constructor)
 * @returns {string} Formatted date string in YYYY/MM/DD format or "N/A" if invalid
 */
const formatDateYYMMDD = (dateString) => {
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
exports.formatDateYYMMDD = formatDateYYMMDD;
