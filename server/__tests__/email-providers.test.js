import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";

import { log } from "../../dist/utils/index.js";
import { EmailError, EmailProviderError } from "../src/email/errors.js";
import { formatEmailAddress } from "../src/email/address.js";
import { formatHierarchicalLog } from "../src/email/logFormat.js";
import {
  CloudflareEmailProvider,
  isConfigured as isCloudflareProviderConfigured,
} from "../src/email/providers/cloudflare.js";
import {
  GmailEmailProvider,
  isConfigured as isGmailProviderConfigured,
} from "../src/email/providers/gmail.js";
import { SesEmailProvider } from "../src/email/providers/ses.js";
import { TestEmailProvider } from "../src/email/providers/_test_.js";

const GMAIL_ENV_KEYS = [
  "EMAIL_GMAIL_ENABLED",
  "EMAIL_GMAIL_AUTH_MODE",
  "EMAIL_DEFAULT_FROM",
  "EMAIL_GMAIL_OAUTH_CLIENT_ID",
  "EMAIL_GMAIL_OAUTH_CLIENT_SECRET",
  "EMAIL_GMAIL_OAUTH_REFRESH_TOKEN",
  "EMAIL_GMAIL_SMTP_USER",
  "EMAIL_GMAIL_SMTP_APP_PASSWORD",
];

const CLOUDFLARE_ENV_KEYS = [
  "EMAIL_CLOUDFLARE_ENABLED",
  "EMAIL_CLOUDFLARE_ACCOUNT_ID",
  "EMAIL_CLOUDFLARE_ZONE_ID",
  "EMAIL_CLOUDFLARE_API_TOKEN",
  "EMAIL_CLOUDFLARE_BASE_URL",
  "EMAIL_CLOUDFLARE_TIMEOUT_MS",
];

const EMAIL_PROVIDER_ENV_KEYS = [...GMAIL_ENV_KEYS, ...CLOUDFLARE_ENV_KEYS];

const createMessage = (overrides = {}) => {
  return {
    from: {
      email: "sender@example.com",
      name: "Sender",
    },
    to: [
      {
        email: "recipient@example.com",
        name: "Recipient",
      },
    ],
    subject: "Provider regression test",
    text: "Body",
    ...overrides,
  };
};

const restoreEnv = (snapshot) => {
  for (const key of EMAIL_PROVIDER_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const createCloudflareResponse = (status, body, statusText = "OK") => {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
};

const createCloudflareRuntime = (overrides = {}) => {
  const fetch = overrides.fetch || jest.fn();
  const requestWithTimeout =
    overrides.requestWithTimeout ||
    jest.fn(async (_operationName, request) => {
      return request(new AbortController().signal);
    });

  return {
    fetch,
    requestWithTimeout,
  };
};

describe("Email providers", () => {
  let envSnapshot;
  let originalShowCaller;
  let originalType;
  let originalServerProduction;
  let logInterceptor;

  beforeEach(() => {
    envSnapshot = Object.fromEntries(
      EMAIL_PROVIDER_ENV_KEYS.map((key) => [key, process.env[key]]),
    );

    originalShowCaller = log.getOptions().showCaller;
    originalType = log.getOptions().type;
    originalServerProduction = [...(log.getOptions().server.production || [])];

    log.setOptions({
      type: "server",
      showCaller: true,
      server: {
        production: ["log", "info", "warn", "error", "debug"],
      },
    });
  });

  afterEach(() => {
    if (logInterceptor) {
      log.removeInterceptor(logInterceptor);
      logInterceptor = undefined;
    }

    log.setOptions({
      type: originalType,
      showCaller: originalShowCaller,
      server: {
        production: originalServerProduction,
      },
    });

    restoreEnv(envSnapshot);
    jest.restoreAllMocks();
  });

  test("formatEmailAddress trims, escapes, and validates addresses", () => {
    expect(
      formatEmailAddress({
        email: " sender@example.com ",
        name: ' Sender "Name" ',
      }),
    ).toBe('"Sender \\\"Name\\\"" <sender@example.com>');

    expect(() => {
      formatEmailAddress({
        email: "sender@example.com\r\nBCC:evil@example.com",
      });
    }).toThrow(EmailError);

    expect(() => {
      formatEmailAddress({
        email: "sender@example.com",
        name: "Sender\nName",
      });
    }).toThrow("cannot contain control characters");
  });

  test("Gmail OAuth2 uses senderEmail consistently", async () => {
    process.env.EMAIL_GMAIL_ENABLED = "true";
    process.env.EMAIL_GMAIL_AUTH_MODE = "oauth2";
    process.env.EMAIL_DEFAULT_FROM = "Shared Utils <sender@example.com>";
    process.env.EMAIL_GMAIL_OAUTH_CLIENT_ID = "client-id";
    process.env.EMAIL_GMAIL_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.EMAIL_GMAIL_OAUTH_REFRESH_TOKEN = "refresh-token";

    expect(isGmailProviderConfigured()).toBe(true);

    process.env.EMAIL_DEFAULT_FROM = "not-an-email";
    expect(isGmailProviderConfigured()).toBe(false);

    process.env.EMAIL_DEFAULT_FROM = "Shared Utils <sender@example.com>";

    const verify = jest.fn().mockResolvedValue(undefined);
    const createTransport = jest.fn().mockReturnValue({
      verify,
      sendMail: jest.fn(),
      close: jest.fn(),
    });

    const provider = new GmailEmailProvider(
      {
        enabled: true,
        authMode: "oauth2",
        senderEmail: "oauth-user@example.com",
        smtp: {
          user: "smtp-user@example.com",
          appPassword: "unused",
        },
        oauth2: {
          clientId: "client-id",
          clientSecret: "client-secret",
          refreshToken: "refresh-token",
        },
      },
      { createTransport },
    );

    await provider.initialize();

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({
          user: "oauth-user@example.com",
        }),
      }),
    );
    expect(verify).toHaveBeenCalledTimes(1);
  });

  test("Cloudflare provider env detection requires enabled flag and credentials", () => {
    process.env.EMAIL_CLOUDFLARE_ENABLED = "true";
    process.env.EMAIL_CLOUDFLARE_ACCOUNT_ID = "acct-123";
    process.env.EMAIL_CLOUDFLARE_API_TOKEN = "token-123";

    expect(isCloudflareProviderConfigured()).toBe(false);

    process.env.EMAIL_CLOUDFLARE_ZONE_ID = "zone-123";

    expect(isCloudflareProviderConfigured()).toBe(true);

    process.env.EMAIL_CLOUDFLARE_ZONE_ID = "   ";

    expect(isCloudflareProviderConfigured()).toBe(false);
  });

  test("formatHierarchicalLog produces a single multiline logger event", () => {
    const interceptor = jest.fn();
    const expectedMessage =
      "EmailProviders: Formatted event\n  + messageId: gmail-message-id, subject: 'Provider regression test'";

    logInterceptor = interceptor;
    log.addInterceptor(interceptor);

    const message = formatHierarchicalLog("EmailProviders: Formatted event", [
      "messageId: gmail-message-id, subject: 'Provider regression test'",
    ]);

    log.info(message);

    expect(message).toBe(expectedMessage);
    expect(interceptor).toHaveBeenCalledTimes(1);
    expect(interceptor).toHaveBeenCalledWith("info", [expectedMessage]);
  });

  test("Gmail send logging stays on the provider call site", async () => {
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const sendMail = jest.fn().mockResolvedValue({
      messageId: "gmail-message-id",
      accepted: ["recipient@example.com"],
      rejected: [],
      response: "250 OK",
    });

    const provider = new GmailEmailProvider(
      {
        enabled: true,
        authMode: "smtp",
        smtp: {
          user: "smtp-user@example.com",
          appPassword: "app-password",
        },
      },
      { createTransport: jest.fn() },
    );

    provider.initialized = true;
    provider.transporter = { sendMail };

    await provider.send(createMessage());

    const expectedMessage =
      "GmailProvider: Email sent\n  + messageId: gmail-message-id, subject: 'Provider regression test'";

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining("[gmail.ts]"),
      expectedMessage,
    );
  });

  test("TestEmailProvider fails when persistence fails", async () => {
    const writeFileSpy = jest
      .spyOn(fs, "writeFile")
      .mockRejectedValueOnce(new Error("disk full"));

    const provider = new TestEmailProvider({
      enabled: true,
      outputDir: path.join(
        os.tmpdir(),
        `shared-utils-email-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ),
    });

    await expect(provider.send(createMessage())).rejects.toBeInstanceOf(
      EmailProviderError,
    );

    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(provider.getSentCount()).toBe(0);
    expect(provider.getLastEmail()).toBeUndefined();
  });

  test("CloudflareEmailProvider maps the documented REST payload", async () => {
    const runtime = createCloudflareRuntime({
      fetch: jest.fn().mockResolvedValue(
        createCloudflareResponse(200, {
          success: true,
          errors: [],
          messages: [],
          result: {
            delivered: ["recipient@example.com"],
            permanent_bounces: [],
            queued: [],
          },
        }),
      ),
    });

    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
        timeoutMs: 2500,
      },
      runtime,
    );

    const result = await provider.send(
      createMessage({
        html: "<h1>Hello</h1>",
        cc: [{ email: "cc@example.com", name: "CC Recipient" }],
        bcc: [{ email: "bcc@example.com", name: "BCC Recipient" }],
        replyTo: { email: "support@example.com", name: "Support" },
        headers: {
          "X-Campaign-ID": "weekly-digest",
        },
        attachments: [
          {
            filename: "invoice.pdf",
            content: Buffer.from("invoice-body", "utf8"),
            contentType: "application/pdf",
            disposition: "attachment",
          },
        ],
        priority: "high",
        inReplyTo: "<thread-root@example.com>",
        references: ["<thread-root@example.com>", "<thread-mid@example.com>"],
      }),
    );

    expect(runtime.requestWithTimeout).toHaveBeenCalledWith(
      "Cloudflare send",
      expect.any(Function),
      2500,
    );
    expect(runtime.fetch).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/acct-123/email/sending/send",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
      }),
    );

    const payload = JSON.parse(runtime.fetch.mock.calls[0][1].body);
    expect(payload).toEqual(
      expect.objectContaining({
        from: '"Sender" <sender@example.com>',
        to: ['"Recipient" <recipient@example.com>'],
        cc: ['"CC Recipient" <cc@example.com>'],
        bcc: ['"BCC Recipient" <bcc@example.com>'],
        reply_to: '"Support" <support@example.com>',
        subject: "Provider regression test",
        text: "Body",
        html: "<h1>Hello</h1>",
      }),
    );
    expect(payload.attachments).toEqual([
      {
        content: Buffer.from("invoice-body", "utf8").toString("base64"),
        filename: "invoice.pdf",
        type: "application/pdf",
        disposition: "attachment",
      },
    ]);
    expect(payload.headers).toEqual(
      expect.objectContaining({
        "X-Campaign-ID": "weekly-digest",
        "In-Reply-To": "<thread-root@example.com>",
        References: "<thread-root@example.com> <thread-mid@example.com>",
        Importance: "high",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        provider: "cloudflare",
        providerResponse: expect.objectContaining({
          result: expect.objectContaining({
            delivered: ["recipient@example.com"],
          }),
        }),
      }),
    );
  });

  test("CloudflareEmailProvider fails initialization before network when config is incomplete", async () => {
    const runtime = createCloudflareRuntime();
    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "",
        apiToken: "token-123",
      },
      runtime,
    );

    await expect(provider.initialize()).rejects.toBeInstanceOf(
      EmailProviderError,
    );
    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  test("CloudflareEmailProvider rejects recipient overflow locally", async () => {
    const runtime = createCloudflareRuntime();
    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    await expect(
      provider.send(
        createMessage({
          to: Array.from({ length: 51 }, (_, index) => {
            return {
              email: `recipient-${index}@example.com`,
            };
          }),
        }),
      ),
    ).rejects.toThrow("50 recipients");

    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  test("CloudflareEmailProvider rejects oversized messages locally", async () => {
    const runtime = createCloudflareRuntime();
    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    await expect(
      provider.send(
        createMessage({
          html: "<p>Body</p>",
          attachments: [
            {
              filename: "large.txt",
              content: "a".repeat(5 * 1024 * 1024),
              contentType: "text/plain",
            },
          ],
        }),
      ),
    ).rejects.toThrow("5 MiB");

    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  test("CloudflareEmailProvider rejects disallowed headers locally", async () => {
    const runtime = createCloudflareRuntime();
    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    await expect(
      provider.send(
        createMessage({
          headers: {
            "Message-ID": "<manual@example.com>",
          },
        }),
      ),
    ).rejects.toThrow("platform-controlled");

    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  test("CloudflareEmailProvider rejects messages without html or text", async () => {
    const runtime = createCloudflareRuntime();
    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    await expect(
      provider.send(
        createMessage({
          html: undefined,
          text: undefined,
        }),
      ),
    ).rejects.toThrow("html or text");

    expect(runtime.fetch).not.toHaveBeenCalled();
  });

  test("CloudflareEmailProvider translates timeout failures into retryable provider errors", async () => {
    const runtime = createCloudflareRuntime({
      requestWithTimeout: jest
        .fn()
        .mockRejectedValue(new Error("Cloudflare send timed out after 5000ms")),
    });

    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    try {
      await provider.send(createMessage({ html: "<p>Body</p>" }));
      throw new Error("Expected Cloudflare send to fail");
    } catch (err) {
      expect(err).toBeInstanceOf(EmailProviderError);
      expect(err.provider).toBe("cloudflare");
      expect(err.retryable).toBe(true);
      expect(err.context).toEqual(
        expect.objectContaining({
          operation: "send",
        }),
      );
    }
  });

  test("CloudflareEmailProvider translates API errors with provider context", async () => {
    const runtime = createCloudflareRuntime({
      fetch: jest.fn().mockResolvedValue(
        createCloudflareResponse(
          429,
          {
            success: false,
            errors: [
              {
                code: 10004,
                message: "email.sending.error.throttled",
              },
            ],
            messages: [],
            result: null,
          },
          "Too Many Requests",
        ),
      ),
    });

    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    try {
      await provider.send(createMessage({ html: "<p>Body</p>" }));
      throw new Error("Expected Cloudflare API rejection");
    } catch (err) {
      expect(err).toBeInstanceOf(EmailProviderError);
      expect(err.provider).toBe("cloudflare");
      expect(err.providerCode).toBe("10004");
      expect(err.retryable).toBe(true);
      expect(err.context).toEqual(
        expect.objectContaining({
          operation: "send",
          httpStatus: 429,
        }),
      );
    }
  });

  test("CloudflareEmailProvider healthCheck uses the read-only subdomain probe", async () => {
    const runtime = createCloudflareRuntime({
      fetch: jest.fn().mockResolvedValue(
        createCloudflareResponse(200, {
          success: true,
          errors: [],
          messages: [],
          result: {
            subdomains: [],
          },
        }),
      ),
    });

    const provider = new CloudflareEmailProvider(
      {
        enabled: true,
        accountId: "acct-123",
        zoneId: "zone-123",
        apiToken: "token-123",
      },
      runtime,
    );

    const health = await provider.healthCheck();

    expect(health).toEqual(
      expect.objectContaining({
        provider: "cloudflare",
        healthy: true,
      }),
    );
    expect(runtime.requestWithTimeout).toHaveBeenCalledWith(
      "Cloudflare health check",
      expect.any(Function),
      undefined,
    );
    expect(runtime.fetch).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/zones/zone-123/email/sending/subdomains",
      expect.objectContaining({
        method: "GET",
      }),
    );
    expect(runtime.fetch.mock.calls[0][0]).not.toContain("/accounts/");
  });

  test("SesEmailProvider validates recipient addresses before dispatch", async () => {
    const send = jest.fn().mockResolvedValue({ MessageId: "ses-message-id" });

    class FakeSESv2Client {
      async send(command) {
        return send(command);
      }

      destroy() {}
    }

    class FakeSendEmailCommand {
      constructor(input) {
        this.input = input;
      }
    }

    class FakeGetAccountCommand {
      constructor(input) {
        this.input = input;
      }
    }

    const provider = new SesEmailProvider(
      {
        enabled: true,
        region: "us-east-1",
      },
      {
        SESv2Client: FakeSESv2Client,
        SendEmailCommand: FakeSendEmailCommand,
        GetAccountCommand: FakeGetAccountCommand,
      },
    );

    await expect(
      provider.send(
        createMessage({
          to: [{ email: "recipient@example.com\r\nBCC:evil@example.com" }],
        }),
      ),
    ).rejects.toThrow("cannot contain control characters");

    expect(send).not.toHaveBeenCalled();
  });
});
