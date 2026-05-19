import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TimezoneSelect from "../src/components/form/TimezoneSelect.js";
import { getTimezoneOffset } from "../src/helpers/date-utils.js";
import {
  getSupportedTimezones,
  getTimezoneOptions,
} from "../src/helpers/timezones.js";

describe("timezone helpers", () => {
  it("includes UTC and all runtime-supported timezones without duplicates", () => {
    const supportedTimezones = getSupportedTimezones();
    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: string) => string[];
    };

    expect(supportedTimezones).toContain("UTC");
    expect(new Set(supportedTimezones).size).toBe(supportedTimezones.length);

    if (typeof intlWithSupportedValues.supportedValuesOf === "function") {
      expect(supportedTimezones).toEqual(
        expect.arrayContaining(intlWithSupportedValues.supportedValuesOf("timeZone")),
      );
    }
  });

  it("preserves an unrecognized current value so existing saved settings stay editable", () => {
    const timezoneOptions = getTimezoneOptions({
      currentValue: "Mars/Base",
    });
    const unknownOption = timezoneOptions.find((option) => {
      return option.value === "Mars/Base";
    });

    expect(unknownOption).toEqual(
      expect.objectContaining({
        value: "Mars/Base",
        isUnknown: true,
      }),
    );
  });

  it("formats named timezone offsets as human-readable UTC offsets", () => {
    const referenceDate = new Date("2026-05-19T12:34:56.537Z");

    expect(getTimezoneOffset(referenceDate, "UTC")).toBe("+00:00");
    expect(getTimezoneOffset(referenceDate, "America/New_York")).toBe("-04:00");
    expect(getTimezoneOffset(referenceDate, "Europe/London")).toBe("+01:00");
    expect(getTimezoneOffset(referenceDate, "Asia/Kathmandu")).toBe("+05:45");
  });

  it("uses readable UTC offsets in timezone option labels", () => {
    const referenceDate = new Date("2026-05-19T12:34:56.537Z");
    const timezoneOptions = getTimezoneOptions({
      currentValue: "America/New_York",
      referenceDate,
    });
    const newYorkOption = timezoneOptions.find((option) => {
      return option.value === "America/New_York";
    });

    expect(newYorkOption?.secondaryLabel).toContain("UTC-04:00");
    expect(newYorkOption?.secondaryLabel).not.toMatch(/\.\d/);
  });
});

describe("TimezoneSelect", () => {
  it("lets users search and choose a timezone", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <TimezoneSelect
        value="UTC"
        onChange={onChange}
        label="Schedule Timezone"
        disableClearable
      />,
    );

    const input = screen.getByRole("combobox", {
      name: /schedule timezone/i,
    });

    expect(input).toHaveValue("UTC");

    await user.click(input);
    await user.clear(input);
    await user.type(input, "new york");

    await user.click(
      await screen.findByRole("option", {
        name: /America\/New_York/i,
      }),
    );

    expect(onChange).toHaveBeenCalledWith("America/New_York");
  });
});
