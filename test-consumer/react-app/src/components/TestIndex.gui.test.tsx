import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TestIndex from "./TestIndex";

describe("TestIndex GUI", () => {
  it("shows CMS and FM conformance items", () => {
    render(<TestIndex onNavigate={vi.fn()} />);

    screen.getByText("Server Integration Tests");

    screen.getByText("CMS Connector Conformance");
    screen.getByText("FM Connector Conformance");

    expect(true).toBe(true);
  });
});
