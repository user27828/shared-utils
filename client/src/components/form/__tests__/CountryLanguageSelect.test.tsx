// @vitest-environment jsdom

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import CountrySelect from "../../../../../dist/client/src/components/form/CountrySelect.js";
import LanguageSelect from "../../../../../dist/client/src/components/form/LanguageSelect.js";
import CountrySelectWithData from "../../../../../dist/client/src/components/form/CountrySelectCore.js";
import LanguageSelectWithData from "../../../../../dist/client/src/components/form/LanguageSelectCore.js";

describe("searchable country and language selects", () => {
  test("renders country autocomplete options without MenuListContext", async () => {
    render(<CountrySelect value="" onChange={vi.fn()} />);

    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
  });

  test("renders language autocomplete options without MenuListContext", async () => {
    render(<LanguageSelect value="" onChange={vi.fn()} />);

    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
  });

  test("renders only host-provided country rows through the data-driven selector", async () => {
    render(
      <CountrySelectWithData
        countries={[
          {
            name: "Exampleland",
            nameLocal: "Exampleland",
            iso3166_1_alpha2: "EX",
            iso3166_1_alpha3: "EXM",
            iso3166_1_numeric: 999,
          },
        ]}
        value=""
        onChange={vi.fn()}
        showEmpty={false}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect(await screen.findAllByRole("option")).toHaveLength(1);
  });

  test("renders only host-provided language rows through the data-driven selector", async () => {
    render(
      <LanguageSelectWithData
        languages={[
          {
            iso639_1: "xx",
            iso639_2: "xxx",
            iso639_3: "xxx",
            name: "Example Language",
            nameLocal: "Example Language",
            ietf: "xx",
            ietfRegions: {},
            lcid: 0,
            speakers: 0,
          },
        ]}
        value=""
        onChange={vi.fn()}
        showEmpty={false}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));

    expect(await screen.findAllByRole("option")).toHaveLength(1);
  });

  test("keeps host-provided country multiselect values in alpha-2 form", async () => {
    const onChange = vi.fn();
    render(
      <CountrySelectWithData
        countries={[
          {
            name: "United States",
            nameLocal: "United States",
            iso3166_1_alpha2: "US",
            iso3166_1_alpha3: "USA",
            iso3166_1_numeric: 840,
          },
          {
            name: "Taiwan",
            nameLocal: "臺灣",
            iso3166_1_alpha2: "TW",
            iso3166_1_alpha3: "TWN",
            iso3166_1_numeric: 158,
          },
        ]}
        value={["US"]}
        onChange={onChange}
        multiple
        showEmpty={false}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /Taiwan/ }));

    expect(onChange).toHaveBeenCalledWith(["US", "TW"]);
  });

  test("keeps host-provided language multiselect values in IETF form", async () => {
    const onChange = vi.fn();
    render(
      <LanguageSelectWithData
        languages={[
          {
            iso639_1: "en",
            iso639_2: "eng",
            iso639_3: "eng",
            name: "English",
            nameLocal: "English",
            ietf: "en",
            ietfRegions: {},
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
            ietfRegions: {},
            lcid: 1036,
            speakers: 80,
          },
        ]}
        value={["en"]}
        onChange={onChange}
        multiple
        showEmpty={false}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("combobox"));
    fireEvent.click(await screen.findByRole("option", { name: /French/ }));

    expect(onChange).toHaveBeenCalledWith(["en", "fr"]);
  });
});
