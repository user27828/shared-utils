import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ServerIntegrationTests } from "./ServerIntegrationTests";

const expectBefore = (first: HTMLElement, second: HTMLElement) => {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
};

describe("ServerIntegrationTests GUI", () => {
  beforeEach(() => {
    // The component pings /health on mount; mock fetch so tests are deterministic.
    globalThis.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;
  });

  afterEach(() => {
    cleanup();
  });

  it("lists CMS and FM conformance timeline items", () => {
    render(<ServerIntegrationTests />);

    screen.getByText("CMS Connector Conformance");
    screen.getByText("FM Connector Conformance");

    expect(true).toBe(true);
  });

  it("keeps server controls before results before the about section", () => {
    render(<ServerIntegrationTests />);

    const runAllButton = screen.getAllByRole("button", {
      name: "Run All Server Integration Tests",
    })[0];
    const results = screen.getByText(
      "Server Integration Tests - Test Progress",
    );
    const content = screen.getByText("About Server Integration Tests");

    expectBefore(runAllButton, results);
    expectBefore(results, content);
  });
});
