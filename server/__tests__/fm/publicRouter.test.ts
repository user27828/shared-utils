import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import { afterEach, describe, expect, jest, test } from "@jest/globals";

import { createFmPublicRouter } from "../../src/fm/express/publicRouter.js";

const tempDirs: string[] = [];

const makeTempFile = (name: string, content: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fm-public-router-"));
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf8");
  tempDirs.push(dir);
  return filePath;
};

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("createFmPublicRouter", () => {
  test("forces attachment and nosniff for dangerous MIME types", async () => {
    const absPath = makeTempFile("payload.html", "<html>unsafe</html>");
    const service = {
      resolveContentAccess: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          provider: "local",
          absPath,
          contentType: "text/html",
          file: {
            uid: "file-1",
            original_filename: "payload.html",
            is_public: true,
            archived_at: null,
            sha256: "sha-1",
          },
        }),
    };

    const app = express();
    app.use(createFmPublicRouter({ service: service as any }));

    const response = await request(app).get("/file-1");

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["content-disposition"]).toContain("attachment;");
  });
});
