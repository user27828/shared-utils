import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
const mockOpenCalendarEvent = vi.fn();
vi.mock("../../../../utils/index.js", async () => {
    const actual = await vi.importActual("../../../../utils/index.js");
    return {
        ...actual,
        openCalendarEvent: (...args) => mockOpenCalendarEvent(...args),
    };
});
import ContactActions from "../ContactActions.js";
describe("ContactActions", () => {
    beforeEach(() => {
        mockOpenCalendarEvent.mockReset();
    });
    test("includes all stored contact methods in scheduled meeting descriptions", async () => {
        render(_jsx(ContactActions, { contact: {
                name: "Taylor Morgan",
                emails: ["taylor@example.com", "recruiter@example.com"],
                phones: [
                    { value: "555-0101", type: "mobile" },
                    { value: "555-0102" },
                ],
                urls: [
                    { url: "https://linkedin.com/in/taylor", label: "linkedin" },
                    { url: "portfolio.example.com", label: "portfolio" },
                ],
            }, variant: "menuItems", meetingDescriptionSuffix: "(via AgentM.com)" }));
        fireEvent.click(screen.getByRole("menuitem", { name: /schedule meeting/i }));
        fireEvent.click(await screen.findByRole("menuitem", { name: /google calendar/i }));
        await waitFor(() => {
            expect(mockOpenCalendarEvent).toHaveBeenCalledTimes(1);
        });
        const [, event] = mockOpenCalendarEvent.mock.calls[0];
        expect(event.description).toContain("Scheduled meeting with Taylor Morgan (via AgentM.com)");
        expect(event.description).toContain("Contact methods:");
        expect(event.description).toContain("Email: taylor@example.com");
        expect(event.description).toContain("Email: recruiter@example.com");
        expect(event.description).toContain("Mobile: 555-0101");
        expect(event.description).toContain("Phone: 555-0102");
        expect(event.description).toContain("Linkedin: https://linkedin.com/in/taylor");
        expect(event.description).toContain("Portfolio: portfolio.example.com");
    });
});
