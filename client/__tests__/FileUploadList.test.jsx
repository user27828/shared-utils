import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom";

import FileUploadList from "../src/components/form/FileUploadList.tsx";

describe("FileUploadList", () => {
  const theme = createTheme();
  const mockOnChange = vi.fn();
  const files = [
    new File(["file-content"], "example1.txt", { type: "text/plain" }),
    new File(["file-content"], "example2.txt", { type: "text/plain" }),
  ];

  beforeEach(() => {
    render(
      <ThemeProvider theme={theme}>
        <FileUploadList label="Upload File" onUploadFileSelect={mockOnChange} />
      </ThemeProvider>,
    );
    mockOnChange.mockClear();
  });

  it("renders the component with the correct label", () => {
    expect(screen.getByText(/Upload File/i)).toBeInTheDocument();
  });

  it("allows users to upload files", async () => {
    const input = screen.getByTestId("file-input");
    await userEvent.upload(input, files);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled();
    });
  });
});
