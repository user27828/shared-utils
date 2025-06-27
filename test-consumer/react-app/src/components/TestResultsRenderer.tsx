import React from "react";

export interface TestResult {
  test: string;
  status: "pass" | "fail" | "pending";
  message: string;
  timestamp: Date;
}

interface TestResultsRendererProps {
  testResults: TestResult[];
}

const getStatusColor = (status: "pass" | "fail" | "pending") => {
  switch (status) {
    case "pass":
      return "#1a4a1a";
    case "fail":
      return "#4a1a1a";
    case "pending":
      return "#4a4a1a";
    default:
      return "#2a2a2a";
  }
};

const getStatusIcon = (status: "pass" | "fail" | "pending") => {
  switch (status) {
    case "pass":
      return "✅";
    case "fail":
      return "❌";
    case "pending":
      return "⏳";
    default:
      return "❓";
  }
};

export const TestResultsRenderer: React.FC<TestResultsRendererProps> = ({
  testResults,
}) => {
  return (
    <div className="test-section">
      <h3>Test Results</h3>
      <div style={{ textAlign: "left" }}>
        {(() => {
          // Group test results by test name
          const groupedResults = testResults.reduce(
            (acc, result) => {
              if (!acc[result.test]) {
                acc[result.test] = [];
              }
              acc[result.test].push(result);
              return acc;
            },
            {} as Record<string, TestResult[]>,
          );

          return Object.entries(groupedResults).map(([testName, results]) => {
            // Get the latest result for this test
            const latestResult = results[results.length - 1];
            const pendingResult = results.find((r) => r.status === "pending");

            return (
              <div
                key={testName}
                style={{
                  margin: "0.5rem 0",
                  padding: "0.75rem",
                  backgroundColor: getStatusColor(latestResult.status),
                  borderRadius: "4px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: "1", minWidth: "250px" }}>
                  <strong>
                    {getStatusIcon(latestResult.status)} {testName}
                  </strong>
                  {pendingResult && latestResult.status !== "pending" && (
                    <div
                      style={{
                        marginTop: "0.25rem",
                        fontSize: "0.8rem",
                        opacity: 0.7,
                        fontStyle: "italic",
                      }}
                    >
                      Started: {pendingResult.message}
                    </div>
                  )}
                  <div
                    style={{
                      marginTop: "0.25rem",
                      fontSize: "0.9rem",
                      fontWeight:
                        latestResult.status === "pending" ? "normal" : "normal",
                    }}
                  >
                    {latestResult.message}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    opacity: 0.7,
                    whiteSpace: "nowrap",
                    textAlign: "right",
                  }}
                >
                  {pendingResult && latestResult.status !== "pending" && (
                    <div>
                      Started: {pendingResult.timestamp.toLocaleTimeString()}
                    </div>
                  )}
                  <div>
                    {latestResult.status === "pending"
                      ? "Started"
                      : "Completed"}
                    : {latestResult.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
};
