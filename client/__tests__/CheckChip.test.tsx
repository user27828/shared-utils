import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CheckChip from "../src/components/layout/CheckChip.js";

describe("CheckChip", () => {
  it("toggles unchecked state when clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <CheckChip
        label="Email updates"
        defaultChecked={false}
        onChange={onChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {
      name: "Email updates",
    }) as HTMLInputElement;

    expect(checkbox.checked).toBe(false);

    await user.click(screen.getByText("Email updates"));

    expect(checkbox.checked).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        target: expect.objectContaining({ checked: true }),
      }),
      true,
    );
  });

  it("supports keyboard toggling through the checkbox input", async () => {
    const user = userEvent.setup();

    render(<CheckChip label="Push alerts" />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Push alerts",
    }) as HTMLInputElement;

    await user.tab();
    await user.keyboard("[Space]");

    expect(checkbox.checked).toBe(true);
  });

  it("does not toggle when disabled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<CheckChip label="Team access" disabled onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Team access",
    }) as HTMLInputElement;

    await user.click(checkbox);

    expect(checkbox.checked).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("applies the native indeterminate state", () => {
    render(<CheckChip label="Partial selection" indeterminate />);

    const checkbox = screen.getByRole("checkbox", {
      name: "Partial selection",
    }) as HTMLInputElement;

    expect(checkbox.indeterminate).toBe(true);
  });
});
