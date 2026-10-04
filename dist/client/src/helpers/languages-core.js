/**
 * Find the first row matching an ISO 639 code or IETF tag.
 * The search is case-insensitive and preserves input order for duplicate codes.
 */
export const getLanguageByCodeFromData = (code, languageRows) => {
    if (!code) {
        return undefined;
    }
    const lowerCode = code.toLowerCase();
    const directMatch = languageRows.find((language) => {
        return (language.iso639_1.toLowerCase() === lowerCode ||
            language.iso639_2.toLowerCase() === lowerCode ||
            language.iso639_3.toLowerCase() === lowerCode);
    });
    if (directMatch) {
        return directMatch;
    }
    return languageRows.find((language) => {
        return (language.ietf === lowerCode ||
            Object.values(language.ietfRegions || {}).some((tag) => {
                return tag.toLowerCase() === lowerCode;
            }));
    });
};
/**
 * Build language options without importing or caching a geographic dataset.
 * The returned array is new; its row objects are the caller's original rows.
 */
export const getLanguageOptionsFromData = (languageRows, { includeEmpty = true, topLanguages, sortBy = "name", order = "asc", } = {}) => {
    let result = [...languageRows];
    const emptyOption = languageRows.find((language) => {
        return language.iso639_1 === "";
    });
    result = result.filter((language) => language.iso639_1 !== "");
    if (topLanguages) {
        let defaultCodes = [];
        if (typeof topLanguages === "object" &&
            !Array.isArray(topLanguages) &&
            topLanguages.ietfRegions) {
            const regions = Array.isArray(topLanguages.ietfRegions)
                ? topLanguages.ietfRegions
                : [topLanguages.ietfRegions];
            regions.forEach((region) => {
                const regionUpper = region.toUpperCase();
                languageRows.forEach((language) => {
                    if (language.ietfRegions &&
                        Object.keys(language.ietfRegions).includes(regionUpper)) {
                        defaultCodes.push(language.ietf);
                    }
                });
            });
        }
        else {
            defaultCodes = Array.isArray(topLanguages)
                ? topLanguages
                : [topLanguages];
        }
        const defaultLanguages = [];
        for (const code of defaultCodes) {
            if (!code) {
                continue;
            }
            const defaultLanguage = getLanguageByCodeFromData(code, languageRows);
            if (defaultLanguage && defaultLanguage.iso639_1 !== "") {
                result = result.filter((language) => {
                    return (language.iso639_1 !== defaultLanguage.iso639_1 &&
                        language.iso639_2 !== defaultLanguage.iso639_2 &&
                        language.ietf !== defaultLanguage.ietf);
                });
                defaultLanguages.push(defaultLanguage);
            }
        }
        if (defaultLanguages.length > 0) {
            result = [...defaultLanguages, ...result];
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
