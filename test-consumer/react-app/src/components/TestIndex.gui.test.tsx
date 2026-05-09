import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TestIndex from "./TestIndex";
import { createInitialSuiteSnapshots } from "./testSuiteAutomation";

describe("TestIndex GUI", () => {
  it("shows Run All plus CMS and FM conformance items", () => {
    render(
      <TestIndex
        onNavigate={vi.fn()}
        onRunAllSuites={vi.fn()}
        isRunningAllSuites={false}
        activeSuite={null}
        suiteRunSnapshots={createInitialSuiteSnapshots()}
      />,
    );

    screen.getByRole("button", { name: "Run All" });

    screen.getByText("Server Integration Tests");

    screen.getByText("CMS Connector Conformance");
    screen.getByText("FM Connector Conformance");

    expect(true).toBe(true);
  });
});
