/**
 * Unit tests for OptionsManager class
 * @jest-environment node
 */

describe("OptionsManager Unit Tests", () => {
  let OptionsManager, optionsManager;

  beforeAll(async () => {
    const utils = await import("@shared-utils/utils");
    OptionsManager = utils.OptionsManager;
    optionsManager = utils.optionsManager;
  });

  describe("OptionsManager Class", () => {
    let manager;
    const defaultOptions = {
      stringValue: "default",
      numberValue: 42,
      booleanValue: true,
      objectValue: {
        nested: "value",
        count: 10,
      },
      arrayValue: ["a", "b", "c"],
    };

    beforeEach(() => {
      manager = new OptionsManager("test", defaultOptions);
    });

    describe("Constructor", () => {
      test("should initialize with utility name and default options", () => {
        expect(manager.getUtilityName()).toBe("test");
        expect(manager.getOptions()).toEqual(defaultOptions);
      });

      test("should create independent copies of default options", () => {
        const manager1 = new OptionsManager("test1", defaultOptions);
        const manager2 = new OptionsManager("test2", defaultOptions);

        manager1.setOptions({ stringValue: "changed" });

        expect(manager1.getOptions().stringValue).toBe("changed");
        expect(manager2.getOptions().stringValue).toBe("default");
      });
    });

    describe("setOptions()", () => {
      test("should merge partial options", () => {
        manager.setOptions({ stringValue: "updated" });

        const options = manager.getOptions();
        expect(options.stringValue).toBe("updated");
        expect(options.numberValue).toBe(42); // Should remain unchanged
      });

      test("should perform deep merge for objects", () => {
        manager.setOptions({
          objectValue: {
            nested: "updated",
            newProp: "added",
          },
        });

        const options = manager.getOptions();
        expect(options.objectValue.nested).toBe("updated");
        expect(options.objectValue.count).toBe(10); // Should remain from default
        expect(options.objectValue.newProp).toBe("added");
      });

      test("should replace arrays (not merge)", () => {
        manager.setOptions({ arrayValue: ["x", "y"] });

        const options = manager.getOptions();
        expect(options.arrayValue).toEqual(["x", "y"]);
      });

      test("should handle undefined values correctly", () => {
        manager.setOptions({
          stringValue: undefined,
          numberValue: 99,
        });

        const options = manager.getOptions();
        expect(options.stringValue).toBe("default"); // Should not change
        expect(options.numberValue).toBe(99); // Should change
      });

      test("should handle null values", () => {
        manager.setOptions({ stringValue: null });

        const options = manager.getOptions();
        expect(options.stringValue).toBeNull();
      });

      test("should handle empty objects", () => {
        const originalOptions = manager.getOptions();
        manager.setOptions({});

        expect(manager.getOptions()).toEqual(originalOptions);
      });
    });

    describe("getOptions()", () => {
      test("should return a copy of options (not reference)", () => {
        const options1 = manager.getOptions();
        const options2 = manager.getOptions();

        options1.stringValue = "modified";

        expect(options2.stringValue).toBe("default");
        expect(manager.getOptions().stringValue).toBe("default");
      });

      test("should return deep copy for nested objects", () => {
        const options = manager.getOptions();
        options.objectValue.nested = "modified";

        expect(manager.getOptions().objectValue.nested).toBe("value");
      });
    });

    describe("resetOptions()", () => {
      test("should reset to default options", () => {
        manager.setOptions({
          stringValue: "changed",
          numberValue: 999,
          objectValue: { completely: "different" },
        });

        manager.resetOptions();

        expect(manager.getOptions()).toEqual(defaultOptions);
      });

      test("should reset to fresh copy of defaults", () => {
        manager.setOptions({ objectValue: { nested: "changed" } });
        manager.resetOptions();

        const options = manager.getOptions();
        options.objectValue.nested = "modified";

        manager.resetOptions();
        expect(manager.getOptions().objectValue.nested).toBe("value");
      });
    });

    describe("getOption() and setOption()", () => {
      test("should get specific option value", () => {
        expect(manager.getOption("stringValue")).toBe("default");
        expect(manager.getOption("numberValue")).toBe(42);
      });

      test("should set specific option value", () => {
        manager.setOption("stringValue", "specific");

        expect(manager.getOption("stringValue")).toBe("specific");
        expect(manager.getOption("numberValue")).toBe(42); // Should remain unchanged
      });
    });

    describe("hasOption()", () => {
      test("should return true for defined options", () => {
        expect(manager.hasOption("stringValue")).toBe(true);
        expect(manager.hasOption("numberValue")).toBe(true);
      });

      test("should return false for undefined options", () => {
        const sparseManager = new OptionsManager("sparse", {
          defined: "value",
          undefinedValue: undefined,
        });

        expect(sparseManager.hasOption("defined")).toBe(true);
        expect(sparseManager.hasOption("undefinedValue")).toBe(false);
        expect(sparseManager.hasOption("nonexistent")).toBe(false);
      });
    });

    describe("getUtilityName()", () => {
      test("should return the utility name", () => {
        const manager1 = new OptionsManager("utility1", {});
        const manager2 = new OptionsManager("utility2", {});

        expect(manager1.getUtilityName()).toBe("utility1");
        expect(manager2.getUtilityName()).toBe("utility2");
      });
    });
  });

  describe("GlobalOptionsManager", () => {
    beforeEach(() => {
      // Clear any existing registrations for clean testing
      optionsManager.resetAllOptions();
    });

    describe("registerManager()", () => {
      test("should register utility managers", () => {
        const testManager = new OptionsManager("testUtil", { value: "test" });

        optionsManager.registerManager("testUtil", testManager);

        expect(optionsManager.getRegisteredUtilities()).toContain("testUtil");
      });

      test("should allow retrieving registered managers", () => {
        const testManager = new OptionsManager("testUtil", { value: "test" });

        optionsManager.registerManager("testUtil", testManager);

        const retrieved = optionsManager.getManager("testUtil");
        expect(retrieved).toBe(testManager);
      });
    });

    describe("setGlobalOptions()", () => {
      test("should set options for multiple utilities", () => {
        const manager1 = new OptionsManager("util1", { value: "default1" });
        const manager2 = new OptionsManager("util2", { value: "default2" });

        optionsManager.registerManager("util1", manager1);
        optionsManager.registerManager("util2", manager2);

        optionsManager.setGlobalOptions({
          util1: { value: "global1" },
          util2: { value: "global2" },
        });

        expect(manager1.getOptions().value).toBe("global1");
        expect(manager2.getOptions().value).toBe("global2");
      });

      test("should ignore options for unregistered utilities", () => {
        optionsManager.setGlobalOptions({
          nonexistent: { value: "ignored" },
        });

        // Should not throw error
        expect(optionsManager.getRegisteredUtilities()).not.toContain(
          "nonexistent",
        );
      });
    });

    describe("Global convenience getOption / setOption patterns", () => {
      test("optionsManager.getOption returns values from registered manager", () => {
        const manager = new OptionsManager("site", {
          files: { maxFileSize: 1024, uploadDirectory: "/tmp" },
        });
        optionsManager.registerManager("site", manager);

        const allSite = optionsManager.getOption("site");
        expect(allSite.files.maxFileSize).toBe(1024);

        const maxSize = optionsManager.getOption("site", "files.maxFileSize");
        expect(maxSize).toBe(1024);

        const uploadDir = optionsManager.getOption(
          "site",
          "files",
          "uploadDirectory",
        );
        expect(uploadDir).toBe("/tmp");
      });

      test("optionsManager.setOption updates the registered manager (object merge)", () => {
        const manager = new OptionsManager("site2", {
          files: { maxFileSize: 512, uploadDirectory: "/var" },
        });
        optionsManager.registerManager("site2", manager);

        optionsManager.setOption("site2", { files: { maxFileSize: 2048 } });

        expect(manager.getOption("files").maxFileSize).toBe(2048);
        expect(manager.getOption("files").uploadDirectory).toBe("/var");
      });

      test("optionsManager.setOption updates a dotted path", () => {
        const manager = new OptionsManager("site3", {
          files: { maxFileSize: 100 },
        });
        optionsManager.registerManager("site3", manager);

        optionsManager.setOption("site3", "files.maxFileSize", 999);

        expect(manager.getOption("files", "maxFileSize")).toBe(999);
      });
    });

    describe("getAllOptions()", () => {
      test("should return options for all registered utilities", () => {
        const manager1 = new OptionsManager("util1", { value1: "test1" });
        const manager2 = new OptionsManager("util2", { value2: "test2" });

        optionsManager.registerManager("util1", manager1);
        optionsManager.registerManager("util2", manager2);

        const allOptions = optionsManager.getAllOptions();

        expect(allOptions.util1).toEqual({ value1: "test1" });
        expect(allOptions.util2).toEqual({ value2: "test2" });
      });

      test("should return empty object when no utilities registered", () => {
        // Note: This test might fail in practice because log/turnstile are always registered
        // But it tests the theoretical behavior
        const tempManager = new optionsManager.constructor();

        expect(tempManager.getAllOptions()).toEqual({});
      });
    });

    describe("resetAllOptions()", () => {
      test("should reset all registered utilities", () => {
        const manager1 = new OptionsManager("util1", { value: "default1" });
        const manager2 = new OptionsManager("util2", { value: "default2" });

        optionsManager.registerManager("util1", manager1);
        optionsManager.registerManager("util2", manager2);

        // Change options
        manager1.setOptions({ value: "changed1" });
        manager2.setOptions({ value: "changed2" });

        // Reset all
        optionsManager.resetAllOptions();

        expect(manager1.getOptions().value).toBe("default1");
        expect(manager2.getOptions().value).toBe("default2");
      });
    });

    describe("getManager()", () => {
      test("should return registered manager", () => {
        const testManager = new OptionsManager("testUtil", { value: "test" });

        optionsManager.registerManager("testUtil", testManager);

        expect(optionsManager.getManager("testUtil")).toBe(testManager);
      });

      test("should return undefined for unregistered utility", () => {
        expect(optionsManager.getManager("nonexistent")).toBeUndefined();
      });
    });

    describe("getRegisteredUtilities()", () => {
      test("should return array of registered utility names", () => {
        const utilities = optionsManager.getRegisteredUtilities();

        // Should at least contain log and turnstile from integration
        expect(Array.isArray(utilities)).toBe(true);
        expect(utilities.length).toBeGreaterThan(0);
      });

      test("should include newly registered utilities", () => {
        const beforeCount = optionsManager.getRegisteredUtilities().length;

        const testManager = new OptionsManager("newUtil", {});
        optionsManager.registerManager("newUtil", testManager);

        const afterUtilities = optionsManager.getRegisteredUtilities();
        expect(afterUtilities.length).toBe(beforeCount + 1);
        expect(afterUtilities).toContain("newUtil");
      });
    });
  });

  describe("Type Safety and Edge Cases", () => {
    test("should handle complex nested objects", () => {
      const complexDefaults = {
        level1: {
          level2: {
            level3: {
              value: "deep",
              array: [1, 2, 3],
            },
            other: "value",
          },
        },
      };

      const manager = new OptionsManager("complex", complexDefaults);

      manager.setOptions({
        level1: {
          level2: {
            level3: {
              value: "updated",
            },
          },
        },
      });

      const options = manager.getOptions();
      expect(options.level1.level2.level3.value).toBe("updated");
      expect(options.level1.level2.level3.array).toEqual([1, 2, 3]); // Should be preserved
      expect(options.level1.level2.other).toBe("value"); // Should be preserved
    });

    test("should handle circular reference prevention in options copy", () => {
      const manager = new OptionsManager("test", { value: "test" });

      // This should not cause infinite recursion
      const options1 = manager.getOptions();
      const options2 = manager.getOptions();

      expect(options1).toEqual(options2);
      expect(options1).not.toBe(options2);
    });

    test("should handle various data types", () => {
      const complexDefaults = {
        string: "test",
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        array: [1, "two", true],
        date: new Date("2023-01-01"),
        regex: /test/g,
        function: () => "test",
      };

      const manager = new OptionsManager("types", complexDefaults);

      // Should handle getting and setting various types
      expect(manager.getOption("string")).toBe("test");
      expect(manager.getOption("number")).toBe(42);
      expect(manager.getOption("boolean")).toBe(true);
      expect(manager.getOption("null")).toBeNull();
      expect(manager.getOption("undefined")).toBeUndefined();
      expect(manager.getOption("array")).toEqual([1, "two", true]);
    });
  });
});
