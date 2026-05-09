import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import OptionsManagerTests from "./OptionsManagerTests";

vi.mock("@user27828/shared-utils/utils", () => {
  return {
    OptionsManager: class {},
    optionsManager: {},
  };
});

describe("OptionsManagerTests GUI", () => {
  it("shows a loading label until the shared utilities import settles", async () => {
    render(<OptionsManagerTests />);

    expect(
      (
        screen.getByRole("button", {
          name: "Loading Utilities...",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);

    await waitFor(() => {
      expect(
        (
          screen.getByRole("button", {
            name: "Run All Options Manager Tests",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
    });
  });
});
