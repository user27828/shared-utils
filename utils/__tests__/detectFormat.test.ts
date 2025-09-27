import { detectFormatFromText } from "../src/detectFormat";

// Mock process for environment detection
const originalProcess = global.process as NodeJS.Process;

describe("detectFormatFromText", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.process = {
      ...originalProcess,
      versions: {
        node: "18.0.0",
        http_parser: "2.8.0",
        v8: "10.2.154.15-node.8",
        ares: "1.18.1",
        uv: "1.43.0",
        zlib: "1.2.13",
        modules: "108",
        openssl: "3.0.8+quic",
      } as NodeJS.ProcessVersions,
    };
  });

  afterEach(() => {
    global.process = originalProcess;
  });

  it("should detect HTML from content with doctype", async () => {
    const content = "<!DOCTYPE html><html><body>Hello</body></html>";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("html");
    expect(result.mimeType).toBe("text/html");
    expect(result.confidence).toBe(0.95);
    expect(result.reasons).toContain(
      "HTML doctype or opening tag detected in snippet",
    );
  });

  it("should detect HTML snippet without full structure or body", async () => {
    const content =
      '<div class="container"><p id="main">Hello World</p><img src="img.jpg" /></div>';
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("html");
    expect(result.confidence).toBe(0.95);
    expect(result.reasons).toContain(
      "Balanced tags with HTML-specific attributes or self-closing elements (distinguishes from XML)",
    );
  });

  it("should detect Markdown with embedded HTML as MD (prioritizes MD markers)", async () => {
    const content =
      '# Header\n\n<div class="note">Embedded HTML</div>\n\n**Bold text** and [link](url)';
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("md");
    expect(result.confidence).toBe(0.9);
    expect(result.reasons).toContain("Multiple Markdown elements confirmed");
  });

  it("should detect pure HTML snippet as HTML (no MD markers)", async () => {
    const content = "<div><p>Paragraph</p><span>Span</span></div>";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("html");
    expect(result.confidence).toBe(0.95);
  });

  it("should detect valid JSON", async () => {
    const content = '{"key": "value", "array": [1, 2, 3]}';
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("json");
    expect(result.confidence).toBe(1.0);
    expect(result.reasons).toContain("Full content parses as valid JSON");
  });

  it("should fallback invalid JSON to TXT", async () => {
    const content = "{invalid: json syntax}";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("txt");
    expect(result.confidence).toBe(0.1);
  });

  it("should detect XML with declaration and root", async () => {
    const content =
      '<?xml version="1.0"?><root><item attr="value">content</item></root>';
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("xml");
    expect(result.confidence).toBe(0.9);
    expect(result.reasons).toContain(
      "Well-formed XML structure with root element (non-HTML)",
    );
  });

  it("should detect CSV with multiple comma-separated lines", async () => {
    const content =
      "name,age,city\nJohn Doe,30,New York\nJane Smith,25,Los Angeles";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("csv");
    expect(result.confidence).toBe(0.8);
    expect(result.reasons).toContain(
      "Majority of lines contain commas indicating CSV structure",
    );
  });

  it("should detect single-line CSV as TXT (insufficient lines)", async () => {
    const content = "name,age,city";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("txt");
    expect(result.confidence).toBe(0.1);
  });

  it("should detect YAML with multiple key-value pairs and indentation", async () => {
    const content = `key1: value1
key2: 
  nested: true
- list item 1
- list item 2`;
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("yaml");
    expect(result.confidence).toBe(0.85);
    expect(result.reasons).toContain(
      "Multiple structured YAML elements with indentation confirmed",
    );
  });

  it("should detect single colon text as TXT (not YAML)", async () => {
    const content = "Title: Simple description without structure.";
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("txt");
    expect(result.confidence).toBe(0.1);
  });

  it("should detect LaTeX document with commands and environments", async () => {
    const content = `\\documentclass{article}
\\begin{document}
\\section{Title}
Hello \\textbf{bold} world.
\\end{document}`;
    const result = await detectFormatFromText({ content });
    expect(result.format).toBe("tex");
    expect(result.confidence).toBe(0.95);
    expect(result.reasons).toContain(
      "Multiple LaTeX commands and environments found",
    );
  });

  it("should read from filePath in Node.js environment", async () => {
    const mockContent = "<!DOCTYPE html><html><body>Test content</body></html>";

    // Create a temporary file for testing
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");
    const tmpDir = os.tmpdir();
    const filePath = path.join(tmpDir, "test-file.html");

    // Write test content to file
    fs.writeFileSync(filePath, mockContent);

    try {
      const result = await detectFormatFromText({ filePath });
      expect(result.format).toBe("html");
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  it("should throw error for filePath in non-Node environment", async () => {
    (global.process as any) = { ...originalProcess, versions: {} };
    await expect(
      detectFormatFromText({ filePath: "/test/file.txt" }),
    ).rejects.toThrow(
      "Reading from filePath is only supported in Node.js environments.",
    );
  });

  it("should throw error if neither content nor filePath is provided", async () => {
    await expect(
      detectFormatFromText({
        // Actually pass undefined, not empty strings
      }),
    ).rejects.toThrow("Either `content` or `filePath` is required");
  });

  it("should respect custom formats list and detect within it", async () => {
    const content = '{"key": "value"}';
    const result = await detectFormatFromText({
      content,
      formats: ["json", "txt", "csv"],
    });
    expect(result.format).toBe("json");
  });

  it("should fallback to TXT if custom format is unknown or fails", async () => {
    const content = "Plain text";
    const result = await detectFormatFromText({
      content,
      formats: ["unknown", "txt"],
    });
    expect(result.format).toBe("txt");
  });

  it("should handle empty content as TXT", async () => {
    const result = await detectFormatFromText({ content: "" });
    expect(result.format).toBe("txt");
    expect(result.confidence).toBe(0.1);
  });

  it("should skip formats with missing check files gracefully", async () => {
    const content = "Some content";
    const result = await detectFormatFromText({
      content,
      formats: ["md", "missing", "json"],
    });
    // Assuming 'missing' fails to load, should still detect based on available
    expect(result.format).toBe("txt"); // No strong markers, falls back
  });
});
