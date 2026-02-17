/**
 * Unit tests for FM Link Tracker — extractFmFileUids, reconcileFmLinks,
 * createCmsFmLinkTracker
 */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  extractFmFileUids,
  reconcileFmLinks,
  createCmsFmLinkTracker,
} from "../../src/fm/linkTracker.js";

// ── extractFmFileUids ─────────────────────────────────────────────────────

describe("extractFmFileUids", () => {
  it("returns empty array for empty/null input", () => {
    expect(extractFmFileUids("")).toEqual([]);
    expect(extractFmFileUids(null as any)).toEqual([]);
    expect(extractFmFileUids(undefined as any)).toEqual([]);
  });

  it("returns empty array for content with no FM URLs", () => {
    const html = `<p>Hello world</p><img src="https://example.com/photo.jpg">`;
    expect(extractFmFileUids(html)).toEqual([]);
  });

  it("extracts UID from admin router pattern: /files/<uid>/content", () => {
    const uid = "9TTgttx8P2v1JeOGLLgu6";
    const html = `<img src="/api/fm/files/${uid}/content">`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("extracts UID from admin router with query params", () => {
    const uid = "AbCdEfGhIjKlMnOpQrStU";
    const html = `<img src="/api/fm/files/${uid}/content?variantKind=thumb&download=1">`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("extracts UID from standalone content/media router", () => {
    const uid = "Xy12_z-AbCd34EfGhIjKl";
    const html = `<img src="/fm/${uid}">`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("extracts UID from standalone router with query params", () => {
    const uid = "1234567890_ABCDEFGHIJK";
    const html = `<img src="/media/${uid}?v=thumb">`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("extracts multiple unique UIDs", () => {
    const uid1 = "AAAAAAAAAABBBBBBBBBB1";
    const uid2 = "CCCCCCCCCCDDDDDDDDDD2";
    const uid3 = "EEEEEEEEEEFFFFFFFFFFG";
    const html = `
      <p>Text <img src="/api/fm/files/${uid1}/content"> more text</p>
      <img src="/api/fm/files/${uid2}/content?v=thumb">
      <p><img src="/fm/${uid3}"></p>
    `;
    const result = extractFmFileUids(html);
    expect(result).toHaveLength(3);
    expect(new Set(result)).toEqual(new Set([uid1, uid2, uid3]));
  });

  it("deduplicates repeated UIDs", () => {
    const uid = "9TTgttx8P2v1JeOGLLgu6";
    const html = `
      <img src="/api/fm/files/${uid}/content">
      <img src="/api/fm/files/${uid}/content?v=thumb">
    `;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("handles href attributes (e.g., download links)", () => {
    const uid = "DownloadLinkTestUID_01";
    const html = `<a href="/api/fm/files/${uid}/content?download=1">Download</a>`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("works with Markdown image syntax in HTML", () => {
    // Markdown with inline HTML
    const uid = "MarkdownImgTestUID_234";
    const html = `Some text\n\n<img src="/api/fm/files/${uid}/content">\n\nMore text`;
    expect(extractFmFileUids(html)).toEqual([uid]);
  });

  it("does not match short strings (< 10 chars)", () => {
    const html = `<img src="/api/fm/files/short/content">`;
    expect(extractFmFileUids(html)).toEqual([]);
  });

  it("does not match very long strings (> 30 chars)", () => {
    const longUid = "A".repeat(31);
    const html = `<img src="/api/fm/files/${longUid}/content">`;
    expect(extractFmFileUids(html)).toEqual([]);
  });
});

// ── reconcileFmLinks ──────────────────────────────────────────────────────

describe("reconcileFmLinks", () => {
  const createMockFmService = () => ({
    listLinksForEntity: jest.fn<any>(),
    createLink: jest.fn<any>(),
    deleteLink: jest.fn<any>(),
    deleteLinksForEntity: jest.fn<any>(),
  });

  it("creates links for new file UIDs when none exist", async () => {
    const svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([]);
    svc.createLink.mockResolvedValue({} as any);

    const result = await reconcileFmLinks(
      svc as any,
      "cms",
      "post-123",
      ["file-A", "file-B"],
      "body",
      "user-1",
    );

    expect(svc.createLink).toHaveBeenCalledTimes(2);
    expect(svc.createLink).toHaveBeenCalledWith({
      file_uid: "file-A",
      linked_entity_type: "cms",
      linked_entity_uid: "post-123",
      linked_field: "body",
      created_by: "user-1",
    });
    expect(result.created).toEqual(["file-A", "file-B"]);
    expect(result.removed).toEqual([]);
  });

  it("removes links for files no longer referenced", async () => {
    const svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([
      {
        id: 1,
        file_uid: "old-file",
        linked_entity_type: "cms",
        linked_entity_uid: "post-123",
        linked_field: "body",
      },
    ]);
    svc.deleteLink.mockResolvedValue(undefined);

    const result = await reconcileFmLinks(
      svc as any,
      "cms",
      "post-123",
      [], // no files referenced now
      "body",
    );

    expect(svc.deleteLink).toHaveBeenCalledWith({
      fileUid: "old-file",
      linkedEntityType: "cms",
      linkedEntityUid: "post-123",
    });
    expect(result.created).toEqual([]);
    expect(result.removed).toEqual(["old-file"]);
  });

  it("leaves existing valid links untouched", async () => {
    const svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([
      {
        id: 1,
        file_uid: "file-A",
        linked_entity_type: "cms",
        linked_entity_uid: "post-123",
        linked_field: "body",
      },
    ]);

    const result = await reconcileFmLinks(
      svc as any,
      "cms",
      "post-123",
      ["file-A"], // same file still referenced
      "body",
    );

    expect(svc.createLink).not.toHaveBeenCalled();
    expect(svc.deleteLink).not.toHaveBeenCalled();
    expect(result.created).toEqual([]);
    expect(result.removed).toEqual([]);
  });

  it("handles mixed create/remove in one reconciliation", async () => {
    const svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([
      {
        id: 1,
        file_uid: "keep-me",
        linked_entity_type: "cms",
        linked_entity_uid: "p1",
        linked_field: "body",
      },
      {
        id: 2,
        file_uid: "remove-me",
        linked_entity_type: "cms",
        linked_entity_uid: "p1",
        linked_field: "body",
      },
    ]);
    svc.createLink.mockResolvedValue({} as any);
    svc.deleteLink.mockResolvedValue(undefined);

    const result = await reconcileFmLinks(
      svc as any,
      "cms",
      "p1",
      ["keep-me", "new-file"],
      "body",
    );

    expect(svc.createLink).toHaveBeenCalledTimes(1);
    expect(svc.deleteLink).toHaveBeenCalledTimes(1);
    expect(result.created).toEqual(["new-file"]);
    expect(result.removed).toEqual(["remove-me"]);
  });

  it("swallows createLink errors (best-effort)", async () => {
    const svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([]);
    svc.createLink.mockRejectedValue(new Error("File not found"));

    const result = await reconcileFmLinks(svc as any, "cms", "p1", [
      "deleted-file",
    ]);

    // Should not throw, and should not be in created list
    expect(result.created).toEqual([]);
  });
});

// ── createCmsFmLinkTracker ───────────────────────────────────────────────

describe("createCmsFmLinkTracker", () => {
  const createMockFmService = () => ({
    listLinksForEntity: jest.fn<any>(),
    createLink: jest.fn<any>(),
    deleteLink: jest.fn<any>(),
    deleteLinksForEntity: jest.fn<any>(),
  });

  let svc: ReturnType<typeof createMockFmService>;

  beforeEach(() => {
    svc = createMockFmService();
    svc.listLinksForEntity.mockResolvedValue([]);
    svc.createLink.mockResolvedValue({} as any);
  });

  it("scans and reconciles on create event", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });
    const uid = "9TTgttx8P2v1JeOGLLgu6";

    await tracker.onAfterWrite({
      type: "create",
      uid: "post-1",
      row: {
        content: `<p><img src="/api/fm/files/${uid}/content"></p>`,
        content_type: "text/html",
      },
      actorUserUid: "user-1",
    });

    expect(svc.createLink).toHaveBeenCalledWith(
      expect.objectContaining({
        file_uid: uid,
        linked_entity_type: "cms",
        linked_entity_uid: "post-1",
        linked_field: "body",
        created_by: "user-1",
      }),
    );
  });

  it("scans and reconciles on update event", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });
    const uid = "UpdateTestUID_1234567";

    await tracker.onAfterWrite({
      type: "update",
      uid: "post-2",
      row: {
        content: `<img src="/api/fm/files/${uid}/content">`,
        content_type: "text/html",
      },
    });

    expect(svc.createLink).toHaveBeenCalledTimes(1);
  });

  it("scans and reconciles on publish event", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });
    const uid = "PublishTestUID_123456";

    await tracker.onAfterWrite({
      type: "publish",
      uid: "post-3",
      row: {
        content: `<img src="/api/fm/files/${uid}/content">`,
        content_type: "text/html",
      },
    });

    expect(svc.createLink).toHaveBeenCalledTimes(1);
  });

  it("removes all links on delete event", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });

    await tracker.onAfterWrite({
      type: "delete",
      uid: "post-deleted",
    });

    expect(svc.deleteLinksForEntity).toHaveBeenCalledWith(
      "cms",
      "post-deleted",
    );
    expect(svc.listLinksForEntity).not.toHaveBeenCalled();
  });

  it("does nothing on trash event (preserves links)", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });

    await tracker.onAfterWrite({
      type: "trash",
      uid: "post-trashed",
      row: {
        content: `<img src="/api/fm/files/SomeUID_1234567890A/content">`,
        content_type: "text/html",
      },
    });

    expect(svc.createLink).not.toHaveBeenCalled();
    expect(svc.deleteLink).not.toHaveBeenCalled();
    expect(svc.deleteLinksForEntity).not.toHaveBeenCalled();
  });

  it("reconciles on restore event", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });
    const uid = "RestoreTestUID_12345";

    await tracker.onAfterWrite({
      type: "restore",
      uid: "post-restored",
      row: {
        content: `<img src="/api/fm/files/${uid}/content">`,
        content_type: "text/html",
      },
    });

    expect(svc.createLink).toHaveBeenCalledTimes(1);
  });

  it("skips non-HTML/Markdown content types", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });

    await tracker.onAfterWrite({
      type: "update",
      uid: "post-json",
      row: {
        content: `{"blocks":[]}`,
        content_type: "application/json",
      },
    });

    expect(svc.createLink).not.toHaveBeenCalled();
    expect(svc.listLinksForEntity).not.toHaveBeenCalled();
  });

  it("skips events with no body content", async () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });

    await tracker.onAfterWrite({
      type: "update",
      uid: "post-empty",
      row: { content: "", content_type: "text/html" },
    });

    expect(svc.listLinksForEntity).not.toHaveBeenCalled();
  });

  it("uses custom entityType and linkedField", async () => {
    const tracker = createCmsFmLinkTracker({
      fmService: svc as any,
      entityType: "blog",
      linkedField: "description",
    });
    const uid = "CustomTypeTestUID_123";

    await tracker.onAfterWrite({
      type: "create",
      uid: "blog-1",
      row: {
        content: `<img src="/api/fm/files/${uid}/content">`,
        content_type: "text/html",
      },
    });

    expect(svc.createLink).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_entity_type: "blog",
        linked_entity_uid: "blog-1",
        linked_field: "description",
      }),
    );
  });

  it("exposes standalone helpers", () => {
    const tracker = createCmsFmLinkTracker({ fmService: svc as any });
    expect(typeof tracker.extractFmFileUids).toBe("function");
    expect(typeof tracker.reconcileFmLinks).toBe("function");
  });
});
