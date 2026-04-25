import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { jest } from "@jest/globals";

import { log } from "../../dist/utils/index.js";
import { EmailError, EmailProviderError } from "../src/email/errors.js";
import { formatEmailAddress } from "../src/email/address.js";
import { formatHierarchicalLog } from "../src/email/logFormat.js";
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
  for (const key of GMAIL_ENV_KEYS) {
    const value = snapshot[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

describe("Email providers", () => {
  let envSnapshot;
  let originalShowCaller;
  let originalType;
  let originalServerProduction;
  let logInterceptor;

  beforeEach(() => {
    envSnapshot = Object.fromEntries(
      GMAIL_ENV_KEYS.map((key) => [key, process.env[key]]),
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
    ).toBe('"Sender \\"Name\\"" <sender@example.com>');

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
