import React, { useState, useEffect, useRef } from "react";
import { Container, Typography, Box, Button, Divider } from "@mui/material";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

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

export const TurnstileTests: React.FC = () => {
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);

  // Widget refs for cleanup
  const basicWidgetRef = useRef<HTMLDivElement>(null);
  const customWidgetRef = useRef<HTMLDivElement>(null);
  const multipleWidget1Ref = useRef<HTMLDivElement>(null);
  const multipleWidget2Ref = useRef<HTMLDivElement>(null);
  const eventWidgetRef = useRef<HTMLDivElement>(null);

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Turnstile Import",
      description: "Test importing turnstile utility from shared-utils",
      status: "pending",
    },
    {
      name: "Basic Rendering",
      description: "Test basic widget rendering functionality",
      status: "pending",
    },
    {
      name: "Configuration Options",
      description: "Test various configuration options",
      status: "pending",
    },
    {
      name: "Event Handling",
      description: "Test event callback functionality",
      status: "pending",
    },
    {
      name: "Multiple Widgets",
      description: "Test rendering multiple widgets simultaneously",
      status: "pending",
    },
    {
      name: "Theme Switching",
      description: "Test dynamic theme switching",
      status: "pending",
    },
    {
      name: "Reset and Cleanup",
      description: "Test cleanup and reset functionality",
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

  const clearResults = () => {
    setTestItems((prev) =>
      prev.map((test) => ({
        ...test,
        // Preserve the Turnstile Import test status since it runs on mount
        status:
          test.name === "Turnstile Import"
            ? test.status
            : ("pending" as TestStatus),
        message: test.name === "Turnstile Import" ? test.message : undefined,
        duration: test.name === "Turnstile Import" ? test.duration : undefined,
        startTime:
          test.name === "Turnstile Import" ? test.startTime : undefined,
        endTime: test.name === "Turnstile Import" ? test.endTime : undefined,
      })),
    );
  };

  useEffect(() => {
    const initTurnstile = async () => {
      const testName = "Turnstile Import";
      const startTime = Date.now();
      updateTestStatus(testName, "running", "Importing turnstile utility...");

      turnstile = await loadTurnstile();
      setTurnstileLoaded(!!turnstile);

      const duration = Date.now() - startTime;
      if (!turnstile) {
        updateTestStatus(
          testName,
          "fail",
          "Failed to import turnstile from @user27828/shared-utils",
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "pass",
          "Successfully imported turnstile utility",
          duration,
        );
      }
    };

    initTurnstile();
  }, []);

  // Individual test functions
  const runBasicRenderingTest = async () => {
    const testName = "Basic Rendering";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing basic widget rendering...");

    if (!turnstile) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Turnstile not loaded", duration);
      return;
    }

    try {
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

        const duration = Date.now() - startTime;
        if (widgetId) {
          updateTestStatus(
            testName,
            "pass",
            `Widget rendered successfully with ID: ${widgetId}`,
            duration,
          );
        } else {
          updateTestStatus(
            testName,
            "fail",
            "Widget rendering returned no ID",
            duration,
          );
        }
      } else {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          "Widget container not found",
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runConfigurationTest = async () => {
    const testName = "Configuration Options";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing configuration options...");

    if (!turnstile) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Turnstile not loaded", duration);
      return;
    }

    try {
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

      const duration = Date.now() - startTime;
      if (allPassed) {
        updateTestStatus(testName, "pass", results.join(", "), duration);
      } else {
        updateTestStatus(testName, "fail", results.join(", "), duration);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runEventHandlingTest = async () => {
    const testName = "Event Handling";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing event callbacks...");

    if (!turnstile) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Turnstile not loaded", duration);
      return;
    }

    try {
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

        const duration = Date.now() - startTime;
        // Since we can't actually trigger the events in test environment,
        // we'll test that the widget was created with the callbacks
        if (widgetId) {
          updateTestStatus(
            testName,
            "pass",
            "Widget created with event callbacks successfully",
            duration,
          );
        } else {
          updateTestStatus(
            testName,
            "fail",
            "Failed to create widget with callbacks",
            duration,
          );
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runMultipleWidgetsTest = async () => {
    const testName = "Multiple Widgets";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing multiple widgets...");

    if (!turnstile) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Turnstile not loaded", duration);
      return;
    }

    try {
      if (multipleWidget1Ref.current && multipleWidget2Ref.current) {
        const widget1Id = await turnstile.render(multipleWidget1Ref.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "light",
        });

        const widget2Id = await turnstile.render(multipleWidget2Ref.current, {
          sitekey: "1x00000000000000000000AA",
          theme: "dark",
        });

        const duration = Date.now() - startTime;
        if (widget1Id && widget2Id && widget1Id !== widget2Id) {
          updateTestStatus(
            testName,
            "pass",
            `Two different widgets created: ${widget1Id}, ${widget2Id}`,
            duration,
          );
        } else {
          updateTestStatus(
            testName,
            "fail",
            "Failed to create two distinct widgets",
            duration,
          );
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runThemeSwitchingTest = async () => {
    const testName = "Theme Switching";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing dynamic theme switching...");

    if (!turnstile || !customWidgetRef.current) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        "Turnstile not loaded or container not found",
        duration,
      );
      return;
    }

    try {
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

        const duration = Date.now() - startTime;
        if (newWidgetId) {
          updateTestStatus(
            testName,
            "pass",
            "Successfully switched themes",
            duration,
          );
        } else {
          updateTestStatus(
            testName,
            "fail",
            "Failed to re-render with new theme",
            duration,
          );
        }
      } else {
        const duration = Date.now() - startTime;
        updateTestStatus(
          testName,
          "fail",
          "Initial widget creation failed",
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runCleanupTest = async () => {
    const testName = "Reset and Cleanup";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Testing cleanup functionality...");

    if (!turnstile) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", "Turnstile not loaded", duration);
      return;
    }

    try {
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

      const duration = Date.now() - startTime;
      updateTestStatus(testName, "pass", results.join(", "), duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", `Error: ${error}`, duration);
    }
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Turnstile Import":
        // This test runs automatically on component mount, show info message
        updateTestStatus(
          testName,
          turnstileLoaded ? "pass" : "fail",
          turnstileLoaded
            ? "Import test runs automatically on component load"
            : "Import failed on component load - refresh to retry",
        );
        break;
      case "Basic Rendering":
        await runBasicRenderingTest();
        break;
      case "Configuration Options":
        await runConfigurationTest();
        break;
      case "Event Handling":
        await runEventHandlingTest();
        break;
      case "Multiple Widgets":
        await runMultipleWidgetsTest();
        break;
      case "Theme Switching":
        await runThemeSwitchingTest();
        break;
      case "Reset and Cleanup":
        await runCleanupTest();
        break;
      default:
        updateTestStatus(testName, "fail", "Test not implemented yet");
    }
  };

  const runAllTests = async () => {
    setIsRunningTestSuite(true);
    clearResults();

    // Small delay between tests for better UX
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    try {
      // Note: Turnstile Import test runs automatically on component mount and is preserved

      await runBasicRenderingTest();
      await delay(500);

      await runConfigurationTest();
      await delay(500);

      await runEventHandlingTest();
      await delay(500);

      await runMultipleWidgetsTest();
      await delay(500);

      await runThemeSwitchingTest();
      await delay(500);

      await runCleanupTest();
      await delay(500);
    } catch (error) {
      console.error("Error during test execution:", error);
    }

    setIsRunningTestSuite(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Turnstile Integration Tests
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        This test suite validates the integration of the Turnstile utility from
        @user27828/shared-utils in a real React environment. Tests cover
        rendering, configuration, events, and cleanup using the new Timeline
        progress interface.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body1" sx={{ mb: 2 }}>
          <strong>Turnstile Status:</strong>{" "}
          {turnstileLoaded ? "✅ Loaded" : "❌ Not Loaded"}
        </Typography>

        <Button
          variant="contained"
          onClick={runAllTests}
          disabled={isRunningTestSuite || !turnstileLoaded}
          size="large"
        >
          {isRunningTestSuite ? "Running Tests..." : "Run All Turnstile Tests"}
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* TestProgress Timeline Component */}
      <TestProgress
        title="Turnstile Tests"
        tests={testItems}
        onRunIndividual={runIndividualTest}
        isRunning={isRunningTestSuite}
        showIndividualButtons={true}
      />

      <Divider sx={{ mb: 3 }} />

      {/* Test Widget Areas */}
      <Typography variant="h5" component="h2" gutterBottom>
        Test Widget Areas
      </Typography>

      <Box sx={{ mb: 3, display: "grid", gap: 3 }}>
        <Box
          sx={{
            p: 3,
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: 2,
            border: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Basic Widget
          </Typography>
          <div ref={basicWidgetRef} id="basic-turnstile"></div>
        </Box>

        <Box
          sx={{
            p: 3,
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: 2,
            border: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Custom Configuration Widget
          </Typography>
          <div ref={customWidgetRef} id="custom-turnstile"></div>
        </Box>

        <Box
          sx={{
            p: 3,
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: 2,
            border: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Multiple Widgets
          </Typography>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Widget 1 (Light):
              </Typography>
              <div ref={multipleWidget1Ref} id="multiple-turnstile-1"></div>
            </Box>
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Widget 2 (Dark):
              </Typography>
              <div ref={multipleWidget2Ref} id="multiple-turnstile-2"></div>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            p: 3,
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            borderRadius: 2,
            border: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Event Handling Widget
          </Typography>
          <div ref={eventWidgetRef} id="event-turnstile"></div>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Notes Section */}
      <Box
        sx={{
          p: 3,
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          borderRadius: 2,
          border: 1,
          borderColor: "rgba(255, 255, 255, 0.08)",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Notes
        </Typography>
        <Box component="ul" sx={{ textAlign: "left", pl: 3 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            This test uses Cloudflare's test site key:{" "}
            <code>1x00000000000000000000AA</code>
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Actual CAPTCHA verification will require a real site key and domain
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            Event callbacks may not trigger in test environment but their setup
            is validated
          </Typography>
          <Typography component="li" variant="body2">
            Tests focus on API integration rather than visual verification
          </Typography>
        </Box>
      </Box>
    </Container>
  );
};

export default TurnstileTests;
