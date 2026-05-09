import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import type { TestItem } from "./TestProgress";
import {
  useSuiteAutomation,
  type SuiteAutomationResult,
} from "./testSuiteAutomation";

type HarnessProps = {
  runId: number;
  onComplete: (result: SuiteAutomationResult) => void;
  onRunAll: () => void;
};

const ImmediateReadyHarness: React.FC<HarnessProps> = ({
  runId,
  onComplete,
  onRunAll,
}) => {
  const [tests, setTests] = React.useState<TestItem[]>([
    {
      name: "Immediate suite",
      status: "pending",
    },
  ]);

  useSuiteAutomation({
    automationRunId: runId,
    onAutomationComplete: onComplete,
    view: "log",
    isReady: true,
    tests,
    runAllTests: async () => {
      onRunAll();
      setTests([
        {
          name: "Immediate suite",
          status: "pass",
        },
      ]);
    },
  });

  return null;
};

const DeferredStateHarness: React.FC<HarnessProps> = ({
  runId,
  onComplete,
  onRunAll,
}) => {
  const [tests, setTests] = React.useState<TestItem[]>([
    {
      name: "Deferred suite A",
      status: "pending",
    },
    {
      name: "Deferred suite B",
      status: "pending",
    },
  ]);

  useSuiteAutomation({
    automationRunId: runId,
    onAutomationComplete: onComplete,
    view: "easymde",
    isReady: true,
    tests,
    runAllTests: async () => {
      onRunAll();
      setTimeout(() => {
        setTests([
          {
            name: "Deferred suite A",
            status: "pass",
          },
          {
            name: "Deferred suite B",
            status: "pass",
          },
        ]);
      }, 40);
    },
  });

  return null;
};

describe("testSuiteAutomation", () => {
  it("completes exactly once under React StrictMode for an immediately ready suite", async () => {
    const onComplete = vi.fn();
    const onRunAll = vi.fn();

    render(
      <React.StrictMode>
        <ImmediateReadyHarness
          runId={1001}
          onComplete={onComplete}
          onRunAll={onRunAll}
        />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(onRunAll).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "log",
        runId: 1001,
        status: "passed",
        passedTests: 1,
        failedTests: 0,
      }),
    );
  });

  it("waits for delayed test state flushes before summarizing a suite result", async () => {
    const onComplete = vi.fn();
    const onRunAll = vi.fn();

    render(
      <DeferredStateHarness
        runId={1002}
        onComplete={onComplete}
        onRunAll={onRunAll}
      />,
    );

    await waitFor(() => {
      expect(onRunAll).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "easymde",
        runId: 1002,
        status: "passed",
        totalTests: 2,
        completedTests: 2,
        passedTests: 2,
        failedTests: 0,
      }),
    );
  });
});
