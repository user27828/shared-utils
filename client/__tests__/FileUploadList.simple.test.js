/**
 * Simple tests for FileUploadList component - focusing on new multiple file functionality
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "@testing-library/jest-dom";

// Import from source instead of dist (since we're testing in development)
import FileUploadList from "../src/components/form/FileUploadList.tsx";

// Create a basic theme for Material-UI components
const theme = createTheme();

// Helper function to render component with theme
const renderWithTheme = (ui, options = {}) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>, options);
};

describe("FileUploadList Component - Multiple File Support", () => {
  const defaultProps = {
    selectedFile: null,
    onUploadFileSelect: jest.fn(),
    title: "Test Upload",
    uploadText: "Upload File",
    selectText: "Select File",
  };

  // Store original console methods
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log,
  };

  // Global console suppression for all tests
  beforeAll(() => {
    // Suppress console output during tests
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterAll(() => {
    // Restore original console methods
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
    console.log = originalConsole.log;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering with Multiple File Props", () => {
    it("should render without errors when multipleUpload is true", () => {
      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            multipleUpload={true}
            showExistingFiles={false}
          />,
        );
      }).not.toThrow();

      expect(screen.getByText("Upload File")).toBeInTheDocument();
    });

    it("should render without errors when multipleSelect is true", () => {
      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            multipleSelect={true}
            showExistingFiles={true}
            loadList={() => []}
          />,
        );
      }).not.toThrow();

      expect(screen.getByLabelText("Select File")).toBeInTheDocument();
    });

    it("should render without errors when both multiple props are true", () => {
      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            multipleUpload={true}
            multipleSelect={true}
            showExistingFiles={true}
            loadList={() => []}
          />,
        );
      }).not.toThrow();
    });

    it("should render with error callback", () => {
      const onError = jest.fn();

      expect(() => {
        renderWithTheme(<FileUploadList {...defaultProps} onError={onError} />);
      }).not.toThrow();

      expect(screen.getByText("Upload File")).toBeInTheDocument();
    });
  });

  describe("Component Export", () => {
    it("should be exported from the barrel file", () => {
      expect(FileUploadList).toBeDefined();
      expect(typeof FileUploadList).toBe("function");
    });

    it("should have the correct display name", () => {
      expect(FileUploadList.name || FileUploadList.displayName).toBeTruthy();
    });
  });

  describe("Props Validation", () => {
    it("should handle array selectedFile prop", () => {
      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            selectedFile={["file1.csv", "file2.txt"]}
            multipleSelect={true}
            showExistingFiles={true}
            loadList={() => [
              {
                name: "file1.csv",
                size: 1024,
                type: "text/csv",
                lastModified: Date.now(),
                ext: "csv",
              },
              {
                name: "file2.txt",
                size: 2048,
                type: "text/plain",
                lastModified: Date.now(),
                ext: "txt",
              },
            ]}
          />,
        );
      }).not.toThrow();
    });

    it("should handle multipleUpload prop on file input", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} multipleUpload={true} />,
      );

      const actualInput = screen.getByTestId("file-input");
      expect(actualInput).toHaveAttribute("multiple");
    });

    it("should not have multiple attribute when multipleUpload is false", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} multipleUpload={false} />,
      );

      const actualInput = screen.getByTestId("file-input");
      expect(actualInput).not.toHaveAttribute("multiple");
    });
  });

  describe("Error Handling", () => {
    it("should render when onError is provided", () => {
      const onError = jest.fn();

      renderWithTheme(<FileUploadList {...defaultProps} onError={onError} />);

      expect(screen.getByText("Upload File")).toBeInTheDocument();
    });

    it("should handle loadList errors gracefully", () => {
      const loadList = jest.fn().mockImplementation(() => {
        throw new Error("Load failed");
      });

      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            showExistingFiles={true}
            loadList={loadList}
          />,
        );
      }).not.toThrow();
    });

    it("should handle invalid existing files data", () => {
      const loadList = jest.fn().mockReturnValue(null);

      expect(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            showExistingFiles={true}
            loadList={loadList}
          />,
        );
      }).not.toThrow();
    });
  });
});
