import Papa from "papaparse";

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
export const exportDataToCsv = ({
  data = [],
  fields = [],
  filename = "export",
  fileExtension = "csv",
  includeHeaders = true,
}) => {
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
  const csvContent = Papa.unparse(processedData, {
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

/**
 * Import CSV data from a file
 * @param {File} file - The CSV file to import
 * @param {Object} options - Configuration options
 * @param {boolean} [options.header=true] - Whether the first row contains headers
 * @param {string} [options.delimiter=","] - CSV delimiter
 * @param {function} [options.transform] - Function to transform each row
 * @param {function} [options.validate] - Function to validate each row
 * @returns {Promise<Object>} Object with { data, errors, meta }
 *
 * @example
 * const result = await importCsvData(file, {
 *   header: true,
 *   transform: (row) => ({ ...row, age: parseInt(row.age) }),
 *   validate: (row) => row.email && row.name
 * });
 */
export const importCsvData = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      header = true,
      delimiter = ",",
      transform = null,
      validate = null,
    } = options;

    if (!file || !(file instanceof File)) {
      reject(new Error("Valid file is required"));
      return;
    }

    if (!file.type.includes("csv") && !file.name.endsWith(".csv")) {
      reject(new Error("File must be a CSV file"));
      return;
    }

    Papa.parse(file, {
      header,
      delimiter,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          let processedData = results.data;
          const errors = [];

          // Apply transformation and validation
          if (transform || validate) {
            processedData = results.data
              .map((row, index) => {
                try {
                  // Apply transformation
                  const transformedRow = transform
                    ? transform(row, index)
                    : row;

                  // Apply validation
                  if (validate && !validate(transformedRow, index)) {
                    errors.push({
                      row: index + (header ? 2 : 1), // Account for header and 0-based index
                      error: "Validation failed",
                      data: transformedRow,
                    });
                    return null;
                  }

                  return transformedRow;
                } catch (error) {
                  errors.push({
                    row: index + (header ? 2 : 1),
                    error: error.message,
                    data: row,
                  });
                  return null;
                }
              })
              .filter((row) => row !== null);
          }

          resolve({
            data: processedData,
            errors: [...results.errors, ...errors],
            meta: {
              ...results.meta,
              delimiter: results.meta.delimiter,
              linebreak: results.meta.linebreak,
              aborted: results.meta.aborted,
              truncated: results.meta.truncated,
              cursor: results.meta.cursor,
              fields: header ? Object.keys(processedData[0] || {}) : [],
              rowCount: processedData.length,
              errorCount: errors.length,
            },
          });
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
};

/**
 * Validate CSV file before import
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @param {number} [options.maxSize=10485760] - Maximum file size in bytes (default 10MB)
 * @param {Array} [options.allowedExtensions=['.csv']] - Allowed file extensions
 * @returns {Object} { valid: boolean, error?: string }
 */
export const validateCsvFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedExtensions = [".csv", ".txt"],
  } = options;

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!(file instanceof File)) {
    return { valid: false, error: "Invalid file object" };
  }

  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (${(maxSize / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // Check file extension
  const fileName = file.name.toLowerCase();
  const hasValidExtension = allowedExtensions.some((ext) =>
    fileName.endsWith(ext),
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: `File extension must be one of: ${allowedExtensions.join(", ")}`,
    };
  }

  // Check MIME type
  if (file.type && !file.type.includes("csv") && !file.type.includes("text")) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type}. Expected CSV or text file.`,
    };
  }

  return { valid: true };
};

export default {
  exportDataToCsv,
  importCsvData,
  validateCsvFile,
};
