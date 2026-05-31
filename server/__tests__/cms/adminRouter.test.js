import express from "express";
import request from "supertest";
import { jest, describe, test, expect } from "@jest/globals";

import { createCmsAdminRouter } from "../../src/cms/express/adminRouter.js";

const buildApp = (service, opts) => {
  const app = express();
  const authz = {
    requireAuthor: (_req, _res, next) => next(),
    requirePublisher: (_req, _res, next) => next(),
    getActorContext: () => ({
      userUid: "author-1",
      roles: ["cms-author"],
      isSuperadmin: false,
    }),
  };

  app.use(express.json());
  app.use(
    createCmsAdminRouter({
      service,
      authz,
      ...(opts?.transfer ? { transfer: opts.transfer } : {}),
    }),
  );
  return app;
};

describe("createCmsAdminRouter concurrency headers", () => {
  test("serves transfer package export routes on the first GET request", async () => {
    const transfer = {
      exportPackage: jest.fn().mockResolvedValue({
        schemaVersion: "1.0",
        exportedAt: "2026-05-31T18:00:00.000Z",
        sourceEnvironment: "test",
        sourceCmsUid: "cms-1",
        postType: "blog",
        locale: "en",
        cmsEntry: {
          title: "Transfer entry",
          slug: "transfer-entry",
          contentType: "html",
          content: "<p>hello</p>",
          tags: [],
          options: {},
          metadata: {},
        },
        assets: [],
        hostExtensions: {},
        warnings: [],
      }),
      inspectPackage: jest.fn().mockResolvedValue({}),
      applyPackage: jest.fn().mockResolvedValue({}),
    };
    const app = buildApp({}, { transfer });

    const response = await request(app).get(
      "/cms-1/transfer-package?includeAssets=1",
    );

    expect(response.status).toBe(200);
    expect(transfer.exportPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: "cms-1",
        includeAssets: true,
      }),
    );
    expect(response.body.data.package.sourceCmsUid).toBe("cms-1");
  });

  test("passes missing If-Match as null when trashing content", async () => {
    const service = {
      trashByUid: jest.fn().mockResolvedValue({
        uid: "cms-1",
        etag: "cms:cms-1:v2",
      }),
    };
    const app = buildApp(service);

    const response = await request(app).post("/cms-1/trash");

    expect(response.status).toBe(200);
    expect(service.trashByUid).toHaveBeenCalledWith(
      expect.objectContaining({ ifMatchHeader: null }),
    );
  });

  test("passes missing If-Match as null when restoring content", async () => {
    const service = {
      restoreByUid: jest.fn().mockResolvedValue({
        uid: "cms-1",
        etag: "cms:cms-1:v2",
      }),
    };
    const app = buildApp(service);

    const response = await request(app).post("/cms-1/restore");

    expect(response.status).toBe(200);
    expect(service.restoreByUid).toHaveBeenCalledWith(
      expect.objectContaining({ ifMatchHeader: null }),
    );
  });
});