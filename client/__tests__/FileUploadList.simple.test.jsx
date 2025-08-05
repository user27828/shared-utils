import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { describe, it, expect, beforeEach } from "vitest";
import "@testing-library/jest-dom";

import FileUploadList from "../src/components/form/FileUploadList.tsx";

const theme = createTheme();

describe("FileUploadList", () => {
  beforeEach(() => {
    render(
      <ThemeProvider theme={theme}>
        <FileUploadList />
      </ThemeProvider>,
    );
  });

  it("renders correctly", () => {
    expect(screen.getByText(/Upload File/i)).toBeInTheDocument();
  });

  it("allows file uploads", () => {
    const file = new File(["dummy content"], "example.png", {
      type: "image/png",
    });
    const input = screen.getByTestId("file-input");
    Object.defineProperty(input, "files", {
      value: [file],
    });
    expect(input.files[0].name).toEqual("example.png");
  });
});
