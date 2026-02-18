import { describe, expect, it } from "vitest";

import { stripLocalFileImages } from "../src/cms/ui/CmsBodyEditor.js";

const PLACEHOLDER =
  "[!! Pasted Image Unavailable - Replace or delete this notice !!]";

describe("stripLocalFileImages", () => {
  it("replaces file:/// img with placeholder text (Windows Word paste)", () => {
    const html =
      '<p>Hello <img src="file:///C:/Users/y0mamma/AppData/Local/Temp/msohtmlclip1/01/clip_image002.jpg" alt="img" /> world</p>';
    const result = stripLocalFileImages(html);
    expect(result).not.toContain("<img");
    expect(result).toContain(PLACEHOLDER);
    expect(result).toContain("Hello");
    expect(result).toContain("world");
  });

  it("replaces file:\\ UNC img with placeholder text", () => {
    const html = '<p><img src="file:\\\\server\\share\\image.png" /></p>';
    const result = stripLocalFileImages(html);
    expect(result).not.toContain("<img");
    expect(result).toContain(PLACEHOLDER);
  });

  it("preserves img tags with https:// src", () => {
    const html =
      '<p><img src="https://cdn.example.com/photo.jpg" alt="photo" /></p>';
    const result = stripLocalFileImages(html);
    expect(result).toBe(html);
  });

  it("preserves img tags with data: src (base64 paste)", () => {
    const html = '<p><img src="data:image/png;base64,dGVzdA==" /></p>';
    const result = stripLocalFileImages(html);
    expect(result).toBe(html);
  });

  it("preserves img tags with relative src", () => {
    const html = '<p><img src="/images/logo.png" /></p>';
    const result = stripLocalFileImages(html);
    expect(result).toBe(html);
  });

  it("replaces only local-file images, preserving adjacent safe images", () => {
    const html =
      "<p>" +
      '<img src="https://cdn.example.com/a.jpg" />' +
      '<img src="file:///C:/tmp/clip.jpg" />' +
      '<img src="data:image/png;base64,dGVzdA==" />' +
      "</p>";
    const result = stripLocalFileImages(html);
    expect(result).toContain("cdn.example.com/a.jpg");
    expect(result).not.toContain("file:///");
    expect(result).toContain("data:image/png;base64,dGVzdA==");
    expect(result).toContain(PLACEHOLDER);
    // Should have exactly 2 remaining img tags
    expect((result.match(/<img/g) || []).length).toBe(2);
  });

  it("returns unchanged html when no local-file images present (fast path)", () => {
    const html = "<p>No images here</p>";
    const result = stripLocalFileImages(html);
    expect(result).toBe(html);
  });

  it("handles case-insensitive FILE:/// src", () => {
    const html = '<p><img src="FILE:///C:/image.jpg" /></p>';
    const result = stripLocalFileImages(html);
    expect(result).not.toContain("<img");
    expect(result).toContain(PLACEHOLDER);
  });
});
