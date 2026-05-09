// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import MenuList from "@mui/material/MenuList";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockOpenCalendarEvent = vi.fn();

vi.mock("../../../../utils/src/contact.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../../utils/src/contact.js")
  >("../../../../utils/src/contact.js");

  return {
    ...actual,
    openCalendarEvent: (...args: unknown[]) => mockOpenCalendarEvent(...args),
  };
});

import ContactActions from "../ContactActions.js";

describe("ContactActions", () => {
  beforeEach(() => {
    mockOpenCalendarEvent.mockReset();
  });

  test("includes all stored contact methods in scheduled meeting descriptions", async () => {
    render(
      <MenuList>
        <ContactActions
          contact={{
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
          }}
          variant="menuItems"
          meetingDescriptionSuffix="(via AgentM.com)"
        />
      </MenuList>,
    );

    fireEvent.click(
      screen.getByRole("menuitem", { name: /schedule meeting/i }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: /google calendar/i }),
    );

    await waitFor(() => {
      expect(mockOpenCalendarEvent).toHaveBeenCalledTimes(1);
    });

    const [, event] = mockOpenCalendarEvent.mock.calls[0] as [
      string,
      { description?: string },
    ];

    expect(event.description).toContain(
      "Scheduled meeting with Taylor Morgan (via AgentM.com)",
    );
    expect(event.description).toContain("Contact methods:");
    expect(event.description).toContain("Email: taylor@example.com");
    expect(event.description).toContain("Email: recruiter@example.com");
    expect(event.description).toContain("Mobile: 555-0101");
    expect(event.description).toContain("Phone: 555-0102");
    expect(event.description).toContain(
      "Linkedin: https://linkedin.com/in/taylor",
    );
    expect(event.description).toContain("Portfolio: portfolio.example.com");
  });

  test("closes the meeting link submenu from keyboard Escape", async () => {
    render(
      <MenuList>
        <ContactActions
          contact={{
            name: "Taylor Morgan",
            emails: ["taylor@example.com"],
          }}
          variant="menuItems"
          meetingLinks={[
            {
              providerKey: "zoom",
              label: "Interview room",
              value: "https://zoom.us/j/123456789",
            },
          ]}
        />
      </MenuList>,
    );

    fireEvent.click(
      screen.getByRole("menuitem", { name: /schedule meeting/i }),
    );

    const googleCalendarItem = await screen.findByRole("menuitem", {
      name: /google calendar/i,
    });

    fireEvent.mouseEnter(googleCalendarItem);

    const interviewRoomItem = await screen.findByRole("menuitem", {
      name: /interview room/i,
    });

    fireEvent.keyDown(interviewRoomItem, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: /interview room/i }),
      ).toBeNull();
    });
  });
});
