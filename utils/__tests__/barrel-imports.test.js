/**
 * Tests for utils barrel file exports (index.js/index.d.ts)
 * @jest-environment node
 */

import * as utils from "../../dist/utils/index.js";
import { log, Log } from "../../dist/utils/index.js";

describe("Utils Barrel Exports", () => {
  describe("ES Module Imports", () => {
    it("should export log and Log from barrel file", () => {
      expect(utils).toHaveProperty("log");
      expect(utils).toHaveProperty("Log");
      expect(typeof utils.Log).toBe("function");
      expect(typeof utils.log).toBe("object");
    });

    it("should allow destructured imports", () => {
      expect(typeof Log).toBe("function");
      expect(typeof log).toBe("object");
      expect(typeof log.info).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.error).toBe("function");
    });

    it("should maintain method binding in destructured imports", () => {
      // Mock console to test binding
      const consoleSpy = jest.spyOn(console, "info").mockImplementation();

      // Set development mode to ensure logging happens
      process.env.NODE_ENV = "development";
      log.setOptions({
        type: "server",
        showCaller: false, // Disable caller info for this test
        server: { production: ["log", "info", "warn", "error"] },
      });

      const { info } = log;
      info("test message");

      expect(consoleSpy).toHaveBeenCalledWith("test message");

      consoleSpy.mockRestore();
    });

    it("should export a singleton log instance", async () => {
      const utils1 = await import("../../dist/utils/index.js");
      const utils2 = await import("../../dist/utils/index.js");

      expect(utils1.log).toBe(utils2.log);
    });
  });

  describe("Dynamic Import Tests", () => {
    it("should support dynamic import syntax", async () => {
      // Use dynamic import to test ES6 module syntax
      const utils = await import("../../dist/utils/index.js");

      expect(utils).toHaveProperty("log");
      expect(utils).toHaveProperty("Log");
      expect(typeof utils.Log).toBe("function");
      expect(typeof utils.log).toBe("object");
    });

    it("should support dynamic named imports", async () => {
      const { log, Log } = await import("../../dist/utils/index.js");

      expect(typeof Log).toBe("function");
      expect(typeof log).toBe("object");
      expect(typeof log.info).toBe("function");
    });

    it("should maintain functionality with dynamic imports", async () => {
      const { log } = await import("../../dist/utils/index.js");

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      // Set development mode to ensure logging
      process.env.NODE_ENV = "development";
      log.setOptions({
        type: "server",
        showCaller: false, // Disable caller info for this test
        server: { production: ["log", "info", "warn", "error"] },
      });

      log.warn("test warning");

      expect(consoleSpy).toHaveBeenCalledWith("test warning");

      consoleSpy.mockRestore();
    });
  });

  describe("Export Consistency", () => {
    it("should have consistent exports between static and dynamic imports", async () => {
      const dynamicUtils = await import("../../dist/utils/index.js");

      expect(Object.keys(utils).sort()).toEqual(
        Object.keys(dynamicUtils).sort(),
      );
      expect(typeof utils.log).toBe(typeof dynamicUtils.log);
      expect(typeof utils.Log).toBe(typeof dynamicUtils.Log);
    });

    it("should export the same log instance between import methods", async () => {
      const dynamicUtils = await import("../../dist/utils/index.js");

      // Both should reference the same singleton instance
      expect(utils.log).toBe(dynamicUtils.log);
    });
  });

  describe("TypeScript Type Definitions", () => {
    it("should have proper TypeScript declarations", () => {
      // This test ensures that TypeScript types are available
      // The actual type checking is done at compile time

      // These should not throw TypeScript errors (tested at compile time)
      expect(utils.log).toBeDefined();
      expect(utils.Log).toBeDefined();

      // Runtime verification that the exports match expected interface
      expect(typeof utils.log.setOptions).toBe("function");
      expect(typeof utils.log.getOptions).toBe("function");
      expect(typeof utils.log.log).toBe("function");
      expect(typeof utils.log.info).toBe("function");
      expect(typeof utils.log.warn).toBe("function");
      expect(typeof utils.log.error).toBe("function");
      expect(typeof utils.log.debug).toBe("function");
    });
  });
});
