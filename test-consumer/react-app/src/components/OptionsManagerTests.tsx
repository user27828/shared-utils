import React from "react";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

// Import the options manager utilities from shared-utils
let OptionsManager: any = null;
let optionsManager: any = null;

// Dynamically import to handle potential import issues
const loadOptionsManager = async () => {
  try {
    const module = (await import("@user27828/shared-utils/utils")) as any;
    console.log("Imported options-manager module:", module);
    return {
      OptionsManager: module.OptionsManager,
      optionsManager: module.optionsManager,
    };
  } catch (error) {
    console.error("Failed to import options-manager:", error);
    return { OptionsManager: null, optionsManager: null };
  }
};

const OptionsManagerTests: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [testItems, setTestItems] = React.useState<TestItem[]>([
    {
      name: "Basic Options Manager",
      description: "Tests individual OptionsManager instance functionality",
      status: "pending",
    },
    {
      name: "Merge Strategy",
      description: "Verifies array replacement and object merging strategies",
      status: "pending",
    },
    {
      name: "Global Options Manager",
      description: "Tests cross-utility configuration via global manager",
      status: "pending",
    },
    {
      name: "Backward Compatibility",
      description: "Ensures deprecated methods work for backward compatibility",
      status: "pending",
    },
    {
      name: "Undefined Handling",
      description: "Verifies undefined values are properly skipped",
      status: "pending",
    },
  ]);

  React.useEffect(() => {
    const initOptionsManager = async () => {
      const utilities = await loadOptionsManager();
      OptionsManager = utilities.OptionsManager;
      optionsManager = utilities.optionsManager;
    };

    initOptionsManager();
  }, []);

  const updateTestStatus = (
    testName: string,
    status: TestStatus,
    message?: string,
    duration?: number,
  ) => {
    setTestItems((prev) =>
      prev.map((test) =>
        test.name === testName
          ? {
              ...test,
              status,
              message,
              duration,
              startTime: status === "running" ? new Date() : test.startTime,
              endTime:
                status === "pass" || status === "fail" ? new Date() : undefined,
            }
          : test,
      ),
    );
  };

  const clearResults = () => {
    setTestItems((prev) =>
      prev.map((test) => ({
        ...test,
        status: "pending" as TestStatus,
        message: undefined,
        duration: undefined,
        startTime: undefined,
        endTime: undefined,
      })),
    );
  };

  const runBasicOptionsManagerTest = async () => {
    const testName = "Basic Options Manager";
    const startTime = Date.now();

    if (!OptionsManager) {
      updateTestStatus(testName, "fail", "OptionsManager class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing basic OptionsManager functionality...",
      );

      // Test creating a manager instance
      const defaultOptions = {
        environment: "client",
        debug: false,
        config: {
          timeout: 5000,
          retries: 3,
        },
      };

      const manager = new OptionsManager("test-utility", defaultOptions);

      // Test getOption() - should return all options
      const allOptions = manager.getOption();
      if (!allOptions || typeof allOptions !== "object") {
        throw new Error("getOption() should return all options");
      }

      // Test setting individual option
      manager.setOption("debug", true);
      const debugValue = manager.getOption("debug");
      if (debugValue !== true) {
        throw new Error("setOption/getOption for single value failed");
      }

      // Test setting nested option
      manager.setOption("config", { timeout: 10000 });
      const configTimeout = manager.getOption("config", "timeout");
      if (configTimeout !== 10000) {
        throw new Error("Setting nested option failed");
      }

      // Test dot notation access
      const timeoutDot = manager.getOption("config.timeout");
      if (timeoutDot !== 10000) {
        throw new Error("Dot notation access failed");
      }

      // Test reset
      manager.resetOptions();
      const resetOptions = manager.getOption();
      if (
        resetOptions.debug !== false ||
        resetOptions.config.timeout !== 5000
      ) {
        throw new Error("resetOptions() failed");
      }

      const duration = Date.now() - startTime;
      const successMessage =
        "✅ Instance creation, ✅ getOption(), ✅ setOption(), ✅ nested options, ✅ dot notation, ✅ reset";

      updateTestStatus(testName, "pass", successMessage, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Error: ${error}`;

      updateTestStatus(testName, "fail", errorMessage, duration);
    }
  };

  const runMergeStrategyTest = async () => {
    const testName = "Merge Strategy";
    const startTime = Date.now();

    if (!OptionsManager) {
      updateTestStatus(testName, "fail", "OptionsManager class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing options merging strategies...",
      );

      const defaultOptions = {
        arrays: ["default1", "default2"],
        objects: {
          nested: { value: 1 },
          other: "original",
        },
        primitives: "default",
      };

      const manager = new OptionsManager("merge-test", defaultOptions);

      // Test array replacement (not merging)
      manager.setOption("arrays", ["new1", "new2", "new3"]);
      const arrays = manager.getOption("arrays");
      if (
        !Array.isArray(arrays) ||
        arrays.length !== 3 ||
        arrays[0] !== "new1"
      ) {
        throw new Error("Arrays should be replaced, not merged");
      }

      // Test object merging
      manager.setOption("objects", { nested: { value: 2, newProp: "added" } });
      const objects = manager.getOption("objects");
      if (
        objects.nested.value !== 2 ||
        objects.nested.newProp !== "added" ||
        objects.other !== "original"
      ) {
        throw new Error(
          "Objects should be merged, preserving existing properties",
        );
      }

      // Test batch setting with setOption(object)
      manager.setOption({
        primitives: "updated",
        arrays: ["batch1"],
        objects: { nested: { value: 3 } },
      });

      const primitives = manager.getOption("primitives");
      const batchArrays = manager.getOption("arrays");
      const batchObjects = manager.getOption("objects");

      if (
        primitives !== "updated" ||
        !Array.isArray(batchArrays) ||
        batchArrays[0] !== "batch1" ||
        batchObjects.nested.value !== 3 ||
        batchObjects.other !== "original"
      ) {
        throw new Error("Batch setting with object parameter failed");
      }

      const duration = Date.now() - startTime;
      const successMessage =
        "✅ Array replacement, ✅ Object merging, ✅ Property preservation, ✅ Batch setting";

      updateTestStatus(testName, "pass", successMessage, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Error: ${error}`;

      updateTestStatus(testName, "fail", errorMessage, duration);
    }
  };

  const runGlobalOptionsManagerTest = async () => {
    const testName = "Global Options Manager";
    const startTime = Date.now();

    if (!optionsManager || !OptionsManager) {
      updateTestStatus(testName, "fail", "Global optionsManager not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing global options manager...",
      );

      // Test registering managers
      const logManager = new OptionsManager("log", {
        type: "client",
        debug: false,
      });
      const turnstileManager = new OptionsManager("turnstile", {
        siteKey: null,
        theme: "auto",
      });

      optionsManager.registerManager("log", logManager);
      optionsManager.registerManager("turnstile", turnstileManager);

      // Test getting registered utilities
      const utilities = optionsManager.getRegisteredUtilities();
      if (!utilities.includes("log") || !utilities.includes("turnstile")) {
        throw new Error("Manager registration failed");
      }

      // Test global options setting
      optionsManager.setGlobalOptions({
        log: { type: "server", debug: true },
        turnstile: { siteKey: "test-key", theme: "dark" },
      });

      // Verify options were set correctly
      const logOptions = logManager.getOption();
      const turnstileOptions = turnstileManager.getOption();

      if (logOptions.type !== "server" || logOptions.debug !== true) {
        throw new Error("Global log options setting failed");
      }

      if (
        turnstileOptions.siteKey !== "test-key" ||
        turnstileOptions.theme !== "dark"
      ) {
        throw new Error("Global turnstile options setting failed");
      }

      // Test getAllOptions
      const allOptions = optionsManager.getAllOptions();
      if (!allOptions.log || !allOptions.turnstile) {
        throw new Error("getAllOptions() failed");
      }

      // Test resetAllOptions
      optionsManager.resetAllOptions();
      const resetLogOptions = logManager.getOption();
      const resetTurnstileOptions = turnstileManager.getOption();

      if (
        resetLogOptions.type !== "client" ||
        resetLogOptions.debug !== false ||
        resetTurnstileOptions.siteKey !== null ||
        resetTurnstileOptions.theme !== "auto"
      ) {
        throw new Error("resetAllOptions() failed");
      }

      // Test getManager
      const retrievedLogManager = optionsManager.getManager("log");
      if (!retrievedLogManager || retrievedLogManager !== logManager) {
        throw new Error("getManager() failed");
      }

      const duration = Date.now() - startTime;
      const successMessage =
        "✅ Manager registration, ✅ Global setting, ✅ GetAll, ✅ Reset all, ✅ GetManager";

      updateTestStatus(testName, "pass", successMessage, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Error: ${error}`;

      updateTestStatus(testName, "fail", errorMessage, duration);
    }
  };

  const runBackwardCompatibilityTest = async () => {
    const testName = "Backward Compatibility";
    const startTime = Date.now();

    if (!OptionsManager) {
      updateTestStatus(testName, "fail", "OptionsManager class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing backward compatibility methods...",
      );

      const defaultOptions = {
        setting1: "value1",
        setting2: { nested: "value2" },
      };
      const manager = new OptionsManager("compat-test", defaultOptions);

      // Test deprecated setOptions method
      manager.setOptions({
        setting1: "updated",
        setting2: { nested: "updated" },
      });
      const options1 = manager.getOption();
      if (
        options1.setting1 !== "updated" ||
        options1.setting2.nested !== "updated"
      ) {
        throw new Error("Deprecated setOptions() method failed");
      }

      // Test deprecated getOptions method
      const options2 = manager.getOptions();
      if (!options2 || options2.setting1 !== "updated") {
        throw new Error("Deprecated getOptions() method failed");
      }

      // Ensure backward compatibility methods work the same as new ones
      const newApiOptions = manager.getOption();
      const oldApiOptions = manager.getOptions();
      if (JSON.stringify(newApiOptions) !== JSON.stringify(oldApiOptions)) {
        throw new Error(
          "Backward compatibility methods return different results",
        );
      }

      const duration = Date.now() - startTime;
      const successMessage =
        "✅ setOptions() method, ✅ getOptions() method, ✅ API consistency";

      updateTestStatus(testName, "pass", successMessage, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Error: ${error}`;

      updateTestStatus(testName, "fail", errorMessage, duration);
    }
  };

  const runUndefinedHandlingTest = async () => {
    const testName = "Undefined Handling";
    const startTime = Date.now();

    if (!OptionsManager) {
      updateTestStatus(testName, "fail", "OptionsManager class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
        "Testing undefined value handling...",
      );

      const defaultOptions = { setting1: "value1", setting2: "value2" };
      const manager = new OptionsManager("undefined-test", defaultOptions);

      // Test that undefined values are skipped
      manager.setOption("setting1", undefined);
      const setting1 = manager.getOption("setting1");
      if (setting1 !== "value1") {
        throw new Error("Undefined values should be skipped, not set");
      }

      // Test batch setting with undefined values
      manager.setOption({ setting1: "updated", setting2: undefined });
      const allOptions = manager.getOption();
      if (
        allOptions.setting1 !== "updated" ||
        allOptions.setting2 !== "value2"
      ) {
        throw new Error("Batch setting should skip undefined values");
      }

      // Test accessing non-existent paths
      const nonExistent = manager.getOption("nonexistent.path");
      if (nonExistent !== undefined) {
        throw new Error("Non-existent paths should return undefined");
      }

      const duration = Date.now() - startTime;
      const successMessage =
        "✅ Skip undefined values, ✅ Batch undefined handling, ✅ Non-existent path access";

      updateTestStatus(testName, "pass", successMessage, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = `Error: ${error}`;

      updateTestStatus(testName, "fail", errorMessage, duration);
    }
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Basic Options Manager":
        await runBasicOptionsManagerTest();
        break;
      case "Merge Strategy":
        await runMergeStrategyTest();
        break;
      case "Global Options Manager":
        await runGlobalOptionsManagerTest();
        break;
      case "Backward Compatibility":
        await runBackwardCompatibilityTest();
        break;
      case "Undefined Handling":
        await runUndefinedHandlingTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Unknown test");
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    const tests = [
      runBasicOptionsManagerTest,
      runMergeStrategyTest,
      runGlobalOptionsManagerTest,
      runBackwardCompatibilityTest,
      runUndefinedHandlingTest,
    ];

    for (const testFn of tests) {
      await testFn();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsLoading(false);
  };

  return (
    <div>
      <h2>Options Manager Integration Tests</h2>
      <TestProgress
        title="Options Manager"
        tests={testItems}
        isRunning={isLoading}
        onRunAll={runAllTests}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>About Options Manager Tests</h3>
        <ul style={{ textAlign: "left" }}>
          <li>
            <strong>Basic Manager:</strong> Tests individual OptionsManager
            instance functionality including getOption(), setOption(), nested
            access, and reset
          </li>
          <li>
            <strong>Merge Strategy:</strong> Verifies that arrays are replaced
            (not merged) while objects are deep merged, preserving existing
            properties
          </li>
          <li>
            <strong>Global Manager:</strong> Tests cross-utility configuration
            via the global optionsManager singleton
          </li>
          <li>
            <strong>Compatibility:</strong> Ensures deprecated setOptions() and
            getOptions() methods work for backward compatibility
          </li>
          <li>
            <strong>Undefined Handling:</strong> Verifies that undefined values
            are properly skipped during option setting
          </li>
        </ul>
      </div>
    </div>
  );
};

export default OptionsManagerTests;
