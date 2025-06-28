import React from "react";
import { TestResultsRenderer, type TestResult } from "./TestResultsRenderer";

// Import the options manager utilities from shared-utils
let OptionsManager: any = null;
let optionsManager: any = null;

// Dynamically import to handle potential import issues
const loadOptionsManager = async () => {
  try {
    const module = await import("@user27828/shared-utils/utils");
    console.log("Imported options-manager module:", module);
    return {
      OptionsManager: module.OptionsManager,
      optionsManager: module.optionsManager,
    };
  } catch (error) {
    console.error("Failed to import options-manager:", error);
    try {
      // Try alternative import paths
      const altModule = await import("@user27828/shared-utils");
      console.log("Alternative import:", altModule);
      return {
        OptionsManager: altModule.OptionsManager,
        optionsManager: altModule.optionsManager,
      };
    } catch (altError) {
      console.error("Alternative import also failed:", altError);
      return { OptionsManager: null, optionsManager: null };
    }
  }
};

interface OptionsManagerTestResult extends TestResult {
  // Inherits test, status, message, timestamp from TestResult
}

const OptionsManagerTests: React.FC = () => {
  const [testResults, setTestResults] = React.useState<
    OptionsManagerTestResult[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const initOptionsManager = async () => {
      const utilities = await loadOptionsManager();
      OptionsManager = utilities.OptionsManager;
      optionsManager = utilities.optionsManager;

      if (!OptionsManager || !optionsManager) {
        addTestResult(
          "Options Manager Import",
          "fail",
          "Failed to import OptionsManager utilities from @user27828/shared-utils",
        );
      } else {
        addTestResult(
          "Options Manager Import",
          "pass",
          "Successfully imported OptionsManager utilities",
        );
      }
    };

    initOptionsManager();
  }, []);

  const addTestResult = (
    test: string,
    status: "pass" | "fail" | "pending",
    message: string,
  ) => {
    const result: OptionsManagerTestResult = {
      test,
      status,
      message,
      timestamp: new Date(),
    };

    setTestResults((prev) => [...prev, result]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runBasicOptionsManagerTest = async () => {
    if (!OptionsManager) {
      addTestResult(
        "Basic Options Manager",
        "fail",
        "OptionsManager class not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Basic Options Manager",
        "pending",
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

      addTestResult(
        "Basic Options Manager",
        "pass",
        "✅ Instance creation, ✅ getOption(), ✅ setOption(), ✅ nested options, ✅ dot notation, ✅ reset",
      );
    } catch (error) {
      addTestResult("Basic Options Manager", "fail", `Error: ${error}`);
    }
  };

  const runMergeStrategyTest = async () => {
    if (!OptionsManager) {
      addTestResult(
        "Merge Strategy",
        "fail",
        "OptionsManager class not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Merge Strategy",
        "pending",
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

      addTestResult(
        "Merge Strategy",
        "pass",
        "✅ Array replacement, ✅ Object merging, ✅ Property preservation, ✅ Batch setting",
      );
    } catch (error) {
      addTestResult("Merge Strategy", "fail", `Error: ${error}`);
    }
  };

  const runGlobalOptionsManagerTest = async () => {
    if (!optionsManager || !OptionsManager) {
      addTestResult(
        "Global Options Manager",
        "fail",
        "Global optionsManager not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Global Options Manager",
        "pending",
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

      addTestResult(
        "Global Options Manager",
        "pass",
        "✅ Manager registration, ✅ Global setting, ✅ GetAll, ✅ Reset all, ✅ GetManager",
      );
    } catch (error) {
      addTestResult("Global Options Manager", "fail", `Error: ${error}`);
    }
  };

  const runBackwardCompatibilityTest = async () => {
    if (!OptionsManager) {
      addTestResult(
        "Backward Compatibility",
        "fail",
        "OptionsManager class not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Backward Compatibility",
        "pending",
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

      addTestResult(
        "Backward Compatibility",
        "pass",
        "✅ setOptions() method, ✅ getOptions() method, ✅ API consistency",
      );
    } catch (error) {
      addTestResult("Backward Compatibility", "fail", `Error: ${error}`);
    }
  };

  const runUndefinedHandlingTest = async () => {
    if (!OptionsManager) {
      addTestResult(
        "Undefined Handling",
        "fail",
        "OptionsManager class not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Undefined Handling",
        "pending",
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

      addTestResult(
        "Undefined Handling",
        "pass",
        "✅ Skip undefined values, ✅ Batch undefined handling, ✅ Non-existent path access",
      );
    } catch (error) {
      addTestResult("Undefined Handling", "fail", `Error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    await runBasicOptionsManagerTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runMergeStrategyTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runGlobalOptionsManagerTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runBackwardCompatibilityTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runUndefinedHandlingTest();

    setIsLoading(false);
  };

  return (
    <div>
      <h2>Options Manager Integration Tests</h2>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={runAllTests}
          disabled={isLoading}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isLoading ? "not-allowed" : "pointer",
            marginRight: "1rem",
          }}
        >
          {isLoading ? "Running Tests..." : "Run All Tests"}
        </button>

        <button
          onClick={clearResults}
          style={{
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            backgroundColor: "#666",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "1rem",
          }}
        >
          Clear Results
        </button>

        <button
          onClick={runBasicOptionsManagerTest}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            backgroundColor: "#5a5a5a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Basic Manager
        </button>

        <button
          onClick={runMergeStrategyTest}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            backgroundColor: "#5a5a5a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Merge Strategy
        </button>

        <button
          onClick={runGlobalOptionsManagerTest}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            backgroundColor: "#5a5a5a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Global Manager
        </button>

        <button
          onClick={runBackwardCompatibilityTest}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            backgroundColor: "#5a5a5a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Compatibility
        </button>

        <button
          onClick={runUndefinedHandlingTest}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.9rem",
            backgroundColor: "#5a5a5a",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
        >
          Undefined Handling
        </button>
      </div>

      <TestResultsRenderer testResults={testResults} />

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
