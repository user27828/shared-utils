import express from "express";
import request from "supertest";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";

import { createFmRouter } from "../../src/fm/express/adminRouter.js";
import { createFmAuthz } from "../../src/fm/express/authz.js";

const makeFile = (ownerUserUid: string) => ({
  uid: "file-1",
  owner_user_uid: ownerUserUid,
});

const makeVariant = (fileUid: string) => ({
  uid: "variant-1",
  variant_of_uid: fileUid,
});

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const buildApp = (service: Record<string, AsyncMock>) => {
  const app = express();
  const authz = createFmAuthz({
    resolveContext: () => ({
      userUid: "user-1",
      createdBy: "user-1",
      isAdmin: false,
    }),
  });

  app.use(authz.middleware);
  app.use(createFmRouter({ service: service as any, authz }));
  return app;
};

describe("createFmRouter upload authorization", () => {
  let service: Record<string, AsyncMock>;

  beforeEach(() => {
    service = {
      getFileByUid: jest.fn<(...args: any[]) => Promise<any>>(),
      getVariantByUid: jest.fn<(...args: any[]) => Promise<any>>(),
      uploadFinalize: jest.fn<(...args: any[]) => Promise<any>>(),
      uploadWriteAndFinalize: jest.fn<(...args: any[]) => Promise<any>>(),
      variantUploadInit: jest.fn<(...args: any[]) => Promise<any>>(),
      variantUploadFinalize: jest.fn<(...args: any[]) => Promise<any>>(),
      variantUploadWriteAndFinalize:
        jest.fn<(...args: any[]) => Promise<any>>(),
    };
  });

  test("rejects direct upload finalize for files owned by another user", async () => {
    service.getFileByUid.mockResolvedValue(makeFile("other-user"));
    const app = buildApp(service);

    const response = await request(app)
      .post("/upload/finalize")
      .send({
        fileUid: "file-1",
        object: { bucket: "cms", objectKey: "file-1.jpg" },
      });

    expect(response.status).toBe(403);
    expect(service.uploadFinalize).not.toHaveBeenCalled();
  });

  test("rejects proxied upload finalize for files owned by another user", async () => {
    service.getFileByUid.mockResolvedValue(makeFile("other-user"));
    const app = buildApp(service);

    const response = await request(app)
      .post("/upload/file-1/proxy")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("data"));

    expect(response.status).toBe(403);
    expect(service.uploadWriteAndFinalize).not.toHaveBeenCalled();
  });

  test("rejects variant upload init for files owned by another user", async () => {
    service.getFileByUid.mockResolvedValue(makeFile("other-user"));
    const app = buildApp(service);

    const response = await request(app).post("/variants/upload/init").send({
      variantOfUid: "file-1",
      variantKind: "thumb",
      originalFilename: "thumb.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 10,
    });

    expect(response.status).toBe(403);
    expect(service.variantUploadInit).not.toHaveBeenCalled();
  });

  test("rejects variant finalize for variants of files owned by another user", async () => {
    service.getVariantByUid.mockResolvedValue(makeVariant("file-1"));
    service.getFileByUid.mockResolvedValue(makeFile("other-user"));
    const app = buildApp(service);

    const response = await request(app)
      .post("/variants/upload/finalize")
      .send({
        variantUid: "variant-1",
        object: { bucket: "cms", objectKey: "variant-1.jpg" },
      });

    expect(response.status).toBe(403);
    expect(service.variantUploadFinalize).not.toHaveBeenCalled();
  });

  test("rejects proxied variant finalize for variants of files owned by another user", async () => {
    service.getVariantByUid.mockResolvedValue(makeVariant("file-1"));
    service.getFileByUid.mockResolvedValue(makeFile("other-user"));
    const app = buildApp(service);

    const response = await request(app)
      .post("/variants/upload/variant-1/proxy")
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("data"));

    expect(response.status).toBe(403);
    expect(service.variantUploadWriteAndFinalize).not.toHaveBeenCalled();
  });
});
