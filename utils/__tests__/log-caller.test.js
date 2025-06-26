/**
 * Tests for the Log utility's caller information feature
 * @jest-environment node
 */

import { log } from "../../dist/utils/index.js";

describe("Log Utility - Caller Information", () => {
  let consoleSpy;
  let originalShowCaller;

  beforeEach(() => {
    // Store original showCaller setting
    originalShowCaller = log.getOptions().showCaller;

    // Spy on console methods to capture output
    consoleSpy = {
      log: jest.spyOn(console, "log").mockImplementation(),
      info: jest.spyOn(console, "info").mockImplementation(),
      warn: jest.spyOn(console, "warn").mockImplementation(),
      error: jest.spyOn(console, "error").mockImplementation(),
      debug: jest.spyOn(console, "debug").mockImplementation(),
    };

    // Configure log utility for testing
    log.setOptions({
      type: "server",
      showCaller: true,
      server: {
        production: ["log", "info", "warn", "error", "debug"], // Allow all levels
      },
    });
  });

  afterEach(() => {
    // Restore original settings
    log.setOptions({ showCaller: originalShowCaller });
    jest.restoreAllMocks();
  });

  describe("showCaller option", () => {
    it("should include caller filename when showCaller is enabled", () => {
      function testFunction() {
        log.log("Test message from function");
      }

      testFunction();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Test message from function",
      );
    });

    it("should not include caller filename when showCaller is disabled", () => {
      log.setOptions({ showCaller: false });

      log.log("Test message without caller");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        "Test message without caller",
      );
      expect(consoleSpy.log).not.toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Test message without caller",
      );
    });

    it("should work with different log levels", () => {
      function testAllLevels() {
        log.log("Log message");
        log.info("Info message");
        log.warn("Warn message");
        log.error("Error message");
        log.debug("Debug message");
      }

      testAllLevels();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Log message",
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Info message",
      );
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Warn message",
      );
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Error message",
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Debug message",
      );
    });

    it("should work from different function contexts", () => {
      function firstFunction() {
        log.log("Message from first function");
      }

      function secondFunction() {
        log.info("Message from second function");
      }

      firstFunction();
      secondFunction();

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Message from first function",
      );
      expect(consoleSpy.info).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Message from second function",
      );
    });

    it("should handle direct calls correctly", () => {
      log.log("Direct call message");
      log.debug("Direct debug message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Direct call message",
      );
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Direct debug message",
      );
    });

    it("should dynamically toggle caller information", () => {
      // Start with showCaller enabled
      log.log("Message with caller");

      // Disable showCaller
      log.setOptions({ showCaller: false });
      log.log("Message without caller");

      // Re-enable showCaller
      log.setOptions({ showCaller: true });
      log.log("Message with caller again");

      expect(consoleSpy.log).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("[log-caller.test.js]"),
        "Message with caller",
      );
      expect(consoleSpy.log).toHaveBeenNthCalledWith(
        2,
        "Message without caller",
      );
      expect(consoleSpy.log).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("[log-caller.test.js]"),
        "Message with caller again",
      );
    });
  });

  describe("caller filename extraction", () => {
    it("should extract filename without path", () => {
      log.log("Test filename extraction");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Test filename extraction",
      );
      // Should not contain full path
      expect(consoleSpy.log).not.toHaveBeenCalledWith(
        expect.stringContaining("/__tests__/log-caller.test.js"),
        "Test filename extraction",
      );
    });

    it("should handle edge cases gracefully", () => {
      // Test with very long message
      const longMessage = "A".repeat(1000);
      log.log(longMessage);

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        longMessage,
      );
    });
  });

  describe("integration with existing functionality", () => {
    it("should work correctly with different environment types", () => {
      // Test server type
      log.setOptions({ type: "server", showCaller: true });
      log.log("Server message");

      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining("[log-caller.test.js]"),
        "Server message",
      );
    });

    it("should preserve other configuration options", () => {
      const originalOptions = log.getOptions();

      log.setOptions({ showCaller: true });
      const newOptions = log.getOptions();

      // showCaller should be updated
      expect(newOptions.showCaller).toBe(true);

      // Other options should be preserved
      expect(newOptions.type).toBe(originalOptions.type);
      expect(newOptions.server).toEqual(originalOptions.server);
    });
  });
});
