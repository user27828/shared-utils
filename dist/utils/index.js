// Import OptionsManager singleton first so modules that run at import time
// (like `log`) can find the canonical optionsManager via
// `globalThis.__shared_utils_optionsManager` if needed.
import { OptionsManager, optionsManager } from "./src/options-manager.js";
import log, { Log, ORIGINAL_CONSOLE_METHODS } from "./src/log.js";
import turnstile, { Turnstile } from "./src/turnstile.js";
import { isDev, formatFileSize, sanitizeFilename, convertBytesToUnit, getFileExtension, removeFileExtension, isValidFilename, isValidEmail, formatDate, } from "./src/functions.js";
import { detectFormatFromText } from "./src/detectFormat/index.js";
export { 
// Logging utilities
log, Log, ORIGINAL_CONSOLE_METHODS, 
// Turnstile utilities
turnstile, Turnstile, 
// Options management
OptionsManager, optionsManager, 
// Environment utilities
isDev, 
// File utilities
formatFileSize, sanitizeFilename, convertBytesToUnit, getFileExtension, removeFileExtension, isValidFilename, isValidEmail, formatDate, detectFormatFromText, // plain text format detection
 };
