import {
  renderMarkdownToSanitizedHtml,
  sanitizeCmsHtml,
} from "../src/cms/sanitization.js";

describe("CMS sanitization", () => {
  it("renders markdown and strips unsafe link URLs", async () => {
    const html = await renderMarkdownToSanitizedHtml(
      "# Hello\n\n[bad](javascript:alert(1))\n\n**Bold**",
    );

    expect(html).toContain("<h1>Hello</h1>");
    expect(html).toContain("<strong>Bold</strong>");
    expect(html).not.toContain("javascript:alert(1)");
  });

  it("sanitizes unsafe image sources while preserving safe relative URLs", () => {
    const html = sanitizeCmsHtml(
      '<img src="javascript:alert(1)" alt="bad" /><img src="/safe.png" alt="safe" />',
    );

    expect(html).not.toContain("javascript:alert(1)");
    expect(html).toContain('src="/safe.png"');
  });
});
