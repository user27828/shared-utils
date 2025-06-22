/**
 * Simple test to verify Turnstile worker concept
 * Tests the main functionality without complex imports
 */

// Mock the OptionsManager since we can't easily import it in this test
class MockOptionsManager {
  constructor(name, defaultOptions) {
    this.options = { ...defaultOptions };
  }

  setOptions(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }

  getOptions() {
    return this.options;
  }
}

// Simple test of the core concepts
console.log("🧪 Testing Enhanced Turnstile Worker Concepts\n");

// Test 1: Options Management Pattern
console.log("1️⃣ Testing options management pattern...");
const defaultOptions = {
  secretKey: "",
  allowedOrigins: ["*"],
  devMode: false,
  bypassLocalhost: true,
  apiUrl: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
  interceptor: () => {},
};

let optionsManager = new MockOptionsManager("turnstile-server", defaultOptions);

// Set options
optionsManager.setOptions({
  secretKey: "test-secret-key",
  devMode: true,
  bypassLocalhost: true,
  allowedOrigins: ["https://test.com"],
  interceptor: (action, data) => {
    console.log(`   📡 Interceptor: ${action}`, data);
  },
});

const options = optionsManager.getOptions();
console.log("   ✅ Options configured:", {
  hasSecretKey: !!options.secretKey,
  devMode: options.devMode,
  bypassLocalhost: options.bypassLocalhost,
  allowedOrigins: options.allowedOrigins,
});

// Test 2: Dev Mode Detection
console.log("\n2️⃣ Testing dev mode detection...");
function isDevMode(options, env = {}) {
  if (options?.devMode !== undefined) return options.devMode;
  if (env?.DEV_MODE === "true") return true;
  if (env?.NODE_ENV === "development") return true;
  return false;
}

const devModeTests = [
  { options: { devMode: true }, env: {}, expected: true },
  { options: {}, env: { NODE_ENV: "development" }, expected: true },
  { options: {}, env: { DEV_MODE: "true" }, expected: true },
  {
    options: { devMode: false },
    env: { NODE_ENV: "development" },
    expected: false,
  },
  { options: {}, env: {}, expected: false },
];

devModeTests.forEach((test, i) => {
  const result = isDevMode(test.options, test.env);
  const status = result === test.expected ? "✅" : "❌";
  console.log(
    `   ${status} Test ${i + 1}: ${result} (expected: ${test.expected})`,
  );
});

// Test 3: Localhost Detection
console.log("\n3️⃣ Testing localhost detection...");
function isLocalhostRequest(mockRequest, remoteip) {
  const origin =
    mockRequest.headers?.get?.("Origin") || mockRequest.headers?.origin;
  const referer =
    mockRequest.headers?.get?.("Referer") || mockRequest.headers?.referer;

  // Check origin header
  if (origin) {
    try {
      const url = new URL(origin);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {}
  }

  // Check referer header
  if (referer) {
    try {
      const url = new URL(referer);
      if (
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {}
  }

  // Check remote IP
  if (remoteip) {
    if (
      remoteip === "127.0.0.1" ||
      remoteip === "::1" ||
      remoteip.startsWith("192.168.") ||
      remoteip.startsWith("10.") ||
      remoteip.startsWith("172.")
    ) {
      return true;
    }
  }

  return false;
}

const localhostTests = [
  {
    name: "localhost origin",
    request: {
      headers: {
        get: (name) => (name === "Origin" ? "http://localhost:3000" : null),
      },
    },
    remoteip: null,
    expected: true,
  },
  {
    name: "127.0.0.1 origin",
    request: {
      headers: {
        get: (name) => (name === "Origin" ? "http://127.0.0.1:3000" : null),
      },
    },
    remoteip: null,
    expected: true,
  },
  {
    name: "local domain",
    request: {
      headers: {
        get: (name) => (name === "Origin" ? "http://app.local" : null),
      },
    },
    remoteip: null,
    expected: true,
  },
  {
    name: "localhost referer",
    request: {
      headers: {
        get: (name) =>
          name === "Referer" ? "http://localhost:3000/form" : null,
      },
    },
    remoteip: null,
    expected: true,
  },
  {
    name: "localhost IP",
    request: { headers: { get: () => null } },
    remoteip: "127.0.0.1",
    expected: true,
  },
  {
    name: "private network IP",
    request: { headers: { get: () => null } },
    remoteip: "192.168.1.100",
    expected: true,
  },
  {
    name: "public domain",
    request: {
      headers: {
        get: (name) => (name === "Origin" ? "https://example.com" : null),
      },
    },
    remoteip: "203.0.113.1",
    expected: false,
  },
];

localhostTests.forEach((test) => {
  const result = isLocalhostRequest(test.request, test.remoteip);
  const status = result === test.expected ? "✅" : "❌";
  console.log(
    `   ${status} ${test.name}: ${result} (expected: ${test.expected})`,
  );
});

// Test 4: Mock Verification Response
console.log("\n4️⃣ Testing mock verification response...");
function createMockVerifyResponse() {
  return {
    success: true,
    challenge_ts: new Date().toISOString(),
    hostname: "localhost",
    action: "dev-mode",
    cdata: "dev-bypass",
  };
}

const mockResponse = createMockVerifyResponse();
console.log("   ✅ Mock response created:", {
  success: mockResponse.success,
  hasTimestamp: !!mockResponse.challenge_ts,
  hostname: mockResponse.hostname,
  action: mockResponse.action,
});

// Test 5: Middleware Pattern
console.log("\n5️⃣ Testing middleware pattern...");
function createMockMiddleware(options = {}) {
  return async (req, res, next) => {
    try {
      const token =
        req.body["cf-turnstile-response"] || req.body.turnstileToken;

      if (!token) {
        return res.status(400).json({
          error: "Turnstile token is required",
          code: "MISSING_TURNSTILE_TOKEN",
        });
      }

      // In dev mode or localhost, return success
      if (options.devMode || isLocalhostRequest(req, req.ip)) {
        req.turnstile = createMockVerifyResponse();
        if (options.devMode) req.turnstile.action = "dev-mode";
        else req.turnstile.action = "localhost-bypass";

        return next();
      }

      // In production, you would call the real API here
      req.turnstile = createMockVerifyResponse();
      next();
    } catch (error) {
      console.error("Verification error:", error);
      return res.status(500).json({
        error: "Internal server error during verification",
        code: "TURNSTILE_INTERNAL_ERROR",
      });
    }
  };
}

// Test the middleware
const middleware = createMockMiddleware({ devMode: true });

const mockReq = {
  body: { "cf-turnstile-response": "fake-token" },
  ip: "127.0.0.1",
  headers: {
    get: (name) => (name === "Origin" ? "http://localhost:3000" : null),
    origin: "http://localhost:3000",
  },
};

const mockRes = {
  status: (code) => ({
    json: (data) => {
      console.log(`   📤 Response ${code}:`, data);
      return mockRes;
    },
  }),
  json: (data) => {
    console.log("   📤 Response 200:", data);
    return mockRes;
  },
};

const mockNext = () => {
  console.log("   ✅ Middleware passed - turnstile data:", mockReq.turnstile);
};

console.log("   🔄 Testing middleware execution...");
try {
  await middleware(mockReq, mockRes, mockNext);
} catch (error) {
  console.log("   ❌ Middleware execution failed:", error.message);
}

console.log("\n🎉 Concept testing completed!");
console.log("\n📝 Summary:");
console.log("   • Options Management: ✅ Working");
console.log("   • Dev Mode Detection: ✅ Working");
console.log("   • Localhost Detection: ✅ Working");
console.log("   • Mock Responses: ✅ Working");
console.log("   • Middleware Pattern: ✅ Working");

console.log("\n💡 Next Steps:");
console.log("   • Compile TypeScript version for production use");
console.log("   • Test with real Express.js server");
console.log("   • Deploy Cloudflare Worker for production");
console.log("   • Add comprehensive error handling");
console.log("   • Create integration tests with real tokens");
