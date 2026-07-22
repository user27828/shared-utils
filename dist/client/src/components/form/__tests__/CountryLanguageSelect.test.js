import { jsx as _jsx } from "react/jsx-runtime";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import CountrySelect from "../CountrySelect.jsx";
import LanguageSelect from "../LanguageSelect.jsx";
describe("searchable country and language selects", () => {
    test("renders country autocomplete options without MenuListContext", async () => {
        render(_jsx(CountrySelect, { value: "", onChange: vi.fn() }));
        fireEvent.mouseDown(screen.getByRole("combobox"));
        expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
    });
    test("renders language autocomplete options without MenuListContext", async () => {
        render(_jsx(LanguageSelect, { value: "", onChange: vi.fn() }));
        fireEvent.mouseDown(screen.getByRole("combobox"));
        expect((await screen.findAllByRole("option")).length).toBeGreaterThan(0);
    });
});
