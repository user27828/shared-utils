import { describe, expect, it } from "vitest";

import {
  getCountryByCodeFromData,
  getCountryOptionsFromData,
  type CountryDataRow,
} from "../src/helpers/countries-core.js";
import {
  getLanguageByCodeFromData,
  getLanguageOptionsFromData,
  type LanguageDataRow,
} from "../src/helpers/languages-core.js";

const countryRows: CountryDataRow[] = [
  {
    name: "Not Selected/Other",
    nameLocal: "Not Selected/Other",
    iso3166_1_alpha2: "",
    iso3166_1_alpha3: "",
    iso3166_1_numeric: 0,
  },
  {
    name: "United States",
    nameLocal: "United States",
    iso3166_1_alpha2: "US",
    iso3166_1_alpha3: "USA",
    iso3166_1_numeric: 840,
    telCountryCode: 1,
  },
  {
    name: "Taiwan",
    nameLocal: "臺灣",
    iso3166_1_alpha2: "TW",
    iso3166_1_alpha3: "TWN",
    iso3166_1_numeric: 158,
    telCountryCode: 886,
  },
];

const languageRows: LanguageDataRow[] = [
  {
    iso639_1: "",
    iso639_2: "",
    iso639_3: "",
    name: "Not Selected/Other",
    nameLocal: "Not Selected/Other",
    ietf: "",
    ietfRegions: {},
    lcid: 0,
    speakers: 0,
  },
  {
    iso639_1: "en",
    iso639_2: "eng",
    iso639_3: "eng",
    name: "English",
    nameLocal: "English",
    ietf: "en",
    ietfRegions: { US: "en-US", GB: "en-GB" },
    lcid: 1033,
    speakers: 380,
  },
  {
    iso639_1: "fr",
    iso639_2: "fra",
    iso639_3: "fra",
    name: "French",
    nameLocal: "Français",
    ietf: "fr",
    ietfRegions: { FR: "fr-FR" },
    lcid: 1036,
    speakers: 80,
  },
];

describe("data-driven country helpers", () => {
  it("preserves first-match aliases, priority order, empty rows, and caller data", () => {
    const unitedStates = countryRows[1]!;
    const duplicateUnitedStates = {
      ...unitedStates,
      name: "Later United States match",
    };
    const rowsWithDuplicate = [...countryRows, duplicateUnitedStates];

    expect(getCountryByCodeFromData("usa", rowsWithDuplicate)).toBe(
      unitedStates,
    );
    expect(getCountryByCodeFromData("840", countryRows)).toBe(unitedStates);

    const options = getCountryOptionsFromData(countryRows, {
      topCountries: ["tw", "USA"],
    });

    expect(options.map((country) => country.iso3166_1_alpha2)).toEqual([
      "",
      "TW",
      "US",
    ]);
    expect(
      getCountryOptionsFromData(countryRows, { includeEmpty: false })[0]
        .iso3166_1_alpha2,
    ).toBe("US");
    expect(countryRows.map((country) => country.iso3166_1_alpha2)).toEqual([
      "",
      "US",
      "TW",
    ]);

    const addedCountry: CountryDataRow = {
      name: "Canada",
      nameLocal: "Canada",
      iso3166_1_alpha2: "CA",
      iso3166_1_alpha3: "CAN",
      iso3166_1_numeric: 124,
    };
    const mutableRows = [...countryRows];
    mutableRows.push(addedCountry);
    expect(getCountryByCodeFromData("CA", mutableRows)).toBe(addedCountry);
  });
});

describe("data-driven language helpers", () => {
  it("preserves ISO and regional aliases, priority order, and empty rows", () => {
    const french = languageRows[2]!;
    const duplicateFrench = {
      ...french,
      name: "Later French match",
    };
    const rowsWithDuplicate = [...languageRows, duplicateFrench];

    expect(getLanguageByCodeFromData("FRA", rowsWithDuplicate)).toBe(french);
    expect(getLanguageByCodeFromData("FR-fr", rowsWithDuplicate)).toBe(french);

    const options = getLanguageOptionsFromData(languageRows, {
      topLanguages: { ietfRegions: "FR" },
    });

    expect(options.map((language) => language.iso639_1)).toEqual([
      "",
      "fr",
      "en",
    ]);
    expect(
      getLanguageOptionsFromData(languageRows, { includeEmpty: false })[0]
        .iso639_1,
    ).toBe("en");
    expect(languageRows.map((language) => language.iso639_1)).toEqual([
      "",
      "en",
      "fr",
    ]);
  });
});
