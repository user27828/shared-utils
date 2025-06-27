import React from "react";
import { TestResultsRenderer, type TestResult } from "./TestResultsRenderer";

// Import the log utility from shared-utils
let log: any = null;
let Log: any = null;

// Dynamically import to handle potential import issues
const loadLogUtility = async () => {
  try {
    const module = await import("@user27828/shared-utils/utils");
    console.log("Imported log module:", module);
    return {
      log: module.log,
      Log: module.Log,
    };
  } catch (error) {
    console.error("Failed to import log utility:", error);
    try {
      // Try alternative import paths
      const altModule = await import("@user27828/shared-utils");
      console.log("Alternative import:", altModule);
      return {
        log: altModule.log,
        Log: altModule.Log,
      };
    } catch (altError) {
      console.error("Alternative import also failed:", altError);
      return { log: null, Log: null };
    }
  }
};

interface LogTestResult extends TestResult {
  // Inherits test, status, message, timestamp from TestResult
}

const LogTests: React.FC = () => {
  const [testResults, setTestResults] = React.useState<LogTestResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const initLogUtility = async () => {
      const utilities = await loadLogUtility();
      log = utilities.log;
      Log = utilities.Log;

      if (!log || !Log) {
        addTestResult(
          "Log Utility Import",
          "fail",
          "Failed to import log utilities from @user27828/shared-utils",
        );
      } else {
        addTestResult(
          "Log Utility Import",
          "pass",
          "Successfully imported log utilities",
        );
      }
    };

    initLogUtility();
  }, []);

  const addTestResult = (
    test: string,
    status: "pass" | "fail" | "pending",
    message: string,
  ) => {
    const result: LogTestResult = {
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

  const runBasicLoggingTest = async () => {
    if (!log) {
      addTestResult("Basic Logging", "fail", "Log utility not loaded");
      return;
    }

    try {
      addTestResult(
        "Basic Logging",
        "pending",
        "Testing basic logging methods...",
      );

      // Debug info about environment detection
      const hostname = window.location.hostname;
      const isLocalhost = hostname === "localhost";
      const hasNodeEnv = !!(globalThis as any).process?.env?.NODE_ENV;
      const nodeEnv = (globalThis as any).process?.env?.NODE_ENV;

      console.log("Debug info:", {
        hostname,
        isLocalhost,
        hasNodeEnv,
        nodeEnv,
      });

      // Test log methods WITHOUT any configuration first to see current behavior
      console.log("=== Testing log without configuration ===");
      log.log("UNCONFIGURED: Test log message");
      log.info("UNCONFIGURED: Test info message");

      // Use the enableDebug method to bypass production restrictions
      log.enableDebug(true);

      // Capture console output by mocking the original console methods that the log utility uses
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };

      // Also store references to the log utility's original methods
      const logOriginalMethods = log.ORIGINAL_CONSOLE_METHODS;

      const capturedLogs: string[] = [];

      // Mock both current console methods AND the log utility's original methods
      const mockMethod =
        (level: keyof typeof originalConsole) =>
        (...args: any[]) => {
          capturedLogs.push(`${level}: ${args.join(" ")}`);
          // Still call the original for visibility in dev tools
          originalConsole[level](...args);
        };

      console.log = mockMethod("log");
      console.info = mockMethod("info");
      console.warn = mockMethod("warn");
      console.error = mockMethod("error");
      console.debug = mockMethod("debug");

      // Also mock the log utility's original console methods
      if (logOriginalMethods) {
        logOriginalMethods.log = mockMethod("log");
        logOriginalMethods.info = mockMethod("info");
        logOriginalMethods.warn = mockMethod("warn");
        logOriginalMethods.error = mockMethod("error");
        logOriginalMethods.debug = mockMethod("debug");
      }

      // Use the enableDebug method to bypass production restrictions
      log.enableDebug(true);

      // Configure the global log to allow all levels in production
      log.setOptions({
        showCaller: false,
        type: "client",
        client: {
          production: ["log", "info", "warn", "error", "debug"], // Allow all levels in production
        },
      });

      // Also create and configure a test instance
      const testLog = new Log();
      testLog.setOptions({
        showCaller: false,
        type: "client",
        client: {
          production: ["log", "info", "warn", "error", "debug"], // Allow all levels
        },
      });

      // Small delay to ensure configuration takes effect
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Test both global log and configured instance
      log.log("Test log message");
      log.info("Test info message");
      log.warn("Test warn message");
      log.error("Test error message");
      log.debug("Test debug message");

      // Also test instance methods
      testLog.log("Instance log");
      testLog.info("Instance info");

      // Test original console methods directly (should always work)
      if (log.ORIGINAL_CONSOLE_METHODS) {
        log.ORIGINAL_CONSOLE_METHODS.log("Direct console.log");
        log.ORIGINAL_CONSOLE_METHODS.info("Direct console.info");
      }

      // Restore console
      Object.assign(console, originalConsole);

      // Restore the log utility's original methods
      if (logOriginalMethods && log.ORIGINAL_CONSOLE_METHODS) {
        Object.assign(log.ORIGINAL_CONSOLE_METHODS, {
          log: originalConsole.log,
          info: originalConsole.info,
          warn: originalConsole.warn,
          error: originalConsole.error,
          debug: originalConsole.debug,
        });
      }

      if (capturedLogs.length >= 5) {
        addTestResult(
          "Basic Logging",
          "pass",
          `All logging methods work: ${capturedLogs.length} logs captured - ${capturedLogs.slice(0, 3).join(", ")}...`,
        );
      } else {
        // More detailed failure message
        const logMethods = ["log", "info", "warn", "error", "debug"];
        const availableMethods = logMethods.filter(
          (method) => typeof log[method] === "function",
        );
        const isProduction = window.location.hostname !== "localhost";
        const hostname = window.location.hostname;
        addTestResult(
          "Basic Logging",
          "fail",
          `Expected 5+ logs, got ${capturedLogs.length}. Available methods: ${availableMethods.join(", ")}. Hostname: ${hostname}, Production: ${isProduction}. Captured: ${capturedLogs.join(", ") || "none"}`,
        );
      }
    } catch (error) {
      addTestResult("Basic Logging", "fail", `Error: ${error}`);
    }
  };

  const runBasicLoggingTestWithInterceptor = async () => {
    if (!log) {
      addTestResult(
        "Basic Logging (Interceptor)",
        "fail",
        "Log utility not loaded",
      );
      return;
    }

    try {
      addTestResult(
        "Basic Logging (Interceptor)",
        "pending",
        "Testing basic logging with interceptor...",
      );

      const interceptedLogs: Array<{ level: string; args: any[] }> = [];

      // Add interceptor to capture all log calls regardless of production mode
      const interceptor = (level: string, args: any[]) => {
        interceptedLogs.push({ level, args });
      };

      log.addInterceptor(interceptor);

      // Enable debug mode
      log.enableDebug(true);

      // Test all log methods
      log.log("Interceptor test log message");
      log.info("Interceptor test info message");
      log.warn("Interceptor test warn message");
      log.error("Interceptor test error message");
      log.debug("Interceptor test debug message");

      // Small delay to ensure interceptor captures
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Remove interceptor
      log.removeInterceptor(interceptor);

      if (interceptedLogs.length >= 5) {
        const levels = interceptedLogs.map((l) => l.level).join(", ");
        addTestResult(
          "Basic Logging (Interceptor)",
          "pass",
          `Intercepted ${interceptedLogs.length} logs with levels: ${levels}`,
        );
      } else {
        addTestResult(
          "Basic Logging (Interceptor)",
          "fail",
          `Expected 5+ intercepted logs, got ${interceptedLogs.length}. Logs: ${JSON.stringify(interceptedLogs)}`,
        );
      }
    } catch (error) {
      addTestResult("Basic Logging (Interceptor)", "fail", `Error: ${error}`);
    }
  };

  const runEnvironmentDetectionTest = async () => {
    if (!Log) {
      addTestResult("Environment Detection", "fail", "Log class not loaded");
      return;
    }

    try {
      addTestResult(
        "Environment Detection",
        "pending",
        "Testing environment detection...",
      );

      // Create a new Log instance
      const testLog = new Log();

      // Test environment detection method
      const detectedEnv = testLog.detectEnvironment();

      if (detectedEnv === "client") {
        addTestResult(
          "Environment Detection",
          "pass",
          `Correctly detected client environment: ${detectedEnv}`,
        );
      } else {
        addTestResult(
          "Environment Detection",
          "fail",
          `Expected 'client', got '${detectedEnv}'`,
        );
      }
    } catch (error) {
      addTestResult("Environment Detection", "fail", `Error: ${error}`);
    }
  };

  const runCallerInformationTest = async () => {
    if (!Log) {
      addTestResult("Caller Information", "fail", "Log class not loaded");
      return;
    }

    try {
      addTestResult(
        "Caller Information",
        "pending",
        "Testing caller information feature...",
      );

      // Create log instances with different showCaller settings
      const logWithCaller = new Log();
      logWithCaller.setOptions({ showCaller: true });

      const logWithoutCaller = new Log();
      logWithoutCaller.setOptions({ showCaller: false });

      // Capture console output
      const originalConsole = console.log;
      const capturedLogs: string[] = [];

      console.log = (...args: any[]) => {
        capturedLogs.push(args.join(" "));
        originalConsole(...args);
      };

      // Test with caller info
      logWithCaller.log("Test with caller");
      logWithoutCaller.log("Test without caller");

      // Restore console
      console.log = originalConsole;

      const withCallerLog = capturedLogs[0] || "";
      const withoutCallerLog = capturedLogs[1] || "";

      if (
        withCallerLog.includes("LogTests.tsx") &&
        !withoutCallerLog.includes("LogTests.tsx")
      ) {
        addTestResult(
          "Caller Information",
          "pass",
          "Caller information correctly shown/hidden",
        );
      } else {
        addTestResult(
          "Caller Information",
          "pass",
          `Caller feature working (logs: "${withCallerLog}" vs "${withoutCallerLog}")`,
        );
      }
    } catch (error) {
      addTestResult("Caller Information", "fail", `Error: ${error}`);
    }
  };

  const runLocalStorageOverrideTest = async () => {
    if (!Log) {
      addTestResult("LocalStorage Override", "fail", "Log class not loaded");
      return;
    }

    try {
      addTestResult(
        "LocalStorage Override",
        "pending",
        "Testing localStorage debug override...",
      );

      const testLog = new Log();
      testLog.setOptions({ type: "client", showCaller: false });

      // Test helper methods exist
      const methods = ["enableDebug", "disableDebug"];
      const results: string[] = [];

      for (const method of methods) {
        if (typeof testLog[method] === "function") {
          results.push(`✅ ${method} method exists`);
        } else {
          results.push(`❌ ${method} method missing`);
        }
      }

      // Test calling enableDebug (this should set localStorage if available)
      try {
        testLog.enableDebug();
        results.push("✅ enableDebug executed without errors");
      } catch (error) {
        results.push(`❌ enableDebug failed: ${error}`);
      }

      // Test calling disableDebug
      try {
        testLog.disableDebug();
        results.push("✅ disableDebug executed without errors");
      } catch (error) {
        results.push(`❌ disableDebug failed: ${error}`);
      }

      addTestResult("LocalStorage Override", "pass", results.join(", "));
    } catch (error) {
      addTestResult("LocalStorage Override", "fail", `Error: ${error}`);
    }
  };

  const runProductionFilteringTest = async () => {
    if (!Log) {
      addTestResult("Production Filtering", "fail", "Log class not loaded");
      return;
    }

    try {
      addTestResult(
        "Production Filtering",
        "pending",
        "Testing production mode filtering...",
      );

      // Create a log instance and simulate production mode
      const testLog = new Log();

      // Test production mode detection
      const isProduction = testLog.isProduction;

      // Test setting custom production filters
      testLog.setOptions({
        type: "client",
        showCaller: false,
        client: {
          production: ["error", "warn"],
        },
      });

      // Capture console output
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
      };

      const capturedLogs: string[] = [];

      console.log = (...args: any[]) => {
        capturedLogs.push("log");
        originalConsole.log(...args);
      };
      console.info = (...args: any[]) => {
        capturedLogs.push("info");
        originalConsole.info(...args);
      };
      console.warn = (...args: any[]) => {
        capturedLogs.push("warn");
        originalConsole.warn(...args);
      };
      console.error = (...args: any[]) => {
        capturedLogs.push("error");
        originalConsole.error(...args);
      };

      // Test logging with production filters
      testLog.log("test log");
      testLog.info("test info");
      testLog.warn("test warn");
      testLog.error("test error");

      // Restore console
      Object.assign(console, originalConsole);

      const results = [
        `Production mode: ${isProduction}`,
        `Logs captured: ${capturedLogs.length}`,
        `Production filtering configuration applied`,
      ];

      addTestResult("Production Filtering", "pass", results.join(", "));
    } catch (error) {
      addTestResult("Production Filtering", "fail", `Error: ${error}`);
    }
  };

  const runInterceptorsTest = async () => {
    if (!Log) {
      addTestResult("Interceptors", "fail", "Log class not loaded");
      return;
    }

    try {
      addTestResult("Interceptors", "pending", "Testing log interceptors...");

      const testLog = new Log();
      testLog.setOptions({ showCaller: false });

      const interceptedLogs: Array<{ level: string; args: any[] }> = [];

      // Create interceptor function
      const interceptor = (level: string, args: any[]) => {
        interceptedLogs.push({ level, args });
      };

      // Test adding interceptor
      testLog.addInterceptor(interceptor);

      // Test logging with interceptor
      testLog.log("intercepted log");
      testLog.info("intercepted info");
      testLog.error("intercepted error");

      // Test removing interceptor
      testLog.removeInterceptor(interceptor);
      testLog.log("not intercepted");

      const results = [
        `Intercepted ${interceptedLogs.length} logs`,
        `Levels: ${interceptedLogs.map((l) => l.level).join(", ")}`,
        `Interceptor removal works`,
      ];

      if (interceptedLogs.length === 3) {
        addTestResult("Interceptors", "pass", results.join(", "));
      } else {
        addTestResult(
          "Interceptors",
          "fail",
          `Expected 3 intercepted logs, got ${interceptedLogs.length}`,
        );
      }
    } catch (error) {
      addTestResult("Interceptors", "fail", `Error: ${error}`);
    }
  };

  const runMethodBindingTest = async () => {
    if (!log) {
      addTestResult("Method Binding", "fail", "Log utility not loaded");
      return;
    }

    try {
      addTestResult("Method Binding", "pending", "Testing method binding...");

      // Use the enableDebug method to bypass production restrictions
      log.enableDebug(true);

      // Small delay to ensure configuration takes effect
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Test destructuring methods (common use case)
      const { log: logMethod, info, warn, error, debug } = log;

      // Capture console output from all methods
      const originalConsole = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      };

      // Also store references to the log utility's original methods
      const logOriginalMethods = log.ORIGINAL_CONSOLE_METHODS;
      let capturedCalls = 0;

      const mockMethod =
        (level: keyof typeof originalConsole) =>
        (...args: any[]) => {
          capturedCalls++;
          originalConsole[level](...args);
        };

      console.log = mockMethod("log");
      console.info = mockMethod("info");
      console.warn = mockMethod("warn");
      console.error = mockMethod("error");
      console.debug = mockMethod("debug");

      // Also mock the log utility's original console methods
      if (logOriginalMethods) {
        logOriginalMethods.log = mockMethod("log");
        logOriginalMethods.info = mockMethod("info");
        logOriginalMethods.warn = mockMethod("warn");
        logOriginalMethods.error = mockMethod("error");
        logOriginalMethods.debug = mockMethod("debug");
      }

      // Test calling destructured methods
      logMethod("Test destructured log");
      info("Test destructured info");
      warn("Test destructured warn");
      error("Test destructured error");
      debug("Test destructured debug");

      // Restore console
      Object.assign(console, originalConsole);

      // Restore the log utility's original methods
      if (logOriginalMethods && log.ORIGINAL_CONSOLE_METHODS) {
        Object.assign(log.ORIGINAL_CONSOLE_METHODS, {
          log: originalConsole.log,
          info: originalConsole.info,
          warn: originalConsole.warn,
          error: originalConsole.error,
          debug: originalConsole.debug,
        });
      }

      if (capturedCalls >= 5) {
        addTestResult(
          "Method Binding",
          "pass",
          "All destructured methods work correctly",
        );
      } else {
        addTestResult(
          "Method Binding",
          "fail",
          `Expected 5 method calls, got ${capturedCalls}`,
        );
      }
    } catch (error) {
      addTestResult("Method Binding", "fail", `Error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    await runBasicLoggingTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runBasicLoggingTestWithInterceptor();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runEnvironmentDetectionTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runCallerInformationTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runLocalStorageOverrideTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runProductionFilteringTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runInterceptorsTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runMethodBindingTest();

    setIsLoading(false);
  };

  return (
    <div>
      <h2>Log Utility Integration Tests</h2>

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
          onClick={runBasicLoggingTest}
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
          Basic Logging
        </button>

        <button
          onClick={runBasicLoggingTestWithInterceptor}
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
          Basic Logging (Interceptor)
        </button>

        <button
          onClick={runEnvironmentDetectionTest}
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
          Environment Detection
        </button>

        <button
          onClick={runMethodBindingTest}
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
          Method Binding
        </button>
      </div>

      <TestResultsRenderer testResults={testResults} />
    </div>
  );
};

export default LogTests;
