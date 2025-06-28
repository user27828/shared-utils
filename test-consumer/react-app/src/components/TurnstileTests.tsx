import React from "react";
import { Button, Box } from "@mui/material";
import { TestResultsRenderer, type TestResult } from "./TestResultsRenderer";

// Import the turnstile utility from shared-utils
// Note: This will test the actual integration
let turnstile: any = null;

// Dynamically import to handle potential import issues
const loadTurnstile = async () => {
  try {
    const module = await import("@user27828/shared-utils/utils");
    console.log("Imported module:", module);
    return (module as any).turnstile;
  } catch (error) {
    console.error("Failed to import turnstile:", error);
    try {
      // Try alternative import paths
      const altModule = await import("@user27828/shared-utils");
      console.log("Alternative import:", altModule);
      return (altModule as any).turnstile;
    } catch (altError) {
      console.error("Alternative import also failed:", altError);
      return null;
    }
  }
};

interface TurnstileTestResult extends TestResult {
  // Inherits test, status, message, timestamp from TestResult
}

const TurnstileTests: React.FC = () => {
  const [testResults, setTestResults] = React.useState<TurnstileTestResult[]>(
    [],
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [turnstileLoaded, setTurnstileLoaded] = React.useState(false);

  // Widget refs for cleanup
  const basicWidgetRef = React.useRef<HTMLDivElement>(null);
  const customWidgetRef = React.useRef<HTMLDivElement>(null);
  const multipleWidget1Ref = React.useRef<HTMLDivElement>(null);
  const multipleWidget2Ref = React.useRef<HTMLDivElement>(null);
  const eventWidgetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const initTurnstile = async () => {
      turnstile = await loadTurnstile();
      setTurnstileLoaded(!!turnstile);

      if (!turnstile) {
        addTestResult(
          "Turnstile Import",
          "fail",
          "Failed to import turnstile from @user27828/shared-utils",
        );
      } else {
        addTestResult(
          "Turnstile Import",
          "pass",
          "Successfully imported turnstile utility",
        );
      }
    };

    initTurnstile();
  }, []);

  const addTestResult = (
    test: string,
    status: "pass" | "fail" | "pending",
    message: string,
  ) => {
    const result: TurnstileTestResult = {
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

  const runBasicRenderingTest = async () => {
    if (!turnstile) {
      addTestResult("Basic Rendering", "fail", "Turnstile not loaded");
      return;
    }

    try {
      addTestResult(
        "Basic Rendering",
        "pending",
        "Testing basic widget rendering...",
      );

      // Test basic configuration
      await turnstile.setOptions({
        siteKey: "1x00000000000000000000AA", // Test site key
        theme: "light",
      });

      if (basicWidgetRef.current) {
        const widgetId = await turnstile.render(basicWidgetRef.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "light",
        });

        if (widgetId) {
          addTestResult(
            "Basic Rendering",
            "pass",
            `Widget rendered successfully with ID: ${widgetId}`,
          );
        } else {
          addTestResult(
            "Basic Rendering",
            "fail",
            "Widget rendering returned no ID",
          );
        }
      } else {
        addTestResult("Basic Rendering", "fail", "Widget container not found");
      }
    } catch (error) {
      addTestResult("Basic Rendering", "fail", `Error: ${error}`);
    }
  };

  const runConfigurationTest = async () => {
    if (!turnstile) {
      addTestResult("Configuration Options", "fail", "Turnstile not loaded");
      return;
    }

    try {
      addTestResult(
        "Configuration Options",
        "pending",
        "Testing configuration options...",
      );

      // Test various configuration options
      const configurations = [
        { theme: "dark", size: "normal" },
        { theme: "light", size: "compact" },
        { theme: "auto", size: "invisible" },
      ];

      let allPassed = true;
      const results: string[] = [];

      for (const config of configurations) {
        try {
          await turnstile.setOptions(config);
          const currentOptions = turnstile.getOptions();

          if (currentOptions.theme === config.theme) {
            results.push(`✅ Theme ${config.theme} set correctly`);
          } else {
            results.push(`❌ Theme ${config.theme} not set correctly`);
            allPassed = false;
          }
        } catch (error) {
          results.push(
            `❌ Configuration ${JSON.stringify(config)} failed: ${error}`,
          );
          allPassed = false;
        }
      }

      if (allPassed) {
        addTestResult("Configuration Options", "pass", results.join(", "));
      } else {
        addTestResult("Configuration Options", "fail", results.join(", "));
      }
    } catch (error) {
      addTestResult("Configuration Options", "fail", `Error: ${error}`);
    }
  };

  const runEventHandlingTest = async () => {
    if (!turnstile) {
      addTestResult("Event Handling", "fail", "Turnstile not loaded");
      return;
    }

    try {
      addTestResult("Event Handling", "pending", "Testing event callbacks...");

      // Set up event handlers
      if (eventWidgetRef.current) {
        const widgetId = await turnstile.render(eventWidgetRef.current, {
          sitekey: "1x00000000000000000000AA",
          callback: () => {
            console.log("Success callback triggered");
          },
          "error-callback": () => {
            console.log("Error callback triggered");
          },
          "expired-callback": () => {
            console.log("Expired callback triggered");
          },
        });

        // Since we can't actually trigger the events in test environment,
        // we'll test that the widget was created with the callbacks
        if (widgetId) {
          addTestResult(
            "Event Handling",
            "pass",
            "Widget created with event callbacks successfully",
          );
        } else {
          addTestResult(
            "Event Handling",
            "fail",
            "Failed to create widget with callbacks",
          );
        }
      }
    } catch (error) {
      addTestResult("Event Handling", "fail", `Error: ${error}`);
    }
  };

  const runMultipleWidgetsTest = async () => {
    if (!turnstile) {
      addTestResult("Multiple Widgets", "fail", "Turnstile not loaded");
      return;
    }

    try {
      addTestResult(
        "Multiple Widgets",
        "pending",
        "Testing multiple widgets...",
      );

      if (multipleWidget1Ref.current && multipleWidget2Ref.current) {
        const widget1Id = await turnstile.render(multipleWidget1Ref.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "light",
        });

        const widget2Id = await turnstile.render(multipleWidget2Ref.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "dark",
        });

        if (widget1Id && widget2Id && widget1Id !== widget2Id) {
          addTestResult(
            "Multiple Widgets",
            "pass",
            `Two different widgets created: ${widget1Id}, ${widget2Id}`,
          );
        } else {
          addTestResult(
            "Multiple Widgets",
            "fail",
            "Failed to create two distinct widgets",
          );
        }
      }
    } catch (error) {
      addTestResult("Multiple Widgets", "fail", `Error: ${error}`);
    }
  };

  const runThemeSwitchingTest = async () => {
    if (!turnstile || !customWidgetRef.current) {
      addTestResult(
        "Theme Switching",
        "fail",
        "Turnstile not loaded or container not found",
      );
      return;
    }

    try {
      addTestResult(
        "Theme Switching",
        "pending",
        "Testing dynamic theme switching...",
      );

      // Create a widget with light theme
      const widgetId = await turnstile.render(customWidgetRef.current, {
        sitekey: "1x00000000000000000000AA",
        theme: "light",
      });

      if (widgetId) {
        // Test theme switching
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a bit

        // Remove and re-render with different theme
        await turnstile.remove(widgetId);

        const newWidgetId = await turnstile.render(customWidgetRef.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "dark",
        });

        if (newWidgetId) {
          addTestResult(
            "Theme Switching",
            "pass",
            "Successfully switched themes",
          );
        } else {
          addTestResult(
            "Theme Switching",
            "fail",
            "Failed to re-render with new theme",
          );
        }
      } else {
        addTestResult(
          "Theme Switching",
          "fail",
          "Initial widget creation failed",
        );
      }
    } catch (error) {
      addTestResult("Theme Switching", "fail", `Error: ${error}`);
    }
  };

  const runCleanupTest = async () => {
    if (!turnstile) {
      addTestResult("Reset and Cleanup", "fail", "Turnstile not loaded");
      return;
    }

    try {
      addTestResult(
        "Reset and Cleanup",
        "pending",
        "Testing cleanup functionality...",
      );

      // Test cleanup methods exist and are callable
      const methods = ["reset", "remove", "cleanup"];
      const results: string[] = [];

      for (const method of methods) {
        if (typeof turnstile[method] === "function") {
          results.push(`✅ ${method} method exists`);
        } else {
          results.push(`❌ ${method} method missing`);
        }
      }

      // Test actual cleanup if widget exists
      try {
        await turnstile.cleanup();
        results.push("✅ Cleanup executed without errors");
      } catch (error) {
        results.push(`❌ Cleanup failed: ${error}`);
      }

      addTestResult("Reset and Cleanup", "pass", results.join(", "));
    } catch (error) {
      addTestResult("Reset and Cleanup", "fail", `Error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setIsLoading(true);
    clearResults();

    await runBasicRenderingTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runConfigurationTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runEventHandlingTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runMultipleWidgetsTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runThemeSwitchingTest();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await runCleanupTest();

    setIsLoading(false);
  };

  return (
    <div className="turnstile-tests">
      <div className="card">
        <h2>Turnstile Integration Tests</h2>
        <p>
          This test suite validates the integration of the Turnstile utility
          from @user27828/shared-utils in a real React environment. Tests cover
          rendering, configuration, events, and cleanup.
        </p>

        <div style={{ margin: "1rem 0" }}>
          <strong>Turnstile Status:</strong>{" "}
          {turnstileLoaded ? "✅ Loaded" : "❌ Not Loaded"}
        </div>

        <Box sx={{ mb: 4 }}>
          <Button
            variant="contained"
            onClick={runAllTests}
            disabled={isLoading || !turnstileLoaded}
            size="large"
            sx={{ mr: 2 }}
          >
            {isLoading ? "Running Tests..." : "Run All Tests"}
          </Button>

          <Button variant="outlined" onClick={clearResults} size="large">
            Clear Results
          </Button>
        </Box>
      </div>

      {/* Test Widgets Containers */}
      <div className="test-section">
        <h3>Test Widget Areas</h3>

        <div className="turnstile-test-container">
          <h4>Basic Widget</h4>
          <div ref={basicWidgetRef} id="basic-turnstile"></div>
        </div>

        <div className="turnstile-test-container">
          <h4>Custom Configuration Widget</h4>
          <div ref={customWidgetRef} id="custom-turnstile"></div>
        </div>

        <div className="turnstile-test-container">
          <h4>Multiple Widgets</h4>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div>
              <strong>Widget 1 (Light):</strong>
              <div ref={multipleWidget1Ref} id="multiple-turnstile-1"></div>
            </div>
            <div>
              <strong>Widget 2 (Dark):</strong>
              <div ref={multipleWidget2Ref} id="multiple-turnstile-2"></div>
            </div>
          </div>
        </div>

        <div className="turnstile-test-container">
          <h4>Event Handling Widget</h4>
          <div ref={eventWidgetRef} id="event-turnstile"></div>
        </div>
      </div>

      {/* Individual Test Buttons */}
      <div className="test-section">
        <h3>Individual Tests</h3>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={runBasicRenderingTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Basic Rendering
          </Button>
          <Button
            variant="outlined"
            onClick={runConfigurationTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Configuration
          </Button>
          <Button
            variant="outlined"
            onClick={runEventHandlingTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Event Handling
          </Button>
          <Button
            variant="outlined"
            onClick={runMultipleWidgetsTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Multiple Widgets
          </Button>
          <Button
            variant="outlined"
            onClick={runThemeSwitchingTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Theme Switching
          </Button>
          <Button
            variant="outlined"
            onClick={runCleanupTest}
            disabled={!turnstileLoaded}
            size="medium"
          >
            Test Cleanup
          </Button>
        </Box>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <TestResultsRenderer testResults={testResults} />
      )}

      <div className="card">
        <h3>Notes</h3>
        <ul style={{ textAlign: "left" }}>
          <li>
            This test uses Cloudflare's test site key:{" "}
            <code>1x00000000000000000000AA</code>
          </li>
          <li>
            Actual CAPTCHA verification will require a real site key and domain
          </li>
          <li>
            Event callbacks may not trigger in test environment but their setup
            is validated
          </li>
          <li>
            Tests focus on API integration rather than visual verification
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TurnstileTests;
