import { describe, expect, it } from "vitest";

import {
  formatMarkdownImage,
  formatMarkdownLink,
} from "../src/components/wysiwyg/markdown.js";

describe("wysiwyg markdown helpers", () => {
  it("formats a markdown link", () => {
    expect(
      formatMarkdownLink({ url: "https://example.com", label: "Example" }),
    ).toBe("[Example](https://example.com)");
  });

  it("formats a markdown image", () => {
    expect(
      formatMarkdownImage({ url: "https://example.com/a.png", alt: "Alt" }),
    ).toBe("![Alt](https://example.com/a.png)");
  });

  it("escapes link labels conservatively", () => {
    expect(
      formatMarkdownLink({ url: "https://example.com", label: "A [B]" }),
    ).toBe("[A \\[B\\]](https://example.com)");
  });
});
