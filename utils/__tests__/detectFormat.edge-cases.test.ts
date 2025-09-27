import { detectFormatFromText } from "../src/detectFormat";

describe("detectFormatFromText - Edge Cases", () => {
  describe("HTML vs XML distinction", () => {
    it("should detect SVG as XML, not HTML", async () => {
      const content = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <circle cx="50" cy="50" r="40" fill="red" />
      </svg>`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("xml");
    });

    it("should detect RSS/ATOM as XML", async () => {
      const content = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <description>A test RSS feed</description>
        </channel>
      </rss>`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("xml");
    });

    it("should detect malformed HTML/XML as TXT", async () => {
      const content = "<div><p>Unclosed paragraph<span>Nested</div>";
      const result = await detectFormatFromText({ content });
      // Should fallback to TXT due to poor balance
      expect(result.format).toBe("txt");
    });
  });

  describe("JSON edge cases", () => {
    it("should detect JSON array as JSON", async () => {
      const content = `[
        {"name": "John", "age": 30},
        {"name": "Jane", "age": 25}
      ]`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("json");
    });

    it("should detect simple JSON values", async () => {
      const content = `"simple string"`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("json");
    });

    it("should reject JavaScript object literal as TXT", async () => {
      const content = `{
        name: "John",
        age: 30,
        active: true
      }`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt"); // Invalid JSON due to unquoted keys
    });
  });

  describe("CSV edge cases", () => {
    it("should detect tab-separated values as TXT (not CSV)", async () => {
      const content = `name\tage\tcity
John Doe\t30\tNew York
Jane Smith\t25\tLos Angeles`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt"); // No commas
    });

    it("should detect CSV with quoted fields containing commas", async () => {
      const content = `name,description,price
"Smith, John","Software Engineer, Senior",75000
"Doe, Jane","Product Manager, Lead",85000`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("csv");
    });

    it("should reject single line with commas as TXT", async () => {
      const content = "This is a sentence, with commas, but not CSV";
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt");
    });
  });

  describe("YAML edge cases", () => {
    it("should detect YAML document with front matter", async () => {
      const content = `---
title: My Document
author: John Doe
date: 2024-01-01
---
# Content here`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("yaml");
    });

    it("should detect complex YAML structures", async () => {
      const content = `
database:
  host: localhost
  port: 5432
  credentials:
    username: admin
    password: secret
services:
  - name: web
    port: 8080
  - name: api
    port: 3000`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("yaml");
    });

    it("should reject URL with colon as TXT", async () => {
      const content = "Visit our website at https://example.com:8080/path";
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt");
    });
  });

  describe("Markdown edge cases", () => {
    it("should detect Markdown with HTML comments", async () => {
      const content = `# Title
<!-- HTML comment -->
This is **bold** text with a [link](https://example.com).

## Subtitle
Some more content here.`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("md");
    });

    it("should detect Markdown tables", async () => {
      const content = `| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| More     | Data     | Here     |`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("md");
    });

    it("should detect code blocks with language", async () => {
      const content = `# Example
\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`

Some explanation text.`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("md");
    });
  });

  describe("LaTeX edge cases", () => {
    it("should detect minimal LaTeX document", async () => {
      const content = `\\documentclass{article}
\\begin{document}
Hello World!
\\end{document}`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("tex");
    });

    it("should detect LaTeX with math equations", async () => {
      const content = `\\documentclass{article}
\\usepackage{amsmath}
\\begin{document}
The quadratic formula is: \\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]
\\end{document}`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("tex");
    });

    it("should reject text with occasional backslashes as TXT", async () => {
      const content =
        "File path: C:\\Users\\John\\Documents\\file.txt and some\\other\\path";
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt");
    });
  });

  describe("Format priority conflicts", () => {
    it("should prioritize Markdown over HTML when both are present", async () => {
      const content = `# Markdown Title

<div class="content">
This **paragraph** has both [Markdown](link) and HTML.
</div>

## Another Section
More text here.`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("md"); // Should win due to multiple MD markers
    });

    it("should prioritize JSON over other formats when valid", async () => {
      const content = `{
  "title": "Document with: colons",
  "content": "<p>HTML-like content</p>",
  "tags": ["json", "test"],
  "active": true
}`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("json"); // Highest confidence
    });

    it("should handle mixed content gracefully", async () => {
      const content = `This is plain text with some, commas
And a few: key value pairs
But not enough structure for any specific format.`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("txt");
      expect(result.confidence).toBe(0.1); // Low confidence fallback
    });
  });

  describe("Whitespace and encoding handling", () => {
    it("should handle content with leading/trailing whitespace", async () => {
      const content = `    

      {"key": "value", "number": 42}
      
      `;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("json");
    });

    it("should handle different line endings", async () => {
      const content = "name,age,city\r\nJohn,30,NYC\r\nJane,25,LA\r\n";
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("csv");
    });

    it("should handle Unicode content", async () => {
      const content = `{
  "name": "José María",
  "city": "São Paulo",
  "emoji": "🚀",
  "chinese": "你好"
}`;
      const result = await detectFormatFromText({ content });
      expect(result.format).toBe("json");
    });
  });
});
