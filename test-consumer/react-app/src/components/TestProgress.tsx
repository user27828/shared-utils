import React from "react";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Stack,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  HourglassEmpty,
  PlayArrow,
  Pending,
} from "@mui/icons-material";

export type TestStatus = "pending" | "running" | "pass" | "fail" | "skipped";

export interface TestItem {
  name: string;
  description?: string;
  status: TestStatus;
  message?: string;
  duration?: number;
  startTime?: Date;
  endTime?: Date;
}

interface TestProgressProps {
  title: string;
  tests: TestItem[];
  isRunning: boolean;
  onRunAll?: () => void;
  onRunIndividual?: (testName: string) => void;
  onClear?: () => void;
  showIndividualButtons?: boolean;
}

const getStatusColor = (
  status: TestStatus,
): "grey" | "warning" | "success" | "error" | "info" => {
  switch (status) {
    case "pending":
      return "grey";
    case "running":
      return "warning";
    case "pass":
      return "success";
    case "fail":
      return "error";
    case "skipped":
      return "info";
    default:
      return "grey";
  }
};

const getStatusIcon = (status: TestStatus): React.ReactNode => {
  switch (status) {
    case "pending":
      return <HourglassEmpty />;
    case "running":
      return <PlayArrow />;
    case "pass":
      return <CheckCircle />;
    case "fail":
      return <Cancel />;
    case "skipped":
      return <Pending />;
    default:
      return <HourglassEmpty />;
  }
};

export const TestProgress: React.FC<TestProgressProps> = ({
  title,
  tests,
  isRunning,
  onRunAll,
  onRunIndividual,
  onClear,
  showIndividualButtons = true,
}) => {
  const totalTests = tests.length;
  const completedTests = tests.filter(
    (t) => t.status === "pass" || t.status === "fail" || t.status === "skipped",
  ).length;
  const passedTests = tests.filter((t) => t.status === "pass").length;
  const failedTests = tests.filter((t) => t.status === "fail").length;
  const runningTests = tests.filter((t) => t.status === "running").length;

  const progressPercentage =
    totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            {title} - Test Progress
          </Typography>

          {/* Progress Summary */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Progress: {completedTests}/{totalTests} tests completed
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(progressPercentage)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPercentage}
              sx={{ mb: 2 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {passedTests > 0 && (
                <Chip
                  label={`${passedTests} Passed`}
                  color="success"
                  size="small"
                />
              )}
              {failedTests > 0 && (
                <Chip
                  label={`${failedTests} Failed`}
                  color="error"
                  size="small"
                />
              )}
              {runningTests > 0 && (
                <Chip
                  label={`${runningTests} Running`}
                  color="warning"
                  size="small"
                />
              )}
              {completedTests === 0 && runningTests === 0 && (
                <Chip label="Ready to Start" color="info" size="small" />
              )}
            </Stack>
          </Box>

          {/* Control Buttons */}
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {onRunAll && (
              <button
                onClick={onRunAll}
                disabled={isRunning}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  backgroundColor: isRunning ? "#ccc" : "#007acc",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: isRunning ? "not-allowed" : "pointer",
                }}
              >
                {isRunning ? "Running Tests..." : "🚀 Run All Tests"}
              </button>
            )}

            {onClear && (
              <button
                onClick={onClear}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "1rem",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Clear Results
              </button>
            )}
          </Stack>
        </Box>

        {/* Timeline Progress */}
        {tests.length > 0 && (
          <Timeline position="right" sx={{ pl: 0, ml: 0 }}>
            {tests.map((test, index) => (
              <TimelineItem key={test.name} sx={{ minHeight: "auto" }}>
                <TimelineOppositeContent
                  sx={{
                    m: "auto 0",
                    flex: 0.25,
                    textAlign: "right",
                    pr: 1,
                    fontSize: "0.8rem",
                  }}
                  variant="body2"
                  color="text.secondary"
                >
                  {test.startTime && (
                    <Typography variant="caption" display="block">
                      {test.startTime.toLocaleTimeString()}
                    </Typography>
                  )}
                  {test.duration && (
                    <Typography
                      variant="caption"
                      display="block"
                      fontWeight="bold"
                    >
                      {test.duration}ms
                    </Typography>
                  )}
                  {showIndividualButtons &&
                    onRunIndividual &&
                    test.status !== "running" && (
                      <button
                        onClick={() => onRunIndividual(test.name)}
                        disabled={isRunning}
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.75rem",
                          backgroundColor: isRunning ? "#ccc" : "#5a5a5a",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: isRunning ? "not-allowed" : "pointer",
                          marginTop: "0.25rem",
                        }}
                      >
                        {test.status === "pending" ? "Run" : "Re-run"}
                      </button>
                    )}
                </TimelineOppositeContent>

                <TimelineSeparator>
                  <TimelineDot
                    color={getStatusColor(test.status)}
                    sx={{ width: 24, height: 24 }}
                  >
                    {getStatusIcon(test.status)}
                  </TimelineDot>
                  {index < tests.length - 1 && <TimelineConnector />}
                </TimelineSeparator>

                <TimelineContent sx={{ py: 1, px: 1 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor:
                        test.status === "pass"
                          ? "#1a4a1a"
                          : test.status === "fail"
                            ? "#4a1a1a"
                            : test.status === "running"
                              ? "#4a4a1a"
                              : "#2a2a2a",
                      color: "white",
                      fontSize: "0.9rem",
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      component="div"
                      fontWeight="bold"
                    >
                      {getStatusIcon(test.status)} {test.name}
                    </Typography>
                    {test.description && (
                      <Typography
                        variant="body2"
                        sx={{ opacity: 0.8, mt: 0.5 }}
                      >
                        {test.description}
                      </Typography>
                    )}
                    {test.status === "running" && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress sx={{ height: 3, borderRadius: 1 }} />
                      </Box>
                    )}
                    {test.message && test.status !== "pending" && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          fontFamily: "monospace",
                          fontSize: "0.8rem",
                          opacity: 0.9,
                        }}
                      >
                        {test.message}
                      </Typography>
                    )}
                  </Box>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        )}
      </CardContent>
    </Card>
  );
};

export default TestProgress;
