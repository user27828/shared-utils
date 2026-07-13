import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function createMockSuite(view: string, label: string) {
  const MockSuite: React.FC<{
    automationRunId?: number | null;
    onAutomationComplete?: (result: any) => void;
  }> = ({ automationRunId, onAutomationComplete }) => {
    const lastRunIdRef = React.useRef<number | null>(null);

    React.useEffect(() => {
      if (!automationRunId || lastRunIdRef.current === automationRunId) {
        return;
      }

      lastRunIdRef.current = automationRunId;
      onAutomationComplete?.({
        view,
        runId: automationRunId,
        status: "passed",
        totalTests: 1,
        completedTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        message: "1/1 passed",
      });
    }, [automationRunId, onAutomationComplete]);

    return <div>{label}</div>;
  };

  return MockSuite;
}

vi.mock("./components/TurnstileTests", () => {
  return { default: createMockSuite("turnstile", "Turnstile Mock") };
});

vi.mock("./components/LogTests", () => {
  return { default: createMockSuite("log", "Log Mock") };
});

vi.mock("./components/OptionsManagerTests", () => {
  return { default: createMockSuite("options", "Options Mock") };
});

vi.mock("./components/ClientComponentTests", () => {
  return { default: createMockSuite("client", "Client Mock") };
});

vi.mock("./components/TinyMCETests", () => {
  return { default: createMockSuite("tinymce", "TinyMCE Mock") };
});

vi.mock("./components/EasyMDETests", () => {
  return { default: createMockSuite("easymde", "EasyMDE Mock") };
});

vi.mock("./components/MDXEditorTests", () => {
  return { default: createMockSuite("mdxeditor", "MDXEditor Mock") };
});

vi.mock("./components/CKEditorTests", () => {
  return { default: createMockSuite("ckeditor", "CKEditor Mock") };
});

vi.mock("./components/CmsTests", () => {
  return { default: createMockSuite("cms", "CMS Mock") };
});

vi.mock("./components/FmTests", () => {
  return { default: createMockSuite("fm", "FM Mock") };
});

vi.mock("./components/ServerIntegrationTests", () => {
  return { default: createMockSuite("server", "Server Mock") };
});

import App from "./App";
import { AUTOMATED_SUITE_VIEWS } from "./components/testSuiteRegistry.js";

describe("App Run All flow", () => {
  it("advances through the automated suite queue and retains the results on the dashboard", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Run All" }));

    await waitFor(
      () => {
        expect(screen.getByText("Integration Test Suite")).toBeTruthy();
      },
      { timeout: 5000 },
    );

    expect({
      passed: screen.queryAllByText("PASSED").length,
      idle: screen.queryAllByText("IDLE").length,
      completed: screen.queryAllByText("1/1 completed").length,
    }).toEqual({
      passed: AUTOMATED_SUITE_VIEWS.length * 2,
      idle: 0,
      completed: AUTOMATED_SUITE_VIEWS.length,
    });
  });
});
