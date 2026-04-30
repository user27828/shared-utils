import express from "express";
import request from "supertest";
import { jest, describe, test, expect } from "@jest/globals";

import { createCmsPublicRouter } from "../../src/cms/express/publicRouter.js";
import { createCmsUnlockTokenUtils } from "../../src/cms/unlockToken.js";
import { hashCmsPassword } from "../../../utils/src/cms/password.js";

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const buildApp = (service: Record<string, AsyncMock>) => {
  const app = express();
  app.use(express.json({ limit: "4kb" }));
  app.use(
    createCmsPublicRouter({
      service: service as any,
      unlockToken: createCmsUnlockTokenUtils({ signingKey: "test-secret" }),
      unlockTtlSeconds: 60,
    }),
  );
  return app;
};

describe("createCmsPublicRouter unlock tokens", () => {
  test("returns a bearer token string from the exported unlock token utility", async () => {
    const passwordHash = await hashCmsPassword("open sesame");
    const service = {
      getPublicHead: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          uid: "cms-1",
          post_type: "page",
          locale: "en",
          slug: "secret",
          status: "published",
          etag: "cms:cms-1:v1",
          password_hash: passwordHash,
          password_version: 1,
        }),
      getPublicPayloadBySlug: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          uid: "cms-1",
          post_type: "page",
          locale: "en",
          slug: "secret",
          title: "Secret",
          content_type: "text/plain",
          content: "Visible after unlock",
        }),
    };
    const app = buildApp(service);

    const unlockResponse = await request(app)
      .post("/page/en/secret/unlock")
      .send({ password: "open sesame" });

    expect(unlockResponse.status).toBe(200);
    expect(typeof unlockResponse.body.data.token).toBe("string");

    const getResponse = await request(app)
      .get("/page/en/secret")
      .set("Authorization", `Bearer ${unlockResponse.body.data.token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.uid).toBe("cms-1");
  });

  test("rejects invalid unlock tokens for protected content", async () => {
    const passwordHash = await hashCmsPassword("open sesame");
    const service = {
      getPublicHead: jest
        .fn<(...args: any[]) => Promise<any>>()
        .mockResolvedValue({
          uid: "cms-1",
          post_type: "page",
          locale: "en",
          slug: "secret",
          status: "published",
          etag: "cms:cms-1:v1",
          password_hash: passwordHash,
          password_version: 1,
        }),
      getPublicPayloadBySlug: jest.fn<(...args: any[]) => Promise<any>>(),
    };
    const app = buildApp(service);

    const response = await request(app)
      .get("/page/en/secret")
      .set("Authorization", "Bearer invalid-token");

    expect(response.status).toBe(401);
    expect(service.getPublicPayloadBySlug).not.toHaveBeenCalled();
  });
});
