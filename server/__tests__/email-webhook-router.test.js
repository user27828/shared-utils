import crypto from "node:crypto";
import express from "express";
import { jest } from "@jest/globals";
import request from "supertest";

const loadRouterModules = async () => {
  jest.resetModules();

  const envModule = await import("../src/env.js");
  const routerModule = await import("../src/email/webhooks/router.js");

  return {
    env: envModule.default,
    ...routerModule,
  };
};

const createApp = (createWebhookRouter) => {
  const app = express();
  app.use("/webhooks", createWebhookRouter());
  return app;
};

const createMisconfiguredApp = (createWebhookRouter) => {
  const app = express();
  app.use(express.json());
  app.use("/webhooks", createWebhookRouter());
  return app;
};

describe("Email webhook router", () => {
  test("returns the provider challenge response", async () => {
    const { createWebhookRouter } = await loadRouterModules();
    const app = createApp(createWebhookRouter);

    const response = await request(app).get(
      "/webhooks/mailerlite?challenge=shared-router-check",
    );

    expect(response.status).toBe(200);
    expect(response.text).toBe("shared-router-check");
  });

  test("returns 500 when local webhook event processing fails", async () => {
    const { env, createWebhookRouter, registerWebhookHandlers } =
      await loadRouterModules();
    env.EMAIL_MAILERLITE_WEBHOOK_SECRET = "mailerlite-secret";

    const failingHandler = jest.fn().mockRejectedValue(new Error("boom"));
    registerWebhookHandlers({
      unsubscribe: failingHandler,
    });

    const app = createApp(createWebhookRouter);
    const payload = JSON.stringify({
      type: "subscriber.unsubscribed",
      email: "user@example.com",
      timestamp: "2026-04-24T12:00:00.000Z",
    });
    const signature = crypto
      .createHmac("sha256", "mailerlite-secret")
      .update(payload)
      .digest("hex");

    const response = await request(app)
      .post("/webhooks/mailerlite")
      .set("content-type", "application/json")
      .set("x-mailerlite-signature", signature)
      .send(payload);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      received: false,
      error: "boom",
    });
    expect(failingHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "unsubscribe",
        email: "user@example.com",
        provider: "mailerlite",
      }),
    );
  });

  test("returns a clear error when the raw body was consumed by earlier middleware", async () => {
    const { env, createWebhookRouter } = await loadRouterModules();
    env.EMAIL_MAILERLITE_WEBHOOK_SECRET = "mailerlite-secret";

    const app = createMisconfiguredApp(createWebhookRouter);
    const payload = JSON.stringify({
      type: "subscriber.unsubscribed",
      email: "user@example.com",
      timestamp: "2026-04-24T12:00:00.000Z",
    });
    const signature = crypto
      .createHmac("sha256", "mailerlite-secret")
      .update(payload)
      .digest("hex");

    const response = await request(app)
      .post("/webhooks/mailerlite")
      .set("content-type", "application/json")
      .set("x-mailerlite-signature", signature)
      .send(payload);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      received: false,
      error:
        "Webhook raw body unavailable. Mount createWebhookRouter() before JSON/body parsers.",
    });
  });
});
