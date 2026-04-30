import express from "express";
import request from "supertest";
import { jest, describe, test, expect } from "@jest/globals";

import { createCmsAdminRouter } from "../../src/cms/express/adminRouter.js";

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const buildApp = (service: Record<string, AsyncMock>) => {
  const app = express();
  const authz = {
    requireAuthor: (_req: any, _res: any, next: () => void) => next(),
    requirePublisher: (_req: any, _res: any, next: () => void) => next(),
    getActorContext: () => ({
      userUid: "author-1",
      roles: ["cms-author"],
      isSuperadmin: false,
    }),
  };

  app.use(createCmsAdminRouter({ service: service as any, authz }));
  return app;
};

describe("createCmsAdminRouter concurrency headers", () => {
  test("passes missing If-Match as null when trashing content", async () => {
    const service = {
      trashByUid: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
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
      restoreByUid: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
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
