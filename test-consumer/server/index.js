#!/usr/bin/env node

/**
 * Server Test Consumer for @user27828/shared-utils
 *
 * This tests the server-side functionality in a proper Node.js environment,
 * complementing the browser-based tests in test-consumer/react-app.
 */

import { createServer } from "http";
import { runServerTests } from "./tests/server-integration-tests.js";

const PORT = process.env.PORT || 8030;

// Simple HTTP server for testing server-side functionality
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/health") {
    res.writeHead(200);
    res.end(
      JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
    );
    return;
  }

  if (req.url === "/test") {
    try {
      const testResults = await runServerTests();
      res.writeHead(200);
      res.end(JSON.stringify(testResults, null, 2));
    } catch (error) {
      res.writeHead(500);
      res.end(
        JSON.stringify({
          error: "Test execution failed",
          message: error.message,
          stack: error.stack,
        }),
      );
    }
    return;
  }

  // Default response
  res.writeHead(404);
  res.end(
    JSON.stringify({
      error: "Not found",
      availableEndpoints: ["/health", "/test"],
    }),
  );
});

server.listen(PORT, () => {
  console.log(`🚀 Server Test Consumer running on http://localhost:${PORT}`);
  console.log(`📋 Test endpoint: http://localhost:${PORT}/test`);
  console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  console.log(`\nRunning tests immediately...`);

  // Run tests on startup
  runServerTests()
    .then((results) => {
      console.log("\n=== SERVER TEST RESULTS ===");
      console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
      console.error("\n❌ Test execution failed:", error);
    });
});
