/**
 * Unit tests for FM Local Storage Adapter
 *
 * Tests: FmStorageLocal operations + security functions
 * Includes dotfile path tests (checklist #35)
 */
import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { FmStorageLocal } from "../../src/fm/storage/FmStorageLocal.js";

let tmpDir: string;
let storage: FmStorageLocal;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fm-storage-test-"));
  storage = new FmStorageLocal({ dataRootAbsPath: tmpDir });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FmStorageLocal", () => {
  describe("getProvider / getCapabilities", () => {
    it("reports local provider", () => {
      expect(storage.getProvider()).toBe("local");
    });

    it("reports correct capabilities", () => {
      const caps = storage.getCapabilities();
      expect(caps.presignPut).toBe(false);
      expect(caps.presignGet).toBe(false);
      expect(caps.headObject).toBe(true);
      expect(caps.readObjectRange).toBe(true);
      expect(caps.writeObject).toBe(true);
      expect(caps.deleteObject).toBe(true);
      expect(caps.copyObject).toBe(true);
      expect(caps.publicUrl).toBe(false);
    });
  });

  describe("writeObject + headObject", () => {
    it("writes a file and verifies it exists via headObject", async () => {
      const ref = { bucket: "cms", objectKey: "test.txt" };
      const body = Buffer.from("Hello, FM!");

      await storage.writeObject({ ref, body });

      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(true);
      expect(head.sizeBytes).toBe(10);
    });

    it("creates nested directories automatically", async () => {
      const ref = { bucket: "uploads", objectKey: "folder/sub/file.png" };
      const body = Buffer.from("PNG data");

      await storage.writeObject({ ref, body });

      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(true);
    });

    it("overwrites existing file", async () => {
      const ref = { bucket: "cms", objectKey: "overwrite.txt" };

      await storage.writeObject({ ref, body: Buffer.from("original") });
      await storage.writeObject({ ref, body: Buffer.from("updated content") });

      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(true);
      expect(head.sizeBytes).toBe(15);
    });
  });

  describe("headObject", () => {
    it("returns exists=false for non-existent file", async () => {
      const ref = { bucket: "cms", objectKey: "nonexistent.txt" };
      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(false);
      expect(head.sizeBytes).toBeUndefined();
    });
  });

  describe("readObjectRange", () => {
    it("reads a byte range from a file", async () => {
      const ref = { bucket: "cms", objectKey: "range.txt" };
      await storage.writeObject({ ref, body: Buffer.from("0123456789") });

      const buf = await storage.readObjectRange({
        ref,
        start: 2,
        endInclusive: 5,
      });
      expect(buf.toString()).toBe("2345");
    });

    it("reads from start when start=0", async () => {
      const ref = { bucket: "cms", objectKey: "range2.txt" };
      await storage.writeObject({ ref, body: Buffer.from("ABCDEF") });

      const buf = await storage.readObjectRange({
        ref,
        start: 0,
        endInclusive: 2,
      });
      expect(buf.toString()).toBe("ABC");
    });

    it("reads less than requested when range exceeds file size", async () => {
      const ref = { bucket: "cms", objectKey: "short.txt" };
      await storage.writeObject({ ref, body: Buffer.from("AB") });

      const buf = await storage.readObjectRange({
        ref,
        start: 0,
        endInclusive: 100,
      });
      expect(buf.toString()).toBe("AB");
    });
  });

  describe("deleteObject", () => {
    it("deletes an existing file", async () => {
      const ref = { bucket: "cms", objectKey: "delete-me.txt" };
      await storage.writeObject({ ref, body: Buffer.from("bye") });

      await storage.deleteObject({ ref });

      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(false);
    });

    it("does not throw when deleting non-existent file", async () => {
      const ref = { bucket: "cms", objectKey: "phantom.txt" };
      await expect(storage.deleteObject({ ref })).resolves.toBeUndefined();
    });
  });

  describe("copyObject", () => {
    it("copies a file to a new location", async () => {
      const from = { bucket: "cms", objectKey: "original.txt" };
      const to = { bucket: "cms", objectKey: "copy.txt" };

      await storage.writeObject({ ref: from, body: Buffer.from("copy me") });
      await storage.copyObject({ from, to });

      // Both should exist
      const headFrom = await storage.headObject({ ref: from });
      const headTo = await storage.headObject({ ref: to });
      expect(headFrom.exists).toBe(true);
      expect(headTo.exists).toBe(true);
      expect(headTo.sizeBytes).toBe(7);
    });

    it("copies across buckets", async () => {
      const from = { bucket: "source", objectKey: "file.txt" };
      const to = { bucket: "dest", objectKey: "file.txt" };

      await storage.writeObject({ ref: from, body: Buffer.from("cross-bucket") });
      await storage.copyObject({ from, to });

      const head = await storage.headObject({ ref: to });
      expect(head.exists).toBe(true);
    });

    it("creates destination directory if needed", async () => {
      const from = { bucket: "cms", objectKey: "flat.txt" };
      const to = { bucket: "cms", objectKey: "deep/nested/dir/flat.txt" };

      await storage.writeObject({ ref: from, body: Buffer.from("nest me") });
      await storage.copyObject({ from, to });

      const head = await storage.headObject({ ref: to });
      expect(head.exists).toBe(true);
    });
  });

  describe("security: path traversal prevention", () => {
    it("rejects bucket with path traversal (..)", async () => {
      const ref = { bucket: "a..b", objectKey: "file.txt" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("Invalid bucket");
    });

    it("rejects bucket with forward slash", async () => {
      const ref = { bucket: "my/bucket", objectKey: "file.txt" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("Invalid bucket");
    });

    it("rejects empty bucket", async () => {
      const ref = { bucket: "", objectKey: "file.txt" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("bucket is required");
    });

    it("rejects empty objectKey", async () => {
      const ref = { bucket: "cms", objectKey: "" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("objectKey is required");
    });

    it("rejects absolute objectKey", async () => {
      const ref = { bucket: "cms", objectKey: "/etc/passwd" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("must be relative");
    });

    it("rejects objectKey that escapes data root via traversal", async () => {
      const ref = { bucket: "cms", objectKey: "../../etc/passwd" };
      await expect(
        storage.writeObject({ ref, body: Buffer.from("hack") })
      ).rejects.toThrow("escapes data root");
    });

    it("rejects objectKey with deep traversal escaping root", async () => {
      const ref = {
        bucket: "cms",
        objectKey: "a/b/c/../../../../../../../../etc/passwd",
      };
      await expect(
        storage.headObject({ ref })
      ).rejects.toThrow("escapes data root");
    });

    it("allows safe nested paths", async () => {
      const ref = { bucket: "cms", objectKey: "a/b/c/d.txt" };
      await storage.writeObject({ ref, body: Buffer.from("safe") });
      const head = await storage.headObject({ ref });
      expect(head.exists).toBe(true);
    });
  });

  describe("dotfile paths (.data/ directories) - checklist #35", () => {
    it("reads and writes files in dot-prefixed bucket", async () => {
      // Simulating .data/ usage pattern from AgentM.Resume
      const dotStorage = new FmStorageLocal({ dataRootAbsPath: tmpDir });
      const ref = { bucket: "cms", objectKey: "test-image.png" };

      // Create a .data directory structure
      const dotDataDir = path.join(tmpDir, ".data");
      await fs.mkdir(dotDataDir, { recursive: true });

      // Create storage rooted in .data
      const dotDataStorage = new FmStorageLocal({ dataRootAbsPath: dotDataDir });

      await dotDataStorage.writeObject({
        ref,
        body: Buffer.from("PNG data in .data"),
      });

      const head = await dotDataStorage.headObject({ ref });
      expect(head.exists).toBe(true);
      expect(head.sizeBytes).toBe(17);

      // Verify file is actually on disk inside .data
      const filePath = path.join(dotDataDir, "cms", "test-image.png");
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it("reads byte range from file in dot-prefixed directory", async () => {
      const dotDataDir = path.join(tmpDir, ".data", "uploads");
      await fs.mkdir(dotDataDir, { recursive: true });
      const dotStorage = new FmStorageLocal({ dataRootAbsPath: dotDataDir });

      const ref = { bucket: "fm", objectKey: "sample.txt" };
      await dotStorage.writeObject({ ref, body: Buffer.from("Hello from .data!") });

      const range = await dotStorage.readObjectRange({
        ref,
        start: 0,
        endInclusive: 4,
      });
      expect(range.toString()).toBe("Hello");
    });

    it("deletes file from dot-prefixed directory", async () => {
      const dotDataDir = path.join(tmpDir, ".data");
      await fs.mkdir(dotDataDir, { recursive: true });
      const dotStorage = new FmStorageLocal({ dataRootAbsPath: dotDataDir });

      const ref = { bucket: "cms", objectKey: "deletable.txt" };
      await dotStorage.writeObject({ ref, body: Buffer.from("delete me") });

      await dotStorage.deleteObject({ ref });

      const head = await dotStorage.headObject({ ref });
      expect(head.exists).toBe(false);
    });

    it("copies file within dot-prefixed directory structure", async () => {
      const dotDataDir = path.join(tmpDir, ".data");
      await fs.mkdir(dotDataDir, { recursive: true });
      const dotStorage = new FmStorageLocal({ dataRootAbsPath: dotDataDir });

      const from = { bucket: "cms", objectKey: "src.txt" };
      const to = { bucket: "fm", objectKey: "dest.txt" };

      await dotStorage.writeObject({ ref: from, body: Buffer.from("dotfile copy") });
      await dotStorage.copyObject({ from, to });

      const head = await dotStorage.headObject({ ref: to });
      expect(head.exists).toBe(true);
      expect(head.sizeBytes).toBe(12);
    });

    it("handles deeply nested paths under dot-prefixed root", async () => {
      const dotDataDir = path.join(tmpDir, ".data", "uploads");
      await fs.mkdir(dotDataDir, { recursive: true });
      const dotStorage = new FmStorageLocal({ dataRootAbsPath: dotDataDir });

      const ref = {
        bucket: "cms",
        objectKey: "nested/deep/folder/image.png",
      };
      await dotStorage.writeObject({
        ref,
        body: Buffer.from("deep nested under .data"),
      });

      const head = await dotStorage.headObject({ ref });
      expect(head.exists).toBe(true);
    });
  });
});
