/**
 * FmServiceCore unit tests
 *
 * Tests the stateless orchestration class with mock connector and mock storage.
 * Checklist item #47.
 *
 * Coverage:
 *  - Upload lifecycle (init, finalize, write+finalize)
 *  - Variant upload lifecycle
 *  - Delete with link-safety + force defense-in-depth
 *  - Move (copy-then-delete)
 *  - Archive / restore (idempotent)
 *  - URL resolution (public / signed / canonical)
 *  - Content access (local / S3)
 *  - Link management (create / delete / list)
 *  - Metadata patching (local is_public enforcement, tag dedup)
 *  - Post-write hook behavior (best-effort, errors swallowed)
 *  - Storage object metadata retrieval
 */
import { jest, describe, test, expect } from "@jest/globals";
import { FmServiceCore } from "../../src/fm/FmServiceCore.js";
import type { FmServiceCoreConfig } from "../../src/fm/FmServiceCore.js";
import type { FmConnector } from "../../src/fm/FmConnector.js";
import type { FmStorageAdapter } from "../../src/fm/storage/FmStorageAdapter.js";
import { encodeFmStorageKey } from "../../src/fm/utils/storageKey.js";
import {
  FmNotFoundError,
  FmValidationError,
  FmAuthorizationError,
  FmPolicyError,
  FmStorageError,
} from "../../../utils/src/fm/errors.js";

// ── Mock Factories ───────────────────────────────────────────────────────

const CMS_BUCKET = "cms";
const USER_BUCKET = "user-uploads";

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    provider: "s3" as const,
    bucketCms: CMS_BUCKET,
    bucketUserUploads: USER_BUCKET,
    clientUrl: "https://example.com",
    signedUrlTtlSeconds: 300,
    uploadPathPresets: [
      { relativePath: CMS_BUCKET, name: "CMS" },
      { relativePath: USER_BUCKET, name: "User Uploads" },
    ],
    ...overrides,
  };
}

function makeMockStorage(provider: "local" | "s3" = "s3") {
  return {
    getProvider: jest.fn(() => provider),
    getCapabilities: jest.fn(() => ({
      writeObject: true,
      readObjectRange: true,
      headObject: true,
      deleteObject: true,
      copyObject: true,
      presignPut: provider === "s3",
      presignGet: provider === "s3",
      publicUrl: provider === "s3",
    })),
    writeObject: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    readObjectRange: jest
      .fn<(...args: any[]) => Promise<Buffer>>()
      .mockResolvedValue(Buffer.alloc(0)),
    headObject: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
      exists: true,
      sizeBytes: 1024,
      contentType: "image/jpeg",
      metadata: {},
    }),
    deleteObject: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    copyObject: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    presignPut: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
      method: "PUT",
      url: "https://s3.example.com/put?sig=abc",
      expiresAtIso: new Date(Date.now() + 300_000).toISOString(),
    }),
    presignGet: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({
      url: "https://s3.example.com/get?sig=xyz",
      expiresAtIso: new Date(Date.now() + 300_000).toISOString(),
    }),
    getPublicUrl: jest.fn(
      ({ ref }: any) =>
        `https://cdn.example.com/${ref.bucket}/${ref.objectKey}`,
    ),
  };
}

type MockStorage = ReturnType<typeof makeMockStorage>;

function makeMockConnector() {
  return {
    getFileByUid: jest
      .fn<(uid: string) => Promise<any>>()
      .mockResolvedValue(null),
    insertFile: jest.fn<(row: any) => Promise<any>>(async (row: any) => ({
      ...row,
      title: row.title ?? "",
      alt_text: row.alt_text ?? "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    updateFileByUid: jest.fn<(uid: string, patch: any) => Promise<any>>(
      async (uid: string, patch: any) => ({
        ...makeFakeFile(),
        uid,
        ...patch,
      }),
    ),
    deleteFileByUid: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    listFiles: jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue({ items: [], totalCount: 0, limit: 20, offset: 0 }),
    getVariantByUid: jest
      .fn<(uid: string) => Promise<any>>()
      .mockResolvedValue(null),
    listVariantsForFile: jest
      .fn<(...args: any[]) => Promise<any[]>>()
      .mockResolvedValue([]),
    insertVariant: jest.fn<(row: any) => Promise<any>>(async (row: any) => ({
      ...row,
    })),
    updateVariantByUid: jest.fn<(uid: string, patch: any) => Promise<any>>(
      async (uid: string, patch: any) => ({
        ...makeFakeVariant(),
        uid,
        ...patch,
      }),
    ),
    deleteVariantsForFile: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    countLinksForFile: jest
      .fn<(...args: any[]) => Promise<number>>()
      .mockResolvedValue(0),
    createLink: jest.fn<(row: any) => Promise<any>>(async (row: any) => ({
      ...row,
      id: 1,
      created_at: new Date().toISOString(),
    })),
    deleteLink: jest
      .fn<(...args: any[]) => Promise<void>>()
      .mockResolvedValue(undefined),
    listLinksForFile: jest
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue({ items: [], totalCount: 0, limit: 20, offset: 0 }),
  };
}

type MockConnector = ReturnType<typeof makeMockConnector>;

function makeFakeFile(overrides: Record<string, unknown> = {}) {
  return {
    uid: "file-abc",
    owner_user_uid: "user-1",
    created_by: "user-1",
    original_filename: "photo.jpg",
    mime_type: "image/jpeg",
    byte_size: 1024,
    storage_location: "s3",
    storage_key: encodeFmStorageKey({
      bucket: CMS_BUCKET,
      objectKey: "file-abc.jpg",
    }),
    is_public: true,
    purpose: "cms_asset",
    sha256: "abc123",
    archived_at: null,
    title: "",
    alt_text: "",
    tags: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeFakeVariant(overrides: Record<string, unknown> = {}) {
  return {
    uid: "var-1",
    variant_of_uid: "file-abc",
    variant_kind: "thumb",
    width: 100,
    height: 100,
    transform: {},
    storage_location: "s3",
    storage_key: encodeFmStorageKey({
      bucket: CMS_BUCKET,
      objectKey: "var-1.jpg",
    }),
    byte_size: 256,
    mime_type: "image/jpeg",
    ...overrides,
  };
}

function buildService(
  opts: {
    config?: Record<string, unknown>;
    storage?: MockStorage;
    connector?: MockConnector;
    onWrite?: jest.Mock;
  } = {},
) {
  const connector = opts.connector || makeMockConnector();
  const storage = opts.storage || makeMockStorage();
  const config = makeConfig(opts.config);
  const onWrite = opts.onWrite || jest.fn<(...args: any[]) => void>();
  const service = new FmServiceCore({
    config,
    connector: connector as unknown as FmConnector,
    storage: storage as unknown as FmStorageAdapter,
    onWrite: onWrite as unknown as FmServiceCoreConfig["onWrite"],
  });
  return { service, connector, storage, config, onWrite };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe("FmServiceCore", () => {
  // ── Constructor / Accessors ──────────────────────────────────────────

  describe("constructor / accessors", () => {
    test("getConnector returns injected connector", () => {
      const { service, connector } = buildService();
      expect(service.getConnector()).toBe(connector);
    });

    test("getStorage returns injected storage", () => {
      const { service, storage } = buildService();
      expect(service.getStorage()).toBe(storage);
    });

    test("getConfig returns injected config", () => {
      const { service, config } = buildService();
      expect(service.getConfig()).toBe(config);
    });
  });

  // ── Upload Init ──────────────────────────────────────────────────────

  describe("uploadInit", () => {
    const validRequest = {
      originalFilename: "test.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      purpose: "cms_asset" as const,
      visibility: "public" as const,
    };

    test("returns direct mode with presigned URL for S3 storage", async () => {
      const { service, connector, storage } = buildService();

      const result = await service.uploadInit({
        request: validRequest,
        ownerUserUid: "user-1",
        createdBy: "user-1",
      });

      expect(result.fileUid).toBeDefined();
      expect(result.mode).toBe("direct");
      expect(result.presignedPut).toBeDefined();
      expect(result.presignedPut?.url).toContain("s3.example.com");
      expect(connector.insertFile).toHaveBeenCalledTimes(1);
      expect(storage.presignPut).toHaveBeenCalledTimes(1);
    });

    test("returns proxied mode when storage lacks presignPut", async () => {
      const storage = makeMockStorage("local");
      const { service } = buildService({ storage });

      const result = await service.uploadInit({
        request: validRequest,
        ownerUserUid: "user-1",
      });

      expect(result.mode).toBe("proxied");
      expect(result.presignedPut).toBeUndefined();
    });

    test("resolves bucket to user-uploads for resume purpose", async () => {
      const { service, connector } = buildService();

      await service.uploadInit({
        request: {
          originalFilename: "resume.pdf",
          mimeType: "application/pdf",
          sizeBytes: 2048,
          purpose: "resume",
        },
        ownerUserUid: "user-1",
      });

      const insertArg = connector.insertFile.mock.calls[0]?.[0] as any;
      expect(insertArg?.storage_key).toContain(USER_BUCKET);
    });

    test("resolves bucket to cms for cms_asset purpose", async () => {
      const { service, connector } = buildService();

      await service.uploadInit({
        request: validRequest,
        ownerUserUid: "user-1",
      });

      const insertArg = connector.insertFile.mock.calls[0]?.[0] as any;
      expect(insertArg?.storage_key).toContain(CMS_BUCKET);
    });

    test("rejects destinationHint with disallowed bucket", async () => {
      const { service } = buildService();

      await expect(
        service.uploadInit({
          request: {
            ...validRequest,
            destinationHint: { bucket: "evil-bucket" },
          },
          ownerUserUid: "user-1",
        }),
      ).rejects.toThrow(/not allowed/i);
    });

    test("inserts file with correct metadata fields", async () => {
      const { service, connector } = buildService();

      const result = await service.uploadInit({
        request: validRequest,
        ownerUserUid: "user-1",
        createdBy: "admin-1",
      });

      expect(connector.insertFile).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: result.fileUid,
          owner_user_uid: "user-1",
          created_by: "admin-1",
          original_filename: "test.jpg",
          mime_type: "image/jpeg",
          byte_size: 1024,
          is_public: true,
          purpose: "cms_asset",
        }),
      );
    });
  });

  // ── Upload Finalize ──────────────────────────────────────────────────

  describe("uploadFinalize", () => {
    const ref = { bucket: CMS_BUCKET, objectKey: "file-abc.jpg" };

    test("patches file with storage head metadata (S3 path)", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const result = await service.uploadFinalize({
        request: { fileUid: "file-abc", object: ref },
      });

      expect(storage.headObject).toHaveBeenCalledWith({ ref });
      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ byte_size: 1024 }),
      );
      expect(result.file).toBeDefined();
    });

    test("accepts client-reported sha256 on S3", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.uploadFinalize({
        request: {
          fileUid: "file-abc",
          object: ref,
          sha256: "client-hash-xyz",
        },
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ sha256: "client-hash-xyz" }),
      );
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.uploadFinalize({
          request: { fileUid: "no-such-file", object: ref },
        }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("rejects if object reference mismatches stored key", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await expect(
        service.uploadFinalize({
          request: {
            fileUid: "file-abc",
            object: { bucket: "wrong-bucket", objectKey: "wrong.jpg" },
          },
        }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects if uploaded object not found in storage", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      storage.headObject.mockResolvedValue({ exists: false });

      await expect(
        service.uploadFinalize({
          request: { fileUid: "file-abc", object: ref },
        }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("emits upload write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.uploadFinalize({
        request: { fileUid: "file-abc", object: ref },
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "upload", fileUid: "file-abc" }),
      );
    });
  });

  // ── Upload Write + Finalize (proxied) ────────────────────────────────

  describe("uploadWriteAndFinalize", () => {
    test("writes object then finalizes", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const result = await service.uploadWriteAndFinalize({
        fileUid: "file-abc",
        body: Buffer.from("fake-jpeg-data"),
        contentType: "image/jpeg",
      });

      expect(storage.writeObject).toHaveBeenCalledTimes(1);
      expect(result.file).toBeDefined();
    });

    test("rejects if file is archived", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );

      await expect(
        service.uploadWriteAndFinalize({
          fileUid: "file-abc",
          body: Buffer.from("data"),
        }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects if body exceeds declared byte_size", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile({ byte_size: 10 }));

      await expect(
        service.uploadWriteAndFinalize({
          fileUid: "file-abc",
          body: Buffer.alloc(100),
        }),
      ).rejects.toThrow(FmValidationError);
    });

    test("cleans up storage object on write failure", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      storage.writeObject.mockRejectedValue(new Error("write failed"));

      await expect(
        service.uploadWriteAndFinalize({
          fileUid: "file-abc",
          body: Buffer.from("data"),
        }),
      ).rejects.toThrow("write failed");

      expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    });

    test("rejects if storage lacks writeObject capability", async () => {
      const storage = makeMockStorage();
      storage.getCapabilities.mockReturnValue({
        writeObject: false,
        readObjectRange: true,
        headObject: true,
        deleteObject: true,
        copyObject: true,
        presignPut: true,
        presignGet: true,
        publicUrl: true,
      });
      const { service, connector } = buildService({ storage });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await expect(
        service.uploadWriteAndFinalize({
          fileUid: "file-abc",
          body: Buffer.from("data"),
        }),
      ).rejects.toThrow(FmStorageError);
    });
  });

  // ── Variant Upload Init ──────────────────────────────────────────────

  describe("variantUploadInit", () => {
    const validVariantRequest = {
      variantOfUid: "file-abc",
      originalFilename: "thumb.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 256,
      variantKind: "thumb" as const,
      width: 100,
      height: 100,
    };

    test("creates variant record and returns response", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const result = await service.variantUploadInit({
        request: validVariantRequest,
      });

      expect(result.variantUid).toBeDefined();
      expect(connector.insertVariant).toHaveBeenCalledWith(
        expect.objectContaining({
          variant_of_uid: "file-abc",
          variant_kind: "thumb",
          width: 100,
          height: 100,
        }),
      );
    });

    test("rejects if parent file not found", async () => {
      const { service } = buildService();

      await expect(
        service.variantUploadInit({ request: validVariantRequest }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("rejects if parent file is archived", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );

      await expect(
        service.variantUploadInit({ request: validVariantRequest }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects thumb variant with width exceeding 512", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await expect(
        service.variantUploadInit({
          request: { ...validVariantRequest, width: 600 },
        }),
      ).rejects.toThrow(FmValidationError);
    });
  });

  // ── Variant Upload Finalize ──────────────────────────────────────────

  describe("variantUploadFinalize", () => {
    const varRef = { bucket: CMS_BUCKET, objectKey: "var-1.jpg" };

    test("patches variant with storage head metadata", async () => {
      const { service, connector, storage } = buildService();
      connector.getVariantByUid.mockResolvedValue(makeFakeVariant());

      const result = await service.variantUploadFinalize({
        request: { variantUid: "var-1", object: varRef },
      });

      expect(storage.headObject).toHaveBeenCalledWith({ ref: varRef });
      expect(result.variant).toBeDefined();
    });

    test("sniffs PNG dimensions and validates against declared", async () => {
      const { service, connector, storage } = buildService();
      connector.getVariantByUid.mockResolvedValue(
        makeFakeVariant({ width: 100, height: 100 }),
      );

      // Build a valid PNG header with width=100, height=100
      const png = Buffer.alloc(33);
      png.write("\x89PNG\r\n\x1a\n", 0, "binary"); // signature
      png.writeUInt32BE(13, 8); // IHDR chunk length
      png.write("IHDR", 12); // chunk type
      png.writeUInt32BE(100, 16); // width
      png.writeUInt32BE(100, 20); // height
      storage.readObjectRange.mockResolvedValue(png);

      const result = await service.variantUploadFinalize({
        request: { variantUid: "var-1", object: varRef },
      });

      expect(result.variant).toBeDefined();
    });

    test("rejects if sniffed dimensions mismatch declared (exceeds tolerance)", async () => {
      const { service, connector, storage } = buildService();
      connector.getVariantByUid.mockResolvedValue(
        makeFakeVariant({ width: 100, height: 100 }),
      );

      // Build PNG header with width=200 — delta of 100 exceeds tolerance of 2
      const png = Buffer.alloc(33);
      png.write("\x89PNG\r\n\x1a\n", 0, "binary");
      png.writeUInt32BE(13, 8);
      png.write("IHDR", 12);
      png.writeUInt32BE(200, 16); // width = 200 vs declared 100
      png.writeUInt32BE(100, 20);
      storage.readObjectRange.mockResolvedValue(png);

      await expect(
        service.variantUploadFinalize({
          request: { variantUid: "var-1", object: varRef },
        }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects if variant not found", async () => {
      const { service } = buildService();

      await expect(
        service.variantUploadFinalize({
          request: { variantUid: "no-such-var", object: varRef },
        }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("emits variant-upload write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getVariantByUid.mockResolvedValue(makeFakeVariant());

      await service.variantUploadFinalize({
        request: { variantUid: "var-1", object: varRef },
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "variant-upload" }),
      );
    });
  });

  // ── Archive ──────────────────────────────────────────────────────────

  describe("archiveFile", () => {
    test("sets archived_at timestamp", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.archiveFile({ fileUid: "file-abc" });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ archived_at: expect.any(String) }),
      );
    });

    test("returns existing file without DB call if already archived (idempotent)", async () => {
      const { service, connector } = buildService();
      const archived = makeFakeFile({
        archived_at: new Date().toISOString(),
      });
      connector.getFileByUid.mockResolvedValue(archived);

      const result = await service.archiveFile({ fileUid: "file-abc" });

      expect(connector.updateFileByUid).not.toHaveBeenCalled();
      expect(result).toEqual(archived);
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(service.archiveFile({ fileUid: "missing" })).rejects.toThrow(
        FmNotFoundError,
      );
    });

    test("emits archive write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.archiveFile({
        fileUid: "file-abc",
        userUid: "user-1",
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "archive",
          fileUid: "file-abc",
          userUid: "user-1",
        }),
      );
    });
  });

  // ── Restore ──────────────────────────────────────────────────────────

  describe("restoreFile", () => {
    test("clears archived_at", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );

      await service.restoreFile({ fileUid: "file-abc" });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ archived_at: null }),
      );
    });

    test("returns existing file without DB call if not archived (idempotent)", async () => {
      const { service, connector } = buildService();
      const live = makeFakeFile({ archived_at: null });
      connector.getFileByUid.mockResolvedValue(live);

      const result = await service.restoreFile({ fileUid: "file-abc" });

      expect(connector.updateFileByUid).not.toHaveBeenCalled();
      expect(result).toEqual(live);
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(service.restoreFile({ fileUid: "missing" })).rejects.toThrow(
        FmNotFoundError,
      );
    });

    test("emits restore write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );

      await service.restoreFile({
        fileUid: "file-abc",
        userUid: "user-1",
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "restore", fileUid: "file-abc" }),
      );
    });
  });

  // ── Delete ───────────────────────────────────────────────────────────

  describe("deleteFile", () => {
    test("archives (not deletes) when file has links and no force flag", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(3);

      const result = await service.deleteFile({ fileUid: "file-abc" });

      expect(result.action).toBe("archived");
      if (result.action === "archived") {
        expect(result.linkCount).toBe(3);
      }
      expect(connector.deleteFileByUid).not.toHaveBeenCalled();
    });

    test("hard deletes when file has no links", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(0);

      const result = await service.deleteFile({ fileUid: "file-abc" });

      expect(result.action).toBe("deleted");
      expect(storage.deleteObject).toHaveBeenCalled();
      expect(connector.deleteVariantsForFile).toHaveBeenCalledWith("file-abc");
      expect(connector.deleteFileByUid).toHaveBeenCalledWith("file-abc");
    });

    test("force delete requires isAdmin flag (defense-in-depth)", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(3);

      await expect(
        service.deleteFile({
          fileUid: "file-abc",
          force: true,
          isAdmin: false,
        }),
      ).rejects.toThrow(FmAuthorizationError);
    });

    test("force + admin bypasses link safety and hard deletes", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(3);

      const result = await service.deleteFile({
        fileUid: "file-abc",
        force: true,
        isAdmin: true,
      });

      expect(result.action).toBe("deleted");
      expect(connector.deleteFileByUid).toHaveBeenCalled();
    });

    test("deletes variant objects before main object", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(0);
      connector.listVariantsForFile.mockResolvedValue([
        makeFakeVariant({
          uid: "v1",
          storage_key: encodeFmStorageKey({
            bucket: CMS_BUCKET,
            objectKey: "v1.jpg",
          }),
        }),
        makeFakeVariant({
          uid: "v2",
          storage_key: encodeFmStorageKey({
            bucket: CMS_BUCKET,
            objectKey: "v2.jpg",
          }),
        }),
      ]);

      await service.deleteFile({ fileUid: "file-abc" });

      // 2 variants + 1 main = 3 deleteObject calls
      expect(storage.deleteObject).toHaveBeenCalledTimes(3);
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(service.deleteFile({ fileUid: "missing" })).rejects.toThrow(
        FmNotFoundError,
      );
    });

    test("emits delete write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(0);

      await service.deleteFile({
        fileUid: "file-abc",
        userUid: "user-1",
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "delete",
          fileUid: "file-abc",
        }),
      );
    });
  });

  // ── Move ─────────────────────────────────────────────────────────────

  describe("moveFile", () => {
    test("copies then deletes objects (file + variants)", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.listVariantsForFile.mockResolvedValue([makeFakeVariant()]);

      await service.moveFile({
        fileUid: "file-abc",
        toFolderPath: "new-folder",
      });

      // 1 file + 1 variant = 2 copy calls
      expect(storage.copyObject).toHaveBeenCalledTimes(2);
      // Best-effort delete of old objects
      expect(storage.deleteObject).toHaveBeenCalled();
    });

    test("updates storage keys in connector", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.moveFile({
        fileUid: "file-abc",
        toFolderPath: "moved",
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({
          storage_key: expect.stringContaining("moved"),
        }),
      );
    });

    test("rejects if file is archived", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );

      await expect(
        service.moveFile({ fileUid: "file-abc", toFolderPath: "x" }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects if destination bucket not in allowed presets", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await expect(
        service.moveFile({
          fileUid: "file-abc",
          toBucket: "evil-bucket",
        }),
      ).rejects.toThrow(FmPolicyError);
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.moveFile({ fileUid: "missing", toFolderPath: "x" }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("emits move write event with metadata", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.moveFile({
        fileUid: "file-abc",
        toFolderPath: "target",
        userUid: "user-1",
      });

      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "move",
          fileUid: "file-abc",
          metadata: expect.objectContaining({ toFolder: "target" }),
        }),
      );
    });
  });

  // ── URL Resolution ───────────────────────────────────────────────────

  describe("resolveReadUrl", () => {
    test("returns publicUrl for public file with publicUrl capability", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ is_public: true }),
      );

      const result = await service.resolveReadUrl({
        fileUid: "file-abc",
      });

      expect(result.kind).toBe("public");
      expect(result.url).toContain("cdn.example.com");
    });

    test("returns canonical for public file without publicUrl capability", async () => {
      const storage = makeMockStorage();
      storage.getCapabilities.mockReturnValue({
        writeObject: true,
        readObjectRange: true,
        headObject: true,
        deleteObject: true,
        copyObject: true,
        presignPut: true,
        presignGet: true,
        publicUrl: false,
      });
      const { service, connector } = buildService({ storage });
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ is_public: true }),
      );

      const result = await service.resolveReadUrl({
        fileUid: "file-abc",
      });

      expect(result.kind).toBe("canonical");
      expect(result.url).toContain("example.com");
    });

    test("returns signed URL for private file", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ is_public: false }),
      );

      const result = await service.resolveReadUrl({
        fileUid: "file-abc",
      });

      expect(result.kind).toBe("signed");
      expect(result.expiresAtIso).toBeDefined();
    });

    test("returns canonical for private file without presignGet", async () => {
      const storage = makeMockStorage();
      storage.getCapabilities.mockReturnValue({
        writeObject: true,
        readObjectRange: true,
        headObject: true,
        deleteObject: true,
        copyObject: true,
        presignPut: true,
        presignGet: false,
        publicUrl: true,
      });
      const { service, connector } = buildService({ storage });
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ is_public: false }),
      );

      const result = await service.resolveReadUrl({
        fileUid: "file-abc",
      });

      expect(result.kind).toBe("canonical");
    });

    test("selects variant when variantKind specified", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ is_public: true }),
      );
      connector.listVariantsForFile.mockResolvedValue([
        makeFakeVariant({ variant_kind: "thumb" }),
      ]);

      const result = await service.resolveReadUrl({
        fileUid: "file-abc",
        variantKind: "thumb",
      });

      expect(result.kind).toBe("public");
      expect(storage.getPublicUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: { bucket: CMS_BUCKET, objectKey: "var-1.jpg" },
        }),
      );
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.resolveReadUrl({ fileUid: "missing" }),
      ).rejects.toThrow(FmNotFoundError);
    });
  });

  // ── Content Streaming Resolution ─────────────────────────────────────

  describe("resolveContentAccess", () => {
    test("returns absPath for local provider", async () => {
      const storage = makeMockStorage("local");
      const { service, connector } = buildService({
        storage,
        config: {
          provider: "local",
          dataRootPath: "/tmp/fm-data",
        },
      });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const result = await service.resolveContentAccess({
        fileUid: "file-abc",
      });

      expect(result.provider).toBe("local");
      expect(result.absPath).toBeDefined();
      expect(result.absPath).toContain("file-abc.jpg");
    });

    test("returns redirectUrl for S3 provider with presignGet", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const result = await service.resolveContentAccess({
        fileUid: "file-abc",
      });

      expect(result.provider).toBe("s3");
      expect(result.redirectUrl).toContain("s3.example.com");
    });

    test("selects variant when variantKind specified", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.listVariantsForFile.mockResolvedValue([
        makeFakeVariant({ variant_kind: "thumb" }),
      ]);

      const result = await service.resolveContentAccess({
        fileUid: "file-abc",
        variantKind: "thumb",
      });

      expect(result.ref.objectKey).toBe("var-1.jpg");
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.resolveContentAccess({ fileUid: "missing" }),
      ).rejects.toThrow(FmNotFoundError);
    });
  });

  // ── Link Management ──────────────────────────────────────────────────

  describe("link management", () => {
    test("createLink succeeds when file exists", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      const link = await service.createLink({
        file_uid: "file-abc",
        linked_entity_type: "page",
        linked_entity_uid: "page-1",
        linked_field: "hero_image",
      });

      expect(connector.createLink).toHaveBeenCalledWith(
        expect.objectContaining({
          file_uid: "file-abc",
          linked_entity_type: "page",
        }),
      );
      expect(link).toBeDefined();
    });

    test("createLink rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.createLink({
          file_uid: "missing",
          linked_entity_type: "page",
          linked_entity_uid: "page-1",
        }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("deleteLink delegates to connector", async () => {
      const { service, connector } = buildService();

      await service.deleteLink({
        fileUid: "file-abc",
        linkedEntityType: "page",
        linkedEntityUid: "page-1",
      });

      expect(connector.deleteLink).toHaveBeenCalledWith({
        fileUid: "file-abc",
        linkedEntityType: "page",
        linkedEntityUid: "page-1",
      });
    });

    test("listLinksForFile delegates to connector", async () => {
      const { service, connector } = buildService();

      await service.listLinksForFile("file-abc");

      expect(connector.listLinksForFile).toHaveBeenCalledWith(
        "file-abc",
        undefined,
      );
    });
  });

  // ── Metadata Patching ────────────────────────────────────────────────

  describe("patchFile", () => {
    test("patches title and alt_text", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.patchFile({
        fileUid: "file-abc",
        patch: { title: "Updated Title", alt_text: "An image" },
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({
          title: "Updated Title",
          alt_text: "An image",
        }),
      );
    });

    test("local storage forces is_public=true regardless of input", async () => {
      const storage = makeMockStorage("local");
      const { service, connector } = buildService({ storage });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.patchFile({
        fileUid: "file-abc",
        patch: { is_public: false },
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ is_public: true }),
      );
    });

    test("S3 storage allows is_public=false", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.patchFile({
        fileUid: "file-abc",
        patch: { is_public: false },
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ is_public: false }),
      );
    });

    test("normalizes and deduplicates tags", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await service.patchFile({
        fileUid: "file-abc",
        patch: { tags: [" photo ", "photo", " banner ", " banner"] },
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({
          tags: ["photo", "banner"],
        }),
      );
    });

    test("returns existing file without DB call if patch is empty", async () => {
      const { service, connector } = buildService();
      const file = makeFakeFile();
      connector.getFileByUid.mockResolvedValue(file);

      const result = await service.patchFile({
        fileUid: "file-abc",
        patch: {},
      });

      expect(connector.updateFileByUid).not.toHaveBeenCalled();
      expect(result).toEqual(file);
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.patchFile({ fileUid: "missing", patch: { title: "x" } }),
      ).rejects.toThrow(FmNotFoundError);
    });
  });

  // ── Rename (original filename) ─────────────────────────────────────

  describe("renameFile", () => {
    test("updates original_filename and emits a patch write event", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.updateFileByUid.mockResolvedValue(
        makeFakeFile({ original_filename: "new-name.jpg" }),
      );

      const result = await service.renameFile({
        fileUid: "file-abc",
        originalFilename: "new-name.jpg",
        userUid: "user-1",
      });

      expect(connector.updateFileByUid).toHaveBeenCalledWith(
        "file-abc",
        expect.objectContaining({ original_filename: "new-name.jpg" }),
      );
      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "patch",
          fileUid: "file-abc",
          userUid: "user-1",
        }),
      );
      expect(result.original_filename).toBe("new-name.jpg");
    });

    test("no-ops when filename is unchanged", async () => {
      const { service, connector } = buildService();
      const file = makeFakeFile({ original_filename: "photo.jpg" });
      connector.getFileByUid.mockResolvedValue(file);

      const result = await service.renameFile({
        fileUid: "file-abc",
        originalFilename: "photo.jpg",
      });

      expect(connector.updateFileByUid).not.toHaveBeenCalled();
      expect(result).toEqual(file);
    });

    test("rejects invalid filenames with path separators", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      await expect(
        service.renameFile({
          fileUid: "file-abc",
          originalFilename: "../evil.jpg",
        }),
      ).rejects.toThrow(FmValidationError);
    });

    test("rejects disallowed extensions for the file purpose", async () => {
      const { service, connector } = buildService();
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ purpose: "avatar" }),
      );

      await expect(
        service.renameFile({
          fileUid: "file-abc",
          originalFilename: "avatar.gif",
        }),
      ).rejects.toThrow(FmPolicyError);
    });
  });

  // ── Delegation methods ───────────────────────────────────────────────

  describe("listFiles / getFileByUid / listVariantsForFile", () => {
    test("listFiles delegates to connector", async () => {
      const { service, connector } = buildService();

      await service.listFiles({ limit: 10, offset: 0 });

      expect(connector.listFiles).toHaveBeenCalledWith({
        limit: 10,
        offset: 0,
      });
    });

    test("getFileByUid delegates to connector", async () => {
      const { service, connector } = buildService();
      const file = makeFakeFile();
      connector.getFileByUid.mockResolvedValue(file);

      const result = await service.getFileByUid("file-abc");

      expect(result).toEqual(file);
      expect(connector.getFileByUid).toHaveBeenCalledWith("file-abc");
    });

    test("listVariantsForFile delegates to connector", async () => {
      const { service, connector } = buildService();

      await service.listVariantsForFile("file-abc");

      expect(connector.listVariantsForFile).toHaveBeenCalledWith("file-abc");
    });
  });

  // ── Storage Object Metadata ──────────────────────────────────────────

  describe("getStorageObjectMetadata", () => {
    test("returns storage metadata for file", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      storage.headObject.mockResolvedValue({
        exists: true,
        metadata: {
          "fm-uid": "file-abc",
          "content-type": "image/jpeg",
        },
      });

      const result = await service.getStorageObjectMetadata({
        fileUid: "file-abc",
      });

      expect(result.metadata).toEqual({
        "fm-uid": "file-abc",
        "content-type": "image/jpeg",
      });
    });

    test("rejects if file not found", async () => {
      const { service } = buildService();

      await expect(
        service.getStorageObjectMetadata({ fileUid: "missing" }),
      ).rejects.toThrow(FmNotFoundError);
    });

    test("rejects if storage object not found", async () => {
      const { service, connector, storage } = buildService();
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      storage.headObject.mockResolvedValue({ exists: false });

      await expect(
        service.getStorageObjectMetadata({ fileUid: "file-abc" }),
      ).rejects.toThrow(FmNotFoundError);
    });
  });

  // ── Post-write Hook ──────────────────────────────────────────────────

  describe("onWrite hook", () => {
    test("hook errors are swallowed (best-effort invocation)", async () => {
      const onWrite = jest
        .fn<(...args: any[]) => Promise<void>>()
        .mockRejectedValue(new Error("hook exploded"));
      const { service, connector } = buildService({ onWrite });
      connector.getFileByUid.mockResolvedValue(makeFakeFile());

      // Should not throw despite hook failure
      await expect(
        service.archiveFile({ fileUid: "file-abc" }),
      ).resolves.toBeDefined();

      expect(onWrite).toHaveBeenCalled();
    });

    test("emits correct action for each mutation type", async () => {
      const onWrite = jest.fn();
      const { service, connector } = buildService({ onWrite });

      // Archive
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      await service.archiveFile({ fileUid: "file-abc" });
      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "archive" }),
      );

      // Restore
      connector.getFileByUid.mockResolvedValue(
        makeFakeFile({ archived_at: new Date().toISOString() }),
      );
      await service.restoreFile({ fileUid: "file-abc" });
      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "restore" }),
      );

      // Delete
      connector.getFileByUid.mockResolvedValue(makeFakeFile());
      connector.countLinksForFile.mockResolvedValue(0);
      await service.deleteFile({ fileUid: "file-abc" });
      expect(onWrite).toHaveBeenCalledWith(
        expect.objectContaining({ action: "delete" }),
      );
    });
  });
});
