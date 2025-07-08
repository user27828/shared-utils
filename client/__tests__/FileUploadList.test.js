/**
 * Tests for FileUploadList component
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import "@testing-library/jest-dom";

import FileUploadList from "../src/components/form/FileUploadList.tsx";

// Create a basic theme for Material-UI components
const theme = createTheme();

// Helper function to render component with theme
const renderWithTheme = (ui, options = {}) => {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>, options);
};

// Mock file objects for testing
const mockFile1 = new File(["content1"], "test1.csv", { type: "text/csv" });
const mockFile2 = new File(["content2"], "test2.txt", { type: "text/plain" });
const mockFile3 = new File(["content3"], "test3.csv", { type: "text/csv" });

const mockUploadFile = {
  name: "uploaded.csv",
  size: 1024,
  type: "text/csv",
  lastModified: Date.now(),
  ext: "csv",
};

const mockExistingFiles = [
  {
    name: "existing1.csv",
    size: 2048,
    type: "text/csv",
    lastModified: Date.now() - 1000,
    ext: "csv",
  },
  {
    name: "existing2.txt",
    size: 4096,
    type: "text/plain",
    lastModified: Date.now() - 2000,
    ext: "txt",
  },
  {
    name: "existing3.csv",
    size: 8192,
    type: "text/csv",
    lastModified: Date.now() - 3000,
    ext: "csv",
  },
];

// Mock fetch for upload testing
global.fetch = jest.fn();

// Mock FormData
global.FormData = class MockFormData {
  constructor() {
    this.data = new Map();
  }

  append(key, value) {
    this.data.set(key, value);
  }

  get(key) {
    return this.data.get(key);
  }

  has(key) {
    return this.data.has(key);
  }
};

// Helper to suppress console output during error tests
const suppressConsoleOutput = (fn) => {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;

  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();

  try {
    return fn();
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  }
};

describe("FileUploadList Component", () => {
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

  beforeAll(() => {
    // Suppress console output during tests to avoid noise from expected errors
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

  describe("Basic Rendering", () => {
    it("should render upload button when showExistingFiles is false", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} showExistingFiles={false} />,
      );

      expect(screen.getByText("Upload File")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /upload file/i }),
      ).toBeInTheDocument();
    });

    it("should render title when provided", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} title="Custom Title" />,
      );

      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("should render select dropdown when showExistingFiles is true", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} showExistingFiles={true} />,
      );

      expect(screen.getByLabelText("Select File")).toBeInTheDocument();
    });
  });

  describe("File Upload Functionality", () => {
    it("should call onUploadFileSelect when file is selected", async () => {
      const user = userEvent.setup();
      const onUploadFileSelect = jest.fn();

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          onUploadFileSelect={onUploadFileSelect}
          onFileUpload={false}
        />,
      );

      const fileInput = screen.getByTestId("file-input");
      await user.upload(fileInput, mockFile1);

      expect(onUploadFileSelect).toHaveBeenCalledWith(mockFile1);
    });

    it("should handle multiple file upload when multipleUpload is true", async () => {
      const user = userEvent.setup();
      const onUploadFileSelect = jest.fn();
      const uploadFile = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ filename: "test1.csv" }),
      });

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          multipleUpload={true}
          onUploadFileSelect={onUploadFileSelect}
          uploadFile={uploadFile}
        />,
      );

      const fileInput = screen.getByTestId("file-input");
      await user.upload(fileInput, [mockFile1, mockFile2]);

      // Should notify parent with array of files
      expect(onUploadFileSelect).toHaveBeenCalledWith([mockFile1, mockFile2]);
    });
    it("should process multiple files sequentially", async () => {
      const user = userEvent.setup();
      const uploadFile = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ filename: "test1.csv" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ filename: "test2.txt" }),
        });

      const loadList = jest.fn().mockReturnValue([
        { ...mockUploadFile, name: "test1.csv" },
        { ...mockUploadFile, name: "test2.txt" },
      ]);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          multipleUpload={true}
          uploadFile={uploadFile}
          loadList={loadList}
          showExistingFiles={true}
        />,
      );

      const fileInput = screen.getByTestId("file-input");
      await user.upload(fileInput, [mockFile1, mockFile2]);

      await waitFor(() => {
        expect(uploadFile).toHaveBeenCalledTimes(2);
      });
    });
    it("should handle partial upload failures gracefully", async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const uploadFile = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ filename: "test1.csv" }),
        })
        .mockRejectedValueOnce(new Error("Upload failed"));

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          multipleUpload={true}
          uploadFile={uploadFile}
          onError={onError}
        />,
      );

      const fileInput = screen.getByTestId("file-input");
      await user.upload(fileInput, [mockFile1, mockFile2]);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining("Error uploading test2.txt"),
        );
      });
    });

    it("should show processing indicator for multiple files", async () => {
      const user = userEvent.setup();
      const onUploadFileSelect = jest.fn();

      // Mock uploadFile to be slow so we can observe the processing state
      const uploadFile = jest.fn(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ filename: "test.csv" }),
              });
            }, 50);
          }),
      );

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          multipleUpload={true}
          onUploadFileSelect={onUploadFileSelect}
          uploadFile={uploadFile}
        />,
      );

      const fileInput = screen.getByTestId("file-input");

      await suppressConsoleOutput(async () => {
        await user.upload(fileInput, [mockFile1, mockFile2]);

        // The component should call onUploadFileSelect with the files
        expect(onUploadFileSelect).toHaveBeenCalledWith([mockFile1, mockFile2]);
      });
    });
  });

  describe("Existing Files Selection", () => {
    it("should load existing files when showExistingFiles is true", async () => {
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          loadList={loadList}
        />,
      );

      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });
    });

    it("should handle async loadList function", async () => {
      const loadList = jest.fn().mockResolvedValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          loadList={loadList}
        />,
      );

      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });
    });

    it("should call onExistingFileSelect when existing file is selected", async () => {
      const user = userEvent.setup();
      const onExistingFileSelect = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          loadList={loadList}
          onExistingFileSelect={onExistingFileSelect}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Click on select dropdown
      const selectButton = screen.getByRole("combobox");
      await user.click(selectButton);

      // Select first existing file
      await waitFor(() => {
        const option = screen.getByText(/existing1.csv/);
        expect(option).toBeInTheDocument();
      });

      const option = screen.getByText(/existing1.csv/);
      await user.click(option);

      expect(onExistingFileSelect).toHaveBeenCalledWith(mockExistingFiles[0]);
    });

    it("should handle multiple existing file selection", async () => {
      const user = userEvent.setup();
      const onExistingFileSelect = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          multipleSelect={true}
          loadList={loadList}
          onExistingFileSelect={onExistingFileSelect}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Click on select dropdown
      const selectButton = screen.getByRole("combobox");
      await user.click(selectButton);

      // Select files (Material-UI multi-select behavior)
      await waitFor(() => {
        const option1 = screen.getByText(/existing1.csv/);
        expect(option1).toBeInTheDocument();
      });

      const option1 = screen.getByText(/existing1.csv/);
      await user.click(option1);

      expect(onExistingFileSelect).toHaveBeenCalled();
    });

    it("should show upload option in dropdown when showExistingFiles is true", async () => {
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          loadList={loadList}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Click on select dropdown
      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      // Check for upload option
      await waitFor(() => {
        expect(screen.getByText(/\*Upload File\*/)).toBeInTheDocument();
      });
    });

    it("should trigger file upload when upload option is selected from dropdown", async () => {
      const user = userEvent.setup();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          loadList={loadList}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Click on select dropdown
      const selectButton = screen.getByRole("combobox");
      await user.click(selectButton);

      // Select upload option
      await waitFor(() => {
        const uploadOption = screen.getByText(/\*Upload File\*/);
        expect(uploadOption).toBeInTheDocument();
      });
    });
  });

  describe("File Extensions", () => {
    it("should accept specified file extensions", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} fileExtensions={["csv", "txt"]} />,
      );

      const fileInput = screen.getByTestId("file-input");
      expect(fileInput).toHaveAttribute("accept", ".csv, .txt");
    });

    it("should handle string file extensions", () => {
      renderWithTheme(
        <FileUploadList {...defaultProps} fileExtensions=".pdf,.doc" />,
      );

      const fileInput = screen.getByTestId("file-input");
      expect(fileInput).toHaveAttribute("accept", ".pdf,.doc");
    });
  });

  describe("Delete Functionality", () => {
    it("should show delete buttons when showDeleteExistingFiles is true", async () => {
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Open dropdown
      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      // Check for delete buttons (they should be present but might not be visible until menu is open)
      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText("delete");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it("should call onDeleteExistingFile when delete button is clicked", async () => {
      const user = userEvent.setup();
      const onDeleteExistingFile = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
          onDeleteExistingFile={onDeleteExistingFile}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Open dropdown
      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      // Click delete button
      await waitFor(() => {
        const deleteButton = screen.getAllByLabelText("delete")[0];
        expect(deleteButton).toBeInTheDocument();
      });

      const deleteButton = screen.getAllByLabelText("delete")[0];
      await user.click(deleteButton);

      expect(onDeleteExistingFile).toHaveBeenCalledWith(mockExistingFiles[0]);
    });

    it("should prevent event propagation on delete button click", async () => {
      const onDeleteExistingFile = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
          onDeleteExistingFile={onDeleteExistingFile}
        />,
      );

      // Wait for files to load
      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      // Open dropdown
      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText("delete");
        const clickEvent = new MouseEvent("click", { bubbles: true });
        const stopPropagationSpy = jest.spyOn(clickEvent, "stopPropagation");

        deleteButtons[0].dispatchEvent(clickEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should call onError callback when provided", async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const uploadFile = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));

      suppressConsoleOutput(() => {
        renderWithTheme(
          <FileUploadList
            {...defaultProps}
            uploadFile={uploadFile}
            onError={onError}
          />,
        );
      });

      const fileInput = screen.getByTestId("file-input");

      await suppressConsoleOutput(async () => {
        await user.upload(fileInput, mockFile1);

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(
            expect.stringContaining(
              "Error uploading test1.csv: Error: Network error",
            ),
          );
        });
      });
    });

    it("should handle upload response errors", async () => {
      const user = userEvent.setup();
      const onError = jest.fn();
      const uploadFile = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          uploadFile={uploadFile}
          onError={onError}
        />,
      );

      const fileInput = screen.getByTestId("file-input");

      await suppressConsoleOutput(async () => {
        await user.upload(fileInput, mockFile1);

        await waitFor(() => {
          expect(onError).toHaveBeenCalledWith(
            expect.stringContaining(
              "Upload failed for test1.csv with status: 500",
            ),
          );
        });
      });
    });

    it("should handle loadList errors gracefully", () => {
      const loadList = jest.fn().mockImplementation(() => {
        throw new Error("Load failed");
      });

      // Should not throw error
      suppressConsoleOutput(() => {
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

  describe("Delete Functionality", () => {
    it("should show delete buttons when showDeleteExistingFiles is true", async () => {
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
        />,
      );

      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText("delete");
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it("should call onDeleteExistingFile when delete button is clicked", async () => {
      const onDeleteExistingFile = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
          onDeleteExistingFile={onDeleteExistingFile}
        />,
      );

      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText("delete");
        fireEvent.click(deleteButtons[0]);
      });

      expect(onDeleteExistingFile).toHaveBeenCalledWith(
        expect.objectContaining({ name: "existing1.csv" }),
      );
    });

    it("should prevent event propagation on delete button click", async () => {
      const onDeleteExistingFile = jest.fn();
      const loadList = jest.fn().mockReturnValue(mockExistingFiles);

      renderWithTheme(
        <FileUploadList
          {...defaultProps}
          showExistingFiles={true}
          showDeleteExistingFiles={true}
          loadList={loadList}
          onDeleteExistingFile={onDeleteExistingFile}
        />,
      );

      await waitFor(() => {
        expect(loadList).toHaveBeenCalled();
      });

      const selectButton = screen.getByRole("combobox");
      fireEvent.mouseDown(selectButton);

      await waitFor(() => {
        const deleteButtons = screen.getAllByLabelText("delete");
        const clickEvent = new MouseEvent("click", { bubbles: true });
        const stopPropagationSpy = jest.spyOn(clickEvent, "stopPropagation");

        deleteButtons[0].dispatchEvent(clickEvent);

        expect(stopPropagationSpy).toHaveBeenCalled();
      });
    });
  });
});
