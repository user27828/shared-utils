import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import SelectChip from "../SelectChip.js";
describe("SelectChip", () => {
    test("closes the selector popper from keyboard Tab", async () => {
        render(_jsx(SelectChip, { selectedValues: [], options: [
                { value: "resume", label: "Resume" },
                { value: "cover-letter", label: "Cover Letter" },
            ], onChange: vi.fn(), multiple: false }));
        fireEvent.click(screen.getByRole("button", { name: /select/i }));
        const option = await screen.findByText("Resume");
        fireEvent.keyDown(option, { key: "Tab" });
        await waitFor(() => {
            expect(screen.queryByText("Resume")).toBeNull();
        });
    });
});
