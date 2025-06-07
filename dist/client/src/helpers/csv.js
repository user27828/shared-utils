"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportDataToCsv = void 0;
const papaparse_1 = __importDefault(require("papaparse"));
/**
 * Export data to CSV file and download it
 * @param {Object} options - Configuration options
 * @param {Array} options.data - Array of objects to export
 * @param {Array} options.fields - Array of field configs: { key, label, formatter }
 * @param {string} options.filename - Name of the file to download (without extension)
 * @param {string} [options.fileExtension=csv] - File extension
 * @param {boolean} [options.includeHeaders=true] - Whether to include headers in the CSV
 * @returns {void}
 *
 * @example
 * exportDataToCsv({
 *   data: [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }],
 *   fields: [
 *     { key: 'name', label: 'Full Name' },
 *     { key: 'age', label: 'Age', formatter: (value) => `${value} years` }
 *   ],
 *   filename: 'users-export'
 * });
 */
const exportDataToCsv = ({ data = [], fields = [], filename = "export", fileExtension = "csv", includeHeaders = true, }) => {
    if (!data.length || !fields.length) {
        console.error("Data or fields are empty");
        return;
    }
    // Transform data to match fields configuration
    const processedData = data.map((item) => {
        const row = {};
        fields.forEach((field) => {
            // Get the value using the key
            const value = field.key.split(".").reduce((obj, key) => obj?.[key], item);
            // Apply formatter if provided
            row[field.label] =
                field.formatter && value !== undefined
                    ? field.formatter(value, item)
                    : (value ?? "");
        });
        return row;
    });
    // Generate CSV
    const csvContent = papaparse_1.default.unparse(processedData, {
        header: includeHeaders,
        newline: "\n",
    });
    // Create and download file
    // Prepend BOM for better Excel compatibility
    const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.${fileExtension}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
exports.exportDataToCsv = exportDataToCsv;
exports.default = {
    exportDataToCsv: exports.exportDataToCsv,
};
