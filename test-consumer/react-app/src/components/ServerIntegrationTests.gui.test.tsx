import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerIntegrationTests } from "./ServerIntegrationTests";

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

  it("lists CMS and FM conformance timeline items", () => {
    render(<ServerIntegrationTests />);

    screen.getByText("CMS Connector Conformance");
    screen.getByText("FM Connector Conformance");

    expect(true).toBe(true);
  });
});
