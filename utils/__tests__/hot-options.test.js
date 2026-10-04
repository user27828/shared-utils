import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import {
  formatFileSize,
  isValidFilename,
  sanitizeFilename,
} from "../src/files.js";
import { formatDate } from "../src/dates.js";
import { OptionsManager, optionsManager } from "../src/options-manager.js";

describe("hot utility option reads", () => {
  let envManager;

  beforeEach(() => {
    optionsManager.resetAllOptions();
    envManager = new OptionsManager("ENV", {});
    optionsManager.registerManager("ENV", envManager);
  });

  afterEach(() => {
    optionsManager.resetAllOptions();
    jest.restoreAllMocks();
  });

  it("reads only the relevant manager for configured file and date helpers", () => {
    optionsManager.setGlobalOptions({
      ENV: {
        largeUnrelatedValue: Array.from({ length: 1_000 }, (_, index) => index),
      },
    });
    const envGetter = jest.spyOn(envManager, "getOption");
    const allOptionsGetter = jest.spyOn(optionsManager, "getAllOptions");

    formatFileSize(2048);
    sanitizeFilename("report draft.txt");
    isValidFilename("report.txt");
    formatDate(new Date("2025-08-03T12:34:56.000Z"));

    expect(envGetter).not.toHaveBeenCalled();
    expect(allOptionsGetter).not.toHaveBeenCalled();
  });

  it("returns defensive category snapshots and preserves updates, arrays, and readonly state", () => {
    optionsManager.setGlobalOptions({
      files: {
        size: { useBinary: true },
        extensions: ["png", "jpg"],
      },
    });
    optionsManager.setGlobalOptions({
      files: {
        size: { precision: 0 },
        extensions: ["pdf"],
      },
    });

    const snapshot = optionsManager.getOption("files");
    expect(snapshot).toEqual({
      size: { useBinary: true, precision: 0 },
      extensions: ["pdf"],
    });

    snapshot.size.useBinary = false;
    snapshot.extensions.push("mutated");
    expect(optionsManager.getOption("files")).toEqual({
      size: { useBinary: true, precision: 0 },
      extensions: ["pdf"],
    });

    optionsManager.setGlobalOptions({ files: { __READONLY__: true } });
    expect(optionsManager.getOption("files").__READONLY__).toBe(true);
    expect(() =>
      optionsManager.setGlobalOptions({ files: { size: { precision: 2 } } }),
    ).toThrow("readonly");
  });

  it("keeps pending options unavailable until their manager registers", () => {
    const utilityName = "e08-pending-options";
    optionsManager.setGlobalOptions({
      [utilityName]: { values: ["configured-before-registration"] },
    });

    expect(optionsManager.getOption(utilityName)).toBeUndefined();
    expect(optionsManager.getAllOptions()[utilityName]).toBeUndefined();

    optionsManager.registerManager(
      utilityName,
      new OptionsManager(utilityName, { values: ["default"] }),
    );

    expect(optionsManager.getOption(utilityName)).toEqual({
      values: ["configured-before-registration"],
    });
  });
});
