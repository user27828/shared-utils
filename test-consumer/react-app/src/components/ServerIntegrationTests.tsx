import React, { useState, useEffect } from "react";
import {
  Button,
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Alert,
  Chip,
} from "@mui/material";
import { TestResultsRenderer, type TestResult } from "./TestResultsRenderer";

interface ServerTestResult extends TestResult {
  // Inherits test, status, message, timestamp from TestResult
}

const ServerIntegrationTests: React.FC = () => {
  const [testResults, setTestResults] = useState<ServerTestResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverTestsAvailable, setServerTestsAvailable] = useState(false);

  useEffect(() => {
    // Check if the dedicated server test consumer is running
    checkServerTestConsumer();
  }, []);

  const checkServerTestConsumer = async () => {
    try {
      const response = await fetch("http://localhost:8030/health");
      if (response.ok) {
        setServerTestsAvailable(true);
        addTestResult(
          "Server Test Consumer",
          "pass",
          "Server test consumer is running at http://localhost:8030",
        );
      }
    } catch (error) {
      setServerTestsAvailable(false);
      addTestResult(
        "Server Test Consumer",
        "fail",
        "Server test consumer not running. Start it with: cd test-consumer/server && node index.js",
      );
    }
  };

  const addTestResult = (
    test: string,
    status: "pass" | "fail" | "pending",
    message: string,
  ) => {
    const result: ServerTestResult = {
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

  const runServerTestIntegration = async () => {
    if (!serverTestsAvailable) {
      addTestResult(
        "Server Integration",
        "fail",
        "Server test consumer is not running. Please start it first.",
      );
      return;
    }

    setIsLoading(true);

    try {
      addTestResult(
        "Server Integration",
        "pending",
        "Fetching server test results...",
      );

      const response = await fetch("http://localhost:8030/test");
      const serverResults = await response.json();

      if (response.ok) {
        addTestResult(
          "Server Test Execution",
          "pass",
          `Server tests completed: ${serverResults.summary.passed}/${serverResults.summary.total} passed`,
        );

        // Add summary of server test results
        Object.entries(serverResults.tests).forEach(
          ([testName, testData]: [string, any]) => {
            addTestResult(
              `Server: ${testName}`,
              testData.status === "passed" ? "pass" : "fail",
              testData.details?.message ||
                testData.error ||
                "No details available",
            );
          },
        );

        if (serverResults.summary.failed > 0) {
          addTestResult(
            "Server Integration",
            "fail",
            `Some server tests failed: ${serverResults.summary.failed} failed, ${serverResults.summary.passed} passed`,
          );
        } else {
          addTestResult(
            "Server Integration",
            "pass",
            `All server tests passed! Full server-side functionality verified.`,
          );
        }
      } else {
        addTestResult(
          "Server Test Execution",
          "fail",
          `Server test endpoint returned error: ${response.status}`,
        );
      }
    } catch (error) {
      addTestResult(
        "Server Integration",
        "fail",
        `Failed to communicate with server test consumer: ${error}`,
      );
    } finally {
      setIsLoading(false);
    }
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
        server test consumer running in a Node.js environment.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Architecture:</strong> Server tests run in a dedicated Node.js
        environment at
        <code>test-consumer/server</code> where server-side code can be properly
        executed and tested. This browser-based interface communicates with that
        server to fetch and display results.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
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

          {serverTestsAvailable && (
            <Button
              variant="outlined"
              onClick={openServerTestConsumer}
              size="small"
            >
              Open Server Test Console
            </Button>
          )}
        </CardContent>
      </Card>

      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          onClick={runServerTestIntegration}
          disabled={isLoading}
          size="large"
          sx={{ mr: 2 }}
        >
          {isLoading
            ? "Running Integration Tests..."
            : "Run Server Integration Tests"}
        </Button>
        <Button
          variant="outlined"
          onClick={clearResults}
          disabled={isLoading}
          size="large"
          sx={{ mr: 2 }}
        >
          Clear Results
        </Button>
        <Button
          variant="outlined"
          onClick={checkServerTestConsumer}
          disabled={isLoading}
          size="large"
        >
          Check Server Status
        </Button>
      </Box>

      {/* Test Results */}
      {testResults.length > 0 && (
        <TestResultsRenderer testResults={testResults} />
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            About Server Integration Tests
          </Typography>
          <ul style={{ textAlign: "left", margin: 0, paddingLeft: "1.5rem" }}>
            <li>
              <strong>Proper Environment:</strong> Server tests run in Node.js
              where server-side code can be properly imported and executed
            </li>
            <li>
              <strong>Full Functionality:</strong> Tests actual server-side
              Turnstile verification, middleware creation, worker factories, and
              options management
            </li>
            <li>
              <strong>Separation of Concerns:</strong> Browser tests focus on
              client-side integration, while server tests focus on server-side
              functionality
            </li>
            <li>
              <strong>Integration Testing:</strong> This interface validates
              that browser and server components can communicate effectively
            </li>
          </ul>

          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Best Practice:</strong> This architecture ensures each test
            environment is optimized for its intended runtime, providing
            comprehensive coverage across both client and server contexts.
          </Alert>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ServerIntegrationTests;
