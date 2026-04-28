import turnstile, { Turnstile } from "../src/turnstile.js";

describe("turnstile browser helper", () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  let mockRender;
  let mockExecute;
  let mockGetResponse;
  let mockReset;
  let mockRemove;
  let mockIsExpired;
  let mockContainer;
  let scriptElement;
  let headAppendChild;
  let querySelector;
  let createElement;

  const installWindowTurnstile = () => {
    global.window.turnstile = {
      render: mockRender,
      execute: mockExecute,
      getResponse: mockGetResponse,
      reset: mockReset,
      remove: mockRemove,
      isExpired: mockIsExpired,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockRender = jest.fn(() => "widget-1");
    mockExecute = jest.fn();
    mockGetResponse = jest.fn(() => "token-1");
    mockReset = jest.fn();
    mockRemove = jest.fn();
    mockIsExpired = jest.fn(() => false);

    mockContainer = { id: "turnstile-container" };
    scriptElement = {
      src: "",
      defer: false,
      onload: null,
      onerror: null,
    };

    headAppendChild = jest.fn((node) => node);
    querySelector = jest.fn(() => null);
    createElement = jest.fn((tagName) => {
      if (tagName === "script") {
        return scriptElement;
      }

      return { tagName };
    });

    global.window = {};
    global.document = {
      head: {
        appendChild: headAppendChild,
      },
      querySelector,
      createElement,
    };

    installWindowTurnstile();
    turnstile.resetOptions();
    turnstile.cleanup();
  });

  afterEach(() => {
    turnstile.resetOptions();
    turnstile.cleanup();

    if (typeof originalWindow === "undefined") {
      Reflect.deleteProperty(global, "window");
    } else {
      global.window = originalWindow;
    }

    if (typeof originalDocument === "undefined") {
      Reflect.deleteProperty(global, "document");
    } else {
      global.document = originalDocument;
    }
  });

  it("loads the explicit Turnstile script", async () => {
    delete global.window.turnstile;

    headAppendChild.mockImplementation((node) => {
      installWindowTurnstile();
      node.onload();
      return node;
    });

    await turnstile.loadScript();

    expect(headAppendChild).toHaveBeenCalledTimes(1);
    expect(scriptElement.src).toBe(
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    );
    expect(scriptElement.defer).toBe(true);
  });

  it("renders with merged global and per-call options", async () => {
    turnstile.setOptions({
      siteKey: "site-key",
      widget: {
        theme: "dark",
        size: "flexible",
      },
    });

    const callback = jest.fn();
    const widgetId = await turnstile.render(mockContainer, {
      action: "contact-form",
      callback,
      theme: "light",
    });

    expect(widgetId).toBe("widget-1");
    expect(mockRender).toHaveBeenCalledWith(mockContainer, {
      sitekey: "site-key",
      theme: "light",
      size: "flexible",
      execution: "render",
      appearance: "always",
      retry: "auto",
      "retry-interval": 8000,
      "refresh-expired": "auto",
      "refresh-timeout": "auto",
      "response-field": true,
      "response-field-name": "cf-turnstile-response",
      "feedback-enabled": true,
      action: "contact-form",
      callback,
    });
  });

  it("throws when siteKey is missing", async () => {
    await expect(turnstile.render(mockContainer)).rejects.toThrow(
      'Site key is required. Call turnstile.setOptions({ siteKey: "your-key" }) first.',
    );
  });

  it("proxies widget operations and tracks active widgets", async () => {
    turnstile.setOptions({ siteKey: "site-key" });
    const widgetId = await turnstile.render(mockContainer);

    turnstile.execute(widgetId);
    expect(mockExecute).toHaveBeenCalledWith(widgetId);

    expect(turnstile.getResponse(widgetId)).toBe("token-1");
    expect(mockGetResponse).toHaveBeenCalledWith(widgetId);

    turnstile.reset(widgetId);
    expect(mockReset).toHaveBeenCalledWith(widgetId);

    expect(turnstile.isExpired(widgetId)).toBe(false);
    expect(mockIsExpired).toHaveBeenCalledWith(widgetId);

    expect(turnstile.getActiveWidgets()).toEqual(["widget-1"]);

    turnstile.remove(widgetId);
    expect(mockRemove).toHaveBeenCalledWith(widgetId);
    expect(turnstile.getActiveWidgets()).toEqual([]);
  });

  it("removes all tracked widgets during cleanup", async () => {
    turnstile.setOptions({ siteKey: "site-key" });
    mockRender.mockReturnValueOnce("widget-1").mockReturnValueOnce("widget-2");

    await turnstile.render(mockContainer);
    await turnstile.render(mockContainer);

    turnstile.removeAll();

    expect(mockRemove).toHaveBeenCalledWith("widget-1");
    expect(mockRemove).toHaveBeenCalledWith("widget-2");
    expect(turnstile.getActiveWidgets()).toEqual([]);
  });

  it("creates independent instances", async () => {
    const instanceA = new Turnstile();
    const instanceB = new Turnstile();

    instanceA.setOptions({ siteKey: "key-a" });
    instanceB.setOptions({ siteKey: "key-b" });

    await instanceA.render(mockContainer);
    await instanceB.render(mockContainer);

    expect(mockRender.mock.calls[0][1].sitekey).toBe("key-a");
    expect(mockRender.mock.calls[1][1].sitekey).toBe("key-b");
  });

  it("throws helpful errors outside the browser", async () => {
    Reflect.deleteProperty(global, "window");
    Reflect.deleteProperty(global, "document");

    try {
      const serverTurnstile = new Turnstile();
      serverTurnstile.setOptions({ siteKey: "site-key" });

      await expect(serverTurnstile.loadScript()).rejects.toThrow(
        "Turnstile widget rendering requires a browser environment",
      );
      await expect(
        serverTurnstile.render("#turnstile-container"),
      ).rejects.toThrow(
        "Turnstile widget rendering requires a browser environment",
      );
    } finally {
      global.window = {};
      global.document = {
        head: {
          appendChild: headAppendChild,
        },
        querySelector,
        createElement,
      };
      installWindowTurnstile();
    }
  });
});
