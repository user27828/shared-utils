import { describe, expect, it, vi } from "vitest";

import {
  hasEmbeddedBase64Image,
  normalizeEmbeddedHtmlImages,
} from "../src/cms/ui/normalizeEmbeddedHtmlImages.js";

describe("normalizeEmbeddedHtmlImages", () => {
  it("replaces embedded base64 image src with uploaded URL", async () => {
    const uploadImage = vi.fn<
      (file: File, context?: { source: string }) => Promise<string>
    >(async () => {
      return "https://cdn.example.com/cms-b64/a.png";
    });

    const html =
      '<p>Hello <img src="data:image/png;base64,dGVzdA==" alt="x" /></p>';

    const normalized = await normalizeEmbeddedHtmlImages({
      html,
      uploadImage,
    });

    expect(normalized).toContain("https://cdn.example.com/cms-b64/a.png");
    expect(normalized).not.toContain("data:image/png;base64");
    expect(uploadImage).toHaveBeenCalledTimes(1);

    const firstCall = uploadImage.mock.calls[0];
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("Expected uploadImage to be called");
    }

    if (firstCall.length < 2) {
      throw new Error("Expected uploadImage to receive file and context");
    }

    const fileArg = firstCall[0];
    const contextArg = firstCall[1];

    if (!(fileArg instanceof File)) {
      throw new Error("Expected first uploadImage arg to be a File");
    }

    if (!contextArg || typeof contextArg !== "object") {
      throw new Error("Expected second uploadImage arg to be context object");
    }

    const file = fileArg;
    const context = contextArg as { source?: string };
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe("image/png");
    expect(file.name).toMatch(/^pasted-image-\d+\.png$/);
    expect(context).toEqual({ source: "pasted-data-uri" });
  });

  it("uploads each unique data-uri only once", async () => {
    const uploadImage = vi.fn<
      (file: File, context?: { source: string }) => Promise<string>
    >(async () => {
      return "https://cdn.example.com/cms-b64/shared.png";
    });

    const sharedDataUri = "data:image/png;base64,dGVzdA==";
    const html = `<p><img src="${sharedDataUri}" /><img src="${sharedDataUri}" /></p>`;

    const normalized = await normalizeEmbeddedHtmlImages({
      html,
      uploadImage,
    });

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(normalized).toContain("https://cdn.example.com/cms-b64/shared.png");
    expect(normalized.match(/cms-b64\/shared\.png/g)?.length).toBe(2);
  });

  it("leaves data-uri in place when upload fails", async () => {
    const uploadImage = vi.fn<
      (file: File, context?: { source: string }) => Promise<string | null>
    >(async () => {
      return null;
    });

    const html = '<p><img src="data:image/png;base64,dGVzdA==" /></p>';
    const normalized = await normalizeEmbeddedHtmlImages({
      html,
      uploadImage,
    });

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(normalized).toContain("data:image/png;base64,dGVzdA==");
  });

  it("skips oversized data-uri payloads", async () => {
    const uploadImage = vi.fn<
      (file: File, context?: { source: string }) => Promise<string>
    >(async () => {
      return "https://cdn.example.com/cms-b64/too-large.png";
    });

    const html = '<p><img src="data:image/png;base64,dGVzdA==" /></p>';
    const normalized = await normalizeEmbeddedHtmlImages({
      html,
      uploadImage,
      maxImageBytes: 1,
    });

    expect(uploadImage).not.toHaveBeenCalled();
    expect(normalized).toContain("data:image/png;base64,dGVzdA==");
  });

  it("detects embedded base64 images", () => {
    expect(
      hasEmbeddedBase64Image(
        '<p><img src="data:image/png;base64,dGVzdA==" alt="a" /></p>',
      ),
    ).toBe(true);
    expect(
      hasEmbeddedBase64Image('<p><img src="https://example.com/a.png" /></p>'),
    ).toBe(false);
    expect(hasEmbeddedBase64Image("")).toBe(false);
  });

  it("preserves binary fidelity for bytes > 0x7F", async () => {
    // 4 bytes: 0x89 0x50 0x4E 0x47 (PNG magic number — all above/below 0x7F)
    // btoa(String.fromCharCode(0x89, 0x50, 0x4E, 0x47)) === "iVBORw=="
    const b64 = "iVBORw==";
    let capturedFile: File | undefined;

    const uploadImage = vi.fn<
      (file: File, context?: { source: string }) => Promise<string>
    >(async (file) => {
      capturedFile = file;
      return "https://cdn.example.com/binary-test.png";
    });

    const html = `<p><img src="data:image/png;base64,${b64}" /></p>`;
    await normalizeEmbeddedHtmlImages({ html, uploadImage });

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(capturedFile).toBeInstanceOf(File);

    const buf = await capturedFile!.arrayBuffer();
    const bytes = new Uint8Array(buf);
    expect(bytes).toEqual(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
  });
});
