/** A country row accepted by the data-driven country helpers and selector. */
export interface CountryDataRow {
  name: string;
  nameLocal: string;
  iso3166_1_alpha2: string;
  iso3166_1_alpha3: string;
  iso3166_1_numeric: number;
  telCountryCode?: number;
  [field: string]: unknown;
}

export interface CountryOptionsConfig {
  includeEmpty?: boolean;
  topCountries?: string | string[];
  sortBy?: string;
  order?: string;
}

/**
 * Find the first row matching an ISO alpha-2, alpha-3, or numeric code.
 * @param code The code to search for.
 * @param countryRows Host-provided rows, searched in their original order.
 */
export const getCountryByCodeFromData = <TRow extends CountryDataRow>(
  code: string | number,
  countryRows: readonly TRow[],
): TRow | undefined => {
  if (!code) {
    return undefined;
  }

  if (
    typeof code === "number" ||
    !Number.isNaN(Number.parseInt(String(code)))
  ) {
    const numericCode = Number.parseInt(String(code));
    return countryRows.find(
      (country) => country.iso3166_1_numeric === numericCode,
    );
  }

  const upperCode = String(code).toUpperCase();
  return countryRows.find(
    (country) =>
      country.iso3166_1_alpha2 === upperCode ||
      country.iso3166_1_alpha3 === upperCode,
  );
};

/**
 * Build country options without importing or caching a geographic dataset.
 * The returned array is new; its row objects are the caller's original rows.
 */
export const getCountryOptionsFromData = <TRow extends CountryDataRow>(
  countryRows: readonly TRow[],
  {
    includeEmpty = true,
    topCountries,
    sortBy = "name",
    order = "asc",
  }: CountryOptionsConfig = {},
): TRow[] => {
  let result = [...countryRows];
  const emptyOption = countryRows.find((country) => {
    return country.iso3166_1_alpha2 === "";
  });

  result = result.filter((country) => country.iso3166_1_alpha2 !== "");

  if (topCountries) {
    const defaultCodes = Array.isArray(topCountries)
      ? topCountries
      : [topCountries];
    const defaultCountries: TRow[] = [];

    for (const code of defaultCodes) {
      if (!code) {
        continue;
      }

      const upperCode = code.toUpperCase();
      const topCountry = result.find((country) => {
        return (
          country.iso3166_1_alpha2 === upperCode ||
          country.iso3166_1_alpha3 === upperCode
        );
      });

      if (topCountry) {
        result = result.filter((country) => {
          return (
            country.iso3166_1_alpha2 !== topCountry.iso3166_1_alpha2 &&
            country.iso3166_1_alpha3 !== topCountry.iso3166_1_alpha3
          );
        });
        defaultCountries.push(topCountry);
      }
    }

    if (defaultCountries.length > 0) {
      result = [...defaultCountries, ...result];
    }
  }

  if (sortBy && sortBy !== "name") {
    result = result.sort((left, right) => {
      if (!(sortBy in left) || !(sortBy in right)) {
        return 0;
      }

      const leftValue = left[sortBy];
      const rightValue = right[sortBy];

      if (typeof leftValue === "string" && typeof rightValue === "string") {
        return order.toLowerCase() === "desc"
          ? rightValue.localeCompare(leftValue)
          : leftValue.localeCompare(rightValue);
      }

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return order.toLowerCase() === "desc"
          ? rightValue - leftValue
          : leftValue - rightValue;
      }

      return 0;
    });
  }

  if (includeEmpty && emptyOption) {
    result.unshift(emptyOption);
  }

  return result;
};
