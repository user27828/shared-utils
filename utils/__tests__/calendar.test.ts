import { describe, expect, it } from "@jest/globals";

import {
  buildCalendarUrl,
  buildMeetingEvent,
  generateICS,
  type CalendarConfig,
  type CalendarEvent,
} from "../src/calendar.js";

const utcCalendarConfig: CalendarConfig = {
  timezone: "UTC",
  timezoneName: "UTC",
  defaultDuration: 45,
};

const event: CalendarEvent = {
  title: "Sync",
  description: "<p>Review notes</p>",
  startDate: "2026-01-15T12:00:00.000Z",
  duration: 45,
  inviteeEmail: "person@example.com",
};

describe("calendar helpers", () => {
  it("builds provider URLs with cleaned descriptions and event details", () => {
    const url = buildCalendarUrl("google", event, utcCalendarConfig);
    expect(url).not.toBeNull();

    const parsedUrl = new URL(url as string);
    expect(parsedUrl.searchParams.get("action")).toBe("TEMPLATE");
    expect(parsedUrl.searchParams.get("text")).toBe(event.title);
    expect(parsedUrl.searchParams.get("details")).toBe("Review notes");
    expect(parsedUrl.searchParams.get("add")).toBe(event.inviteeEmail);
    const [start, end] = parsedUrl.searchParams.get("dates")?.split("/") ?? [];
    expect(start?.startsWith("20260115T120000")).toBe(true);
    expect(end?.startsWith("20260115T124500")).toBe(true);
  });

  it("keeps ICS output date-backed and derives meeting invitees from contacts", () => {
    const ics = generateICS(event, utcCalendarConfig);
    const meeting = buildMeetingEvent(
      { name: "Contact", emails: ["", "person@example.com"] },
      { startDate: event.startDate },
    );

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:Sync");
    expect(ics).toContain("DESCRIPTION:Review notes");
    expect(ics).toContain("END:VCALENDAR");
    expect(meeting.inviteeEmail).toBe("person@example.com");
    expect(meeting.startDate).toBe(event.startDate);
  });
});
