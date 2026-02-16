import React, { useState, useEffect } from "react";
import {
  Button,
  Box,
  Typography,
  Container,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import { TestProgress, type TestItem, type TestStatus } from "./TestProgress";

export const ServerIntegrationTests: React.FC = () => {
  const [isRunningTestSuite, setIsRunningTestSuite] = useState<boolean>(false);
  const [serverTestsAvailable, setServerTestsAvailable] = useState(false);

  const [testItems, setTestItems] = useState<TestItem[]>([
    {
      name: "Server Test Consumer Health Check",
      description: "Check if server test consumer is running",
      status: "pending",
    },
    {
      name: "Server Communication Test",
      description: "Test communication with server test consumer",
      status: "pending",
    },
    {
      name: "Server-side Functionality Tests",
      description: "Execute and validate server-side test suite",
      status: "pending",
    },
    {
      name: "CMS Connector Conformance",
      description:
        "Validate CMS connector conformance suite results from the server test consumer",
      status: "pending",
    },
    {
      name: "FM Connector Conformance",
      description:
        "Validate File Manager connector conformance suite results from the server test consumer",
      status: "pending",
    },
    {
      name: "Server Test Results Validation",
      description: "Validate and process server test results",
      status: "pending",
    },
    {
      name: "Integration Test Summary",
      description: "Overall server integration test assessment",
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
        // Preserve the health check test status since it runs on mount
        status:
          test.name === "Server Test Consumer Health Check"
            ? test.status
            : ("pending" as TestStatus),
        message:
          test.name === "Server Test Consumer Health Check"
            ? test.message
            : undefined,
        duration:
          test.name === "Server Test Consumer Health Check"
            ? test.duration
            : undefined,
        startTime:
          test.name === "Server Test Consumer Health Check"
            ? test.startTime
            : undefined,
        endTime:
          test.name === "Server Test Consumer Health Check"
            ? test.endTime
            : undefined,
      })),
    );
  };

  useEffect(() => {
    // Check if the dedicated server test consumer is running
    checkServerTestConsumer();
  }, []);

  const checkServerTestConsumer = async () => {
    const testName = "Server Test Consumer Health Check";
    const startTime = Date.now();
    updateTestStatus(
      testName,
      "running",
      "Checking server test consumer availability...",
    );

    try {
      const response = await fetch("http://localhost:8030/health");
      const duration = Date.now() - startTime;

      if (response.ok) {
        setServerTestsAvailable(true);
        updateTestStatus(
          testName,
          "pass",
          "Server test consumer is running at http://localhost:8030",
          duration,
        );
      } else {
        setServerTestsAvailable(false);
        updateTestStatus(
          testName,
          "fail",
          `Server responded with status: ${response.status}`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      setServerTestsAvailable(false);
      updateTestStatus(
        testName,
        "fail",
        "Server test consumer not running. Start it with: cd test-consumer/server && node index.js",
        duration,
      );
    }
  };

  // Individual test functions
  const runServerCommunicationTest = async () => {
    const testName = "Server Communication Test";
    const startTime = Date.now();

    updateTestStatus(
      testName,
      "running",
      "Testing communication with server...",
    );

    if (!serverTestsAvailable) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        "Server test consumer is not running. Please start it first.",
        duration,
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:8030/health");
      const duration = Date.now() - startTime;

      if (response.ok) {
        updateTestStatus(
          testName,
          "pass",
          "Successfully communicated with server test consumer",
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Server communication failed with status: ${response.status}`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Failed to communicate with server: ${error}`,
        duration,
      );
    }
  };

  const runServerFunctionalityTests = async () => {
    const testName = "Server-side Functionality Tests";
    const startTime = Date.now();

    updateTestStatus(
      testName,
      "running",
      "Executing server-side test suite...",
    );

    if (!serverTestsAvailable) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        "Server test consumer is not running. Cannot execute server tests.",
        duration,
      );
      return;
    }

    try {
      const response = await fetch("http://localhost:8030/test");
      const serverResults = await response.json();
      const duration = Date.now() - startTime;

      if (response.ok) {
        updateTestStatus(
          testName,
          "pass",
          `Server tests executed: ${serverResults.summary.passed}/${serverResults.summary.total} passed`,
          duration,
        );
        return serverResults;
      } else {
        updateTestStatus(
          testName,
          "fail",
          `Server test endpoint returned error: ${response.status}`,
          duration,
        );
        return null;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Failed to execute server tests: ${error}`,
        duration,
      );
      return null;
    }
  };

  const fetchServerResults = async () => {
    if (!serverTestsAvailable) {
      throw new Error(
        "Server test consumer is not running. Start it with: cd test-consumer/server && node index.js",
      );
    }

    const response = await fetch("http://localhost:8030/test");
    if (!response.ok) {
      throw new Error(
        `Server test endpoint returned status: ${response.status}`,
      );
    }

    return response.json();
  };

  const runConformanceSuiteCheck = async (suiteName: "cms" | "fm") => {
    const testName =
      suiteName === "cms"
        ? "CMS Connector Conformance"
        : "FM Connector Conformance";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Fetching conformance results...");

    try {
      const serverResults = await fetchServerResults();

      if (!serverResults || !serverResults.tests) {
        throw new Error("Invalid server results structure");
      }

      const summaryKey =
        suiteName === "cms"
          ? "cms-conformance-summary"
          : "fm-conformance-summary";
      const suiteSummary = serverResults.tests[summaryKey];

      if (!suiteSummary) {
        throw new Error(
          `Missing ${summaryKey} in server results. (Ensure server was rebuilt and the server test consumer is running.)`,
        );
      }

      const duration = Date.now() - startTime;
      const status = suiteSummary.status;
      const details = suiteSummary.details ?? {};

      if (status === "passed") {
        const passed =
          typeof details.passed === "number" ? details.passed : undefined;
        const total =
          typeof details.total === "number" ? details.total : undefined;
        const msg =
          passed !== undefined && total !== undefined
            ? `✅ ${suiteName.toUpperCase()} conformance passed (${passed}/${total})`
            : `✅ ${suiteName.toUpperCase()} conformance passed`;

        updateTestStatus(testName, "pass", msg, duration);
        return;
      }

      const failed =
        typeof details.failed === "number" ? details.failed : undefined;
      const msg =
        failed !== undefined
          ? `${suiteName.toUpperCase()} conformance failed (${failed} failed)`
          : `${suiteName.toUpperCase()} conformance failed`;

      updateTestStatus(testName, "fail", msg, duration);
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(testName, "fail", (error as Error).message, duration);
    }
  };

  const runServerResultsValidation = async (serverResults: any) => {
    const testName = "Server Test Results Validation";
    const startTime = Date.now();

    updateTestStatus(testName, "running", "Validating server test results...");

    if (!serverResults) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        "No server results to validate",
        duration,
      );
      return null;
    }

    try {
      const duration = Date.now() - startTime;

      // Validate structure
      if (!serverResults.summary || !serverResults.tests) {
        updateTestStatus(
          testName,
          "fail",
          "Invalid server results structure",
          duration,
        );
        return null;
      }

      const testCount = Object.keys(serverResults.tests).length;
      const summary = serverResults.summary;

      updateTestStatus(
        testName,
        "pass",
        `Validated ${testCount} server test results. Summary: ${summary.passed} passed, ${summary.failed} failed`,
        duration,
      );

      return serverResults;
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Failed to validate server results: ${error}`,
        duration,
      );
      return null;
    }
  };

  const runIntegrationTestSummary = async (serverResults: any) => {
    const testName = "Integration Test Summary";
    const startTime = Date.now();

    updateTestStatus(
      testName,
      "running",
      "Generating integration test summary...",
    );

    try {
      const duration = Date.now() - startTime;

      if (!serverResults) {
        updateTestStatus(
          testName,
          "fail",
          "Cannot generate summary - no valid server results",
          duration,
        );
        return;
      }

      const summary = serverResults.summary;

      if (summary.failed > 0) {
        updateTestStatus(
          testName,
          "fail",
          `Server integration incomplete: ${summary.failed} failed, ${summary.passed} passed`,
          duration,
        );
      } else {
        updateTestStatus(
          testName,
          "pass",
          `✅ Full server integration successful! All ${summary.total} server tests passed`,
          duration,
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateTestStatus(
        testName,
        "fail",
        `Failed to generate integration summary: ${error}`,
        duration,
      );
    }
  };

  const runIndividualTest = async (testName: string) => {
    switch (testName) {
      case "Server Test Consumer Health Check":
        await checkServerTestConsumer();
        break;
      case "Server Communication Test":
        await runServerCommunicationTest();
        break;
      case "Server-side Functionality Tests":
        await runServerFunctionalityTests();
        break;
      case "CMS Connector Conformance":
        await runConformanceSuiteCheck("cms");
        break;
      case "FM Connector Conformance":
        await runConformanceSuiteCheck("fm");
        break;
      case "Server Test Results Validation":
        // This test needs server results, so run the full sequence
        const results = await runServerFunctionalityTests();
        await runServerResultsValidation(results);
        break;
      case "Integration Test Summary":
        // This test needs server results, so run the full sequence
        const fullResults = await runServerFunctionalityTests();
        const validatedResults = await runServerResultsValidation(fullResults);
        await runIntegrationTestSummary(validatedResults);
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
      // Note: Health check test runs automatically on component mount and is preserved

      await runServerCommunicationTest();
      await delay(500);

      const serverResults = await runServerFunctionalityTests();
      await delay(500);

      await runConformanceSuiteCheck("cms");
      await delay(500);

      await runConformanceSuiteCheck("fm");
      await delay(500);

      const validatedResults = await runServerResultsValidation(serverResults);
      await delay(500);

      await runIntegrationTestSummary(validatedResults);
      await delay(500);
    } catch (error) {
      console.error("Error during test execution:", error);
    }

    setIsRunningTestSuite(false);
  };

  const openServerTestConsumer = () => {
    window.open("http://localhost:8030/test", "_blank");
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Server Integration Tests
      </Typography>

      <Typography variant="body1" sx={{ mb: 3 }}>
        This test suite validates the server-side functionality of the
        @user27828/shared-utils library by communicating with the dedicated
        server test consumer running in a Node.js environment using the new
        Timeline progress interface.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Architecture:</strong> Server tests run in a dedicated Node.js
        environment at <code>test-consumer/server</code> where server-side code
        can be properly executed and tested. This browser-based interface
        communicates with that server to fetch and display results.
      </Alert>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Server Test Consumer Status
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
          <Chip
            label={serverTestsAvailable ? "✅ Running" : "❌ Not Running"}
            color={serverTestsAvailable ? "success" : "error"}
            variant="outlined"
          />
          <Typography variant="body2" color="text.secondary">
            {serverTestsAvailable
              ? "Server test consumer is accessible at http://localhost:8030"
              : "Start server test consumer: cd test-consumer/server && node index.js"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={runAllTests}
            disabled={isRunningTestSuite}
            size="large"
          >
            {isRunningTestSuite
              ? "Running Integration Tests..."
              : "Run All Server Integration Tests"}
          </Button>

          <Button
            variant="outlined"
            onClick={checkServerTestConsumer}
            disabled={isRunningTestSuite}
            size="large"
          >
            Check Server Status
          </Button>

          {serverTestsAvailable && (
            <Button
              variant="outlined"
              onClick={openServerTestConsumer}
              size="large"
            >
              Open Server Console
            </Button>
          )}
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* TestProgress Timeline Component */}
      <TestProgress
        title="Server Integration Tests"
        tests={testItems}
        onRunIndividual={runIndividualTest}
        isRunning={isRunningTestSuite}
        showIndividualButtons={true}
      />

      <Divider sx={{ mb: 3 }} />

      {/* Information Section */}
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
          About Server Integration Tests
        </Typography>
        <Box component="ul" sx={{ textAlign: "left", pl: 3 }}>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Proper Environment:</strong> Server tests run in Node.js
            where server-side code can be properly imported and executed
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Full Functionality:</strong> Tests actual server-side
            Turnstile verification, middleware creation, worker factories, and
            options management
          </Typography>
          <Typography component="li" variant="body2" sx={{ mb: 1 }}>
            <strong>Separation of Concerns:</strong> Browser tests focus on
            client-side integration, while server tests focus on server-side
            functionality
          </Typography>
          <Typography component="li" variant="body2">
            <strong>Integration Testing:</strong> This interface validates that
            browser and server components can communicate effectively
          </Typography>
        </Box>

        <Alert severity="success" sx={{ mt: 2 }}>
          <strong>Best Practice:</strong> This architecture ensures each test
          environment is optimized for its intended runtime, providing
          comprehensive coverage across both client and server contexts.
        </Alert>
      </Box>
    </Container>
  );
};

export default ServerIntegrationTests;
