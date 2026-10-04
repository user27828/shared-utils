import { beforeEach, describe, expect, it } from "@jest/globals";
import { optionsManager } from "../src/options-manager.js";
import {
  formatFileSize,
  isValidFilename,
  sanitizeFilename,
} from "../src/files.js";
import { formatDate } from "../src/dates.js";

describe("configured utility entrypoints", () => {
  beforeEach(() => {
    optionsManager.resetAllOptions();
  });

  it("keeps global file settings and per-call overrides available", () => {
    optionsManager.setGlobalOptions({
      files: {
        size: { useBinary: true, precision: 0 },
        filenameRegex: /^[A-Za-z0-9._-]+$/,
        filenameRegexReplace: "_",
      },
    });

    expect(formatFileSize(2048)).toBe("2 KiB");
    expect(formatFileSize(2000, { useBinary: false, precision: 2 })).toBe(
      "2.00 KB",
    );
    expect(sanitizeFilename("File Name.txt")).toBe("File_Name.txt");
    expect(isValidFilename("File_Name.txt")).toBe(true);
    expect(isValidFilename("File Name.txt")).toBe(false);
  });

  it("keeps global date settings and per-call overrides available", () => {
    const date = new Date("2025-08-03T12:34:56.000Z");
    const globalFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    };
    const overrideFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    };

    optionsManager.setGlobalOptions({
      dates: {
        locale: "en-GB",
        formatOptions: globalFormatOptions,
      },
    });

    expect(formatDate(date)).toBe(
      date.toLocaleDateString("en-GB", globalFormatOptions),
    );
    expect(
      formatDate(date, {
        locale: "en-US",
        formatOptions: overrideFormatOptions,
      }),
    ).toBe(date.toLocaleDateString("en-US", overrideFormatOptions));
  });
});
