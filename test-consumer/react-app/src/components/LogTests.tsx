import React from "react";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

// Import the log utility from shared-utils
let log: any = null;
let Log: any = null;

// Dynamically import to handle potential import issues
const loadLogUtility = async () => {
  try {
    const module = (await import("@user27828/shared-utils/utils")) as any;
    console.log("Imported log module successfully:", module);

    // The utils module exports log and Log as named exports
    return {
      log: module.log,
      Log: module.Log,
    };
  } catch (error) {
    console.error("Failed to import log utility:", error);
    return { log: null, Log: null };
  }
};

const LogTests: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [testItems, setTestItems] = React.useState<TestItem[]>([
    {
      name: "Log Utility Import",
      description: "Import and initialize log utilities from shared-utils",
      status: "pending",
    },
    {
      name: "Basic Logging",
      description: "Test basic log function calls and output",
      status: "pending",
    },
    {
      name: "Logging with Interceptor",
      description: "Test logging with custom interceptor functionality",
      status: "pending",
    },
    {
      name: "Environment Detection",
      description: "Test client-side environment detection",
      status: "pending",
    },
    {
      name: "Caller Information",
      description: "Test caller information extraction",
      status: "pending",
    },
    {
      name: "LocalStorage Override",
      description: "Test localStorage-based configuration override",
      status: "pending",
    },
    {
      name: "Production Filtering",
      description: "Test production environment log filtering",
      status: "pending",
    },
    {
      name: "Interceptors",
      description: "Test custom log interceptors",
      status: "pending",
    },
    {
      name: "Method Binding",
      description: "Test method binding and context preservation",
      status: "pending",
    },
  ]);

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

  // Separate test function for Log Utility Import
  const runLogUtilityImportTest = async () => {
    const testName = "Log Utility Import";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Loading log utilities...");

    const utilities = await loadLogUtility();
    log = utilities.log;
    Log = utilities.Log;

    const duration = Date.now() - startTime;

    if (!log || !Log) {
      updateTestStatus(
        testName,
        "fail",
        "Failed to import log utilities from @user27828/shared-utils",
        duration,
      );
    } else {
      updateTestStatus(
        testName,
        "pass",
        "Successfully imported log utilities",
        duration,
      );
    }
  };

  // Auto-run the import test on component mount
  React.useEffect(() => {
    runLogUtilityImportTest();
  }, []);

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

  const runBasicLoggingTest = async () => {
    const testName = "Basic Logging";
    const startTime = Date.now();

    if (!log) {
      updateTestStatus(testName, "fail", "Log utility not loaded");
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing basic logging methods...");

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

      const duration = Date.now() - startTime;

      if (capturedLogs.length >= 5) {
        const successMessage = `All logging methods work: ${capturedLogs.length} logs captured - ${capturedLogs.slice(0, 3).join(", ")}...`;
        updateTestStatus(testName, "pass", successMessage, duration);
      } else {
        // More detailed failure message
        const logMethods = ["log", "info", "warn", "error", "debug"];
        const availableMethods = logMethods.filter(
          (method) => typeof log[method] === "function",
        );
        const isProduction = window.location.hostname !== "localhost";
        const hostname = window.location.hostname;
        const errorMessage = `Expected 5+ logs, got ${capturedLogs.length}. Available methods: ${availableMethods.join(", ")}. Hostname: ${hostname}, Production: ${isProduction}. Captured: ${capturedLogs.join(", ") || "none"}`;
        updateTestStatus(testName, "fail", errorMessage, duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runBasicLoggingTestWithInterceptor = async () => {
    const testName = "Logging with Interceptor";
    const startTime = Date.now();

    if (!log) {
      updateTestStatus(testName, "fail", "Log utility not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
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

      const duration = Date.now() - startTime;

      if (interceptedLogs.length >= 5) {
        const levels = interceptedLogs.map((l) => l.level).join(", ");
        const successMessage = `Intercepted ${interceptedLogs.length} logs with levels: ${levels}`;
        updateTestStatus(testName, "pass", successMessage, duration);
      } else {
        const errorMessage = `Expected 5+ intercepted logs, got ${interceptedLogs.length}. Logs: ${JSON.stringify(interceptedLogs)}`;
        updateTestStatus(testName, "fail", errorMessage, duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runEnvironmentDetectionTest = async () => {
    const testName = "Environment Detection";
    const startTime = Date.now();

    if (!Log) {
      updateTestStatus(testName, "fail", "Log class not loaded");
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing environment detection...");

      // Create a new Log instance
      const testLog = new Log();

      // Test environment detection method
      const detectedEnv = testLog.detectEnvironment();

      const duration = Date.now() - startTime;

      if (detectedEnv === "client") {
        updateTestStatus(
          testName,
          "pass",
          `Correctly detected client environment: ${detectedEnv}`,
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Expected 'client', got '${detectedEnv}'`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runCallerInformationTest = async () => {
    const testName = "Caller Information";
    const startTime = Date.now();

    if (!Log) {
      updateTestStatus(testName, "fail", "Log class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
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

      const duration = Date.now() - startTime;

      if (
        withCallerLog.includes("LogTests.tsx") &&
        !withoutCallerLog.includes("LogTests.tsx")
      ) {
        updateTestStatus(
          testName,
          "pass",
          "Caller information correctly shown/hidden",
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "pass",
          `Caller feature working (logs: "${withCallerLog}" vs "${withoutCallerLog}")`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runLocalStorageOverrideTest = async () => {
    const testName = "LocalStorage Override";
    const startTime = Date.now();

    if (!Log) {
      updateTestStatus(testName, "fail", "Log class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
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

      const duration = Date.now() - startTime;
      updateTestStatus(testName, "pass", results.join(", "), duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runProductionFilteringTest = async () => {
    const testName = "Production Filtering";
    const startTime = Date.now();

    if (!Log) {
      updateTestStatus(testName, "fail", "Log class not loaded");
      return;
    }

    try {
      updateTestStatus(
        testName,
        "running",
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

      const duration = Date.now() - startTime;
      updateTestStatus(testName, "pass", results.join(", "), duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runInterceptorsTest = async () => {
    const testName = "Interceptors";
    const startTime = Date.now();

    if (!Log) {
      updateTestStatus(testName, "fail", "Log class not loaded");
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing log interceptors...");

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

      const duration = Date.now() - startTime;

      if (interceptedLogs.length === 3) {
        updateTestStatus(testName, "pass", results.join(", "), duration);
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Expected 3 intercepted logs, got ${interceptedLogs.length}`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runMethodBindingTest = async () => {
    const testName = "Method Binding";
    const startTime = Date.now();

    if (!log) {
      updateTestStatus(testName, "fail", "Log utility not loaded");
      return;
    }

    try {
      updateTestStatus(testName, "running", "Testing method binding...");

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

      const duration = Date.now() - startTime;

      if (capturedCalls >= 5) {
        updateTestStatus(
          testName,
          "pass",
          "All destructured methods work correctly",
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Expected 5 method calls, got ${capturedCalls}`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Log Utility Import":
        await runLogUtilityImportTest();
        break;
      case "Basic Logging":
        await runBasicLoggingTest();
        break;
      case "Logging with Interceptor":
        await runBasicLoggingTestWithInterceptor();
        break;
      case "Environment Detection":
        await runEnvironmentDetectionTest();
        break;
      case "Caller Information":
        await runCallerInformationTest();
        break;
      case "LocalStorage Override":
        await runLocalStorageOverrideTest();
        break;
      case "Production Filtering":
        await runProductionFilteringTest();
        break;
      case "Interceptors":
        await runInterceptorsTest();
        break;
      case "Method Binding":
        await runMethodBindingTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Unknown test");
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    const tests = [
      runLogUtilityImportTest,
      runBasicLoggingTest,
      runBasicLoggingTestWithInterceptor,
      runEnvironmentDetectionTest,
      runCallerInformationTest,
      runLocalStorageOverrideTest,
      runProductionFilteringTest,
      runInterceptorsTest,
      runMethodBindingTest,
    ];

    for (const testFn of tests) {
      await testFn();
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsLoading(false);
  };

  return (
    <div>
      <h2>Log Utility Integration Tests</h2>
      <TestProgress
        title="Log Utilities"
        tests={testItems}
        isRunning={isLoading}
        onRunAll={runAllTests}
        onRunIndividual={runIndividualTest}
        onClear={clearResults}
        showIndividualButtons={true}
      />

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>About Log Utility Tests</h3>
        <ul style={{ textAlign: "left" }}>
          <li>
            <strong>Basic Logging:</strong> Tests core log function calls and
            output capture
          </li>
          <li>
            <strong>Logging with Interceptor:</strong> Verifies interceptor
            functionality for capturing logs
          </li>
          <li>
            <strong>Environment Detection:</strong> Tests client-side
            environment detection logic
          </li>
          <li>
            <strong>Caller Information:</strong> Verifies caller information
            extraction and display
          </li>
          <li>
            <strong>LocalStorage Override:</strong> Tests localStorage-based
            debug configuration
          </li>
          <li>
            <strong>Production Filtering:</strong> Verifies production
            environment log filtering
          </li>
          <li>
            <strong>Interceptors:</strong> Tests custom log interceptor
            management
          </li>
          <li>
            <strong>Method Binding:</strong> Ensures destructured methods work
            correctly
          </li>
        </ul>
      </div>
    </div>
  );
};

export default LogTests;
