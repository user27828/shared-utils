import { jest } from "@jest/globals";

const createJsonResponse = (body, init = {}) => {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
    text: async () => JSON.stringify(body),
  };
};

describe("Email marketing", () => {
  let marketing;

  beforeAll(async () => {
    marketing = await import("../src/email/marketing.js");
  });

  beforeEach(() => {
    global.fetch.mockClear();
  });

  test("syncMarketingSubscriptions uses MailerLite REST endpoints for subscribe flow", async () => {
    global.fetch
      .mockResolvedValueOnce(
        createJsonResponse({
          data: [{ id: "group-general", name: "agentm-general" }],
          meta: { last_page: 1 },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: { id: "group-vip", name: "agentm-vip" },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: { id: "subscriber-1" },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({}))
      .mockResolvedValueOnce(createJsonResponse({}));

    const result = await marketing.syncMarketingSubscriptions({
      email: "user@example.com",
      subscribed: true,
      audienceKeys: ["vip"],
      providers: {
        mailerlite: {
          enabled: true,
          apiKey: "mailerlite-api-key",
        },
      },
      settings: {
        namespace: "agentm",
        generalAudienceKey: "general",
        sesContactListName: "agentm-newsletter",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        enabledProviders: ["mailerlite"],
      }),
    );

    expect(global.fetch).toHaveBeenCalledTimes(5);

    const [listUrl, listOptions] = global.fetch.mock.calls[0];
    expect(listUrl).toBe(
      "https://connect.mailerlite.com/api/groups?limit=100&page=1&sort=name",
    );
    expect(listOptions).toEqual(
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Bearer mailerlite-api-key",
        }),
      }),
    );

    const [createGroupUrl, createGroupOptions] = global.fetch.mock.calls[1];
    expect(createGroupUrl).toBe("https://connect.mailerlite.com/api/groups");
    expect(JSON.parse(createGroupOptions.body)).toEqual({
      name: "agentm-vip",
    });

    const [subscriberUrl, subscriberOptions] = global.fetch.mock.calls[2];
    expect(subscriberUrl).toBe(
      "https://connect.mailerlite.com/api/subscribers",
    );
    expect(JSON.parse(subscriberOptions.body)).toEqual(
      expect.objectContaining({
        email: "user@example.com",
        status: "active",
        groups: ["group-general", "group-vip"],
        subscribed_at: expect.any(String),
        opted_in_at: expect.any(String),
      }),
    );

    expect(global.fetch.mock.calls[3]).toEqual([
      "https://connect.mailerlite.com/api/subscribers/subscriber-1/groups/group-general",
      expect.objectContaining({ method: "POST" }),
    ]);
    expect(global.fetch.mock.calls[4]).toEqual([
      "https://connect.mailerlite.com/api/subscribers/subscriber-1/groups/group-vip",
      expect.objectContaining({ method: "POST" }),
    ]);
  });

  test("syncMarketingSubscriptions unsubscribes MailerLite subscriber from managed groups", async () => {
    global.fetch
      .mockResolvedValueOnce(
        createJsonResponse({
          data: [
            { id: "group-general", name: "agentm-general" },
            { id: "group-vip", name: "agentm-vip" },
          ],
          meta: { last_page: 1 },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: { id: "subscriber-1" },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({}))
      .mockResolvedValueOnce(createJsonResponse({}));

    const result = await marketing.syncMarketingSubscriptions({
      email: "user@example.com",
      subscribed: false,
      audienceKeys: ["vip"],
      providers: {
        mailerlite: {
          enabled: true,
          apiKey: "mailerlite-api-key",
        },
      },
      settings: {
        namespace: "agentm",
        generalAudienceKey: "general",
        sesContactListName: "agentm-newsletter",
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        enabledProviders: ["mailerlite"],
      }),
    );

    expect(global.fetch).toHaveBeenCalledTimes(4);

    const [subscriberUrl, subscriberOptions] = global.fetch.mock.calls[1];
    expect(subscriberUrl).toBe(
      "https://connect.mailerlite.com/api/subscribers",
    );
    expect(JSON.parse(subscriberOptions.body)).toEqual(
      expect.objectContaining({
        email: "user@example.com",
        status: "unsubscribed",
        unsubscribed_at: expect.any(String),
      }),
    );
    expect(JSON.parse(subscriberOptions.body).groups).toBeUndefined();

    expect(global.fetch.mock.calls[2]).toEqual([
      "https://connect.mailerlite.com/api/subscribers/subscriber-1/groups/group-general",
      expect.objectContaining({ method: "DELETE" }),
    ]);
    expect(global.fetch.mock.calls[3]).toEqual([
      "https://connect.mailerlite.com/api/subscribers/subscriber-1/groups/group-vip",
      expect.objectContaining({ method: "DELETE" }),
    ]);
  });

  test("syncMarketingSubscriptions reports MailerLite group sync failures", async () => {
    global.fetch
      .mockResolvedValueOnce(
        createJsonResponse({
          data: [
            { id: "group-general", name: "agentm-general" },
            { id: "group-vip", name: "agentm-vip" },
          ],
          meta: { last_page: 1 },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          data: { id: "subscriber-1" },
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({}))
      .mockResolvedValueOnce(
        createJsonResponse(
          { message: "group assignment failed" },
          {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          },
        ),
      );

    const result = await marketing.syncMarketingSubscriptions({
      email: "user@example.com",
      subscribed: true,
      audienceKeys: ["vip"],
      providers: {
        mailerlite: {
          enabled: true,
          apiKey: "mailerlite-api-key",
        },
      },
      settings: {
        namespace: "agentm",
        generalAudienceKey: "general",
        sesContactListName: "agentm-newsletter",
      },
    });

    expect(result.success).toBe(false);
    expect(result.results).toEqual([
      expect.objectContaining({
        provider: "mailerlite",
        success: false,
        error: expect.stringContaining("group assignment failed"),
      }),
    ]);
  });

  test("syncMarketingSubscriptions does not treat generic Resend 422 responses as duplicates", async () => {
    global.fetch.mockResolvedValueOnce(
      createJsonResponse(
        { message: "validation failed" },
        {
          ok: false,
          status: 422,
          statusText: "Unprocessable Entity",
        },
      ),
    );

    const result = await marketing.syncMarketingSubscriptions({
      email: "user@example.com",
      subscribed: false,
      providers: {
        resend: {
          enabled: true,
          apiKey: "resend-api-key",
        },
      },
      settings: {
        namespace: "agentm",
        generalAudienceKey: "general",
        sesContactListName: "agentm-newsletter",
      },
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.results).toEqual([
      expect.objectContaining({
        provider: "resend",
        success: false,
        error: "validation failed",
      }),
    ]);
  });
});
