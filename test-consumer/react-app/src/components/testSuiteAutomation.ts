import React from "react";
import type { TestItem } from "./TestProgress";
import { AUTOMATED_SUITE_VIEWS, type TestSuiteView } from "./testSuiteRegistry";

export type SuiteRunStatus =
  | "idle"
  | "queued"
  | "running"
  | "passed"
  | "failed";

export type SuiteRunSnapshot = {
  view: TestSuiteView;
  status: SuiteRunStatus;
  lastRunId: number | null;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  message: string;
};

export type SuiteAutomationResult = {
  view: TestSuiteView;
  runId: number;
  status: Extract<SuiteRunStatus, "passed" | "failed">;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  message: string;
};

export type SuiteAutomationProps = {
  automationRunId?: number | null;
  onAutomationComplete?: (result: SuiteAutomationResult) => void;
};

type AutomationRecord = {
  started: boolean;
  callbackDelivered: boolean;
  promise: Promise<SuiteAutomationResult> | null;
  settledResult: SuiteAutomationResult | null;
};

type UseSuiteAutomationInput = SuiteAutomationProps & {
  view: TestSuiteView;
  isReady?: boolean;
  tests: TestItem[];
  runAllTests: () => Promise<void>;
};

const SUITE_TERMINAL_TEST_STATUSES = new Set<TestItem["status"]>([
  "pass",
  "fail",
  "skipped",
]);

const SUITE_SETTLE_TIMEOUT_MS = 2000;
const SUITE_SETTLE_POLL_INTERVAL_MS = 25;
const SUITE_SETTLE_STABLE_POLLS = 4;

const MAX_AUTOMATION_RECORDS = 50;
const automationRecords = new Map<string, AutomationRecord>();

const createEmptySnapshot = (view: TestSuiteView): SuiteRunSnapshot => {
  return {
    view,
    status: "idle",
    lastRunId: null,
    totalTests: 0,
    completedTests: 0,
    passedTests: 0,
    failedTests: 0,
    skippedTests: 0,
    message: "Waiting to run",
  };
};

export const createInitialSuiteSnapshots = (): Record<
  TestSuiteView,
  SuiteRunSnapshot
> => {
  return AUTOMATED_SUITE_VIEWS.reduce(
    (snapshots, view) => {
      snapshots[view] = createEmptySnapshot(view);
      return snapshots;
    },
    {} as Record<TestSuiteView, SuiteRunSnapshot>,
  );
};

const trimAutomationRecords = (): void => {
  while (automationRecords.size > MAX_AUTOMATION_RECORDS) {
    const oldestKey = automationRecords.keys().next().value;
    if (!oldestKey) {
      return;
    }
    automationRecords.delete(oldestKey);
  }
};

const summarizeSuiteResult = (
  view: TestSuiteView,
  runId: number,
  tests: TestItem[],
): SuiteAutomationResult => {
  const totalTests = tests.length;
  const passedTests = tests.filter((test) => test.status === "pass").length;
  const failedTests = tests.filter((test) => test.status === "fail").length;
  const skippedTests = tests.filter((test) => test.status === "skipped").length;
  const completedTests = passedTests + failedTests + skippedTests;
  const pendingTests = Math.max(totalTests - completedTests, 0);

  if (failedTests > 0) {
    return {
      view,
      runId,
      status: "failed",
      totalTests,
      completedTests,
      passedTests,
      failedTests,
      skippedTests,
      message: `${failedTests} failed, ${passedTests} passed`,
    };
  }

  if (pendingTests > 0) {
    return {
      view,
      runId,
      status: "failed",
      totalTests,
      completedTests,
      passedTests,
      failedTests,
      skippedTests,
      message: `${pendingTests} test${pendingTests === 1 ? "" : "s"} still pending`,
    };
  }

  return {
    view,
    runId,
    status: "passed",
    totalTests,
    completedTests,
    passedTests,
    failedTests,
    skippedTests,
    message: `${passedTests}/${totalTests} passed`,
  };
};

const getSuiteTestsSignature = (tests: TestItem[]): string => {
  return tests.map((test) => `${test.name}:${test.status}`).join("|");
};

const waitForSuiteTestsToSettle = async (
  getTests: () => TestItem[],
): Promise<TestItem[]> => {
  const deadline = Date.now() + SUITE_SETTLE_TIMEOUT_MS;
  let lastSignature = "";
  let stablePolls = 0;

  while (Date.now() < deadline) {
    const currentTests = getTests();
    const currentSignature = getSuiteTestsSignature(currentTests);
    const hasRunningTests = currentTests.some(
      (test) => test.status === "running",
    );
    const completedTests = currentTests.filter((test) => {
      return SUITE_TERMINAL_TEST_STATUSES.has(test.status);
    }).length;

    if (!hasRunningTests && completedTests === currentTests.length) {
      return currentTests;
    }

    if (!hasRunningTests && currentSignature === lastSignature) {
      stablePolls += 1;
      if (stablePolls >= SUITE_SETTLE_STABLE_POLLS) {
        return currentTests;
      }
    } else {
      lastSignature = currentSignature;
      stablePolls = 0;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, SUITE_SETTLE_POLL_INTERVAL_MS);
    });
  }

  return getTests();
};

export const applySuiteAutomationResult = (
  snapshot: SuiteRunSnapshot,
  result: SuiteAutomationResult,
): SuiteRunSnapshot => {
  return {
    ...snapshot,
    view: result.view,
    status: result.status,
    lastRunId: result.runId,
    totalTests: result.totalTests,
    completedTests: result.completedTests,
    passedTests: result.passedTests,
    failedTests: result.failedTests,
    skippedTests: result.skippedTests,
    message: result.message,
  };
};

export const useSuiteAutomation = ({
  automationRunId,
  onAutomationComplete,
  view,
  isReady = true,
  tests,
  runAllTests,
}: UseSuiteAutomationInput): void => {
  const testsRef = React.useRef(tests);
  const runAllTestsRef = React.useRef(runAllTests);

  React.useEffect(() => {
    testsRef.current = tests;
  }, [tests]);

  React.useEffect(() => {
    runAllTestsRef.current = runAllTests;
  }, [runAllTests]);

  React.useEffect(() => {
    if (!automationRunId || !isReady) {
      return;
    }

    const runKey = `${view}:${automationRunId}`;
    let record = automationRecords.get(runKey);
    if (!record) {
      record = {
        started: false,
        callbackDelivered: false,
        promise: null,
        settledResult: null,
      };
      automationRecords.set(runKey, record);
      trimAutomationRecords();
    }

    if (!record.started) {
      record.started = true;
      record.promise = (async () => {
        try {
          await runAllTestsRef.current();
        } catch (error) {
          console.error(`Automated suite ${view} failed`, error);
        }

        const settledTests = await waitForSuiteTestsToSettle(() => {
          return testsRef.current;
        });

        const result = summarizeSuiteResult(
          view,
          automationRunId,
          settledTests,
        );
        record!.settledResult = result;
        return result;
      })();
    }

    let cancelled = false;

    const deliverResult = (result: SuiteAutomationResult) => {
      if (cancelled || record!.callbackDelivered) {
        return;
      }
      record!.callbackDelivered = true;
      onAutomationComplete?.(result);
    };

    if (record.settledResult) {
      deliverResult(record.settledResult);
    } else if (record.promise) {
      void record.promise.then(deliverResult);
    }

    return () => {
      cancelled = true;
    };
  }, [automationRunId, isReady, onAutomationComplete, view]);
};
