# Data Synchronization Instructions

This document provides comprehensive instructions for Large Language Models (LLMs) to synchronize the downloaded source data files with the canonical application data files. These instructions ensure data consistency, quality, and enhanced functionality.

## Overview

The synchronization process involves:

1. **Source Data**: Authoritative external data sources downloaded to `/data/source/`
2. **Canonical Data**: Application-specific data files in `/client/src/data/`
3. **Mapping & Enhancement**: Converting source formats to application schemas with enrichments

## Source Data Files

### Languages Source (`/data/source/languages.txt`)

- **Format**: ISO 639-2 UTF-8 format from Library of Congress
- **Structure**: `iso639_2||iso639_1|english_name|french_name`
- **Example**: `aar||aa|Afar|afar`
- **Authority**: Official ISO 639-2 standard
- **Fields Available**:
  - `iso639_2`: 3-letter language code (primary)
  - `iso639_1`: 2-letter code (when available)
  - `english_name`: English language name
  - `french_name`: French language name

### Countries Source (`/data/source/countries.csv`)

- **Format**: CSV with comprehensive country data from DataHub.io
- **Authority**: Multiple international standards (ISO, UN, etc.)
- **Key Fields Available**:
  - `ISO3166-1-Alpha-2`: 2-letter country code
  - `ISO3166-1-Alpha-3`: 3-letter country code
  - `ISO3166-1-numeric`: Numeric country code
  - `UNTERM English Short`: Official English name
  - `official_name_en`: Official English name (alternative)
  - `Capital`: Capital city
  - `Region Name`: Geographic region
  - `Sub-region Name`: Geographic sub-region
  - `Continent`: Continent code (AS, EU, AF, NA, SA, OC, AN)
  - `Languages`: Language codes (comma-separated)
  - `ISO4217-currency_alphabetic_code`: Currency code
  - `Dial`: International dialing code
  - `Population` and other demographic data may be available

## Canonical Data File Schemas

### Languages Target (`/client/src/data/languages.js`)

**Required Schema**:

```javascript
{
  iso639_1: "",        // 2-letter code (empty if not available)
  iso639_2: "",        // 3-letter code (primary identifier)
  iso639_3: "",        // 3-letter code (usually same as iso639_2)
  name: "",            // English display name
  nameLocal: "",       // Local/native name (use English if not available)
  ietf: "",            // IETF language tag (usually same as iso639_1)
  ietfRegions: {},     // Object mapping country codes to region-specific tags
  lcid: 0,             // Windows LCID (use 0 if unknown)
  speakers: 0,         // Number of speakers in millions (use 0 if unknown)
}
```

**Special Requirements**:

- **First Entry**: Always keep the "Not Selected/Other" entry with all empty/zero values
- **Sorting**: Alphabetical by `name` field (after the first special entry)
- **Key Uniqueness**: Ensure no duplicate `iso639_2` codes
- **Enhancement**: Add speaker counts and regional data where known
- **Validation**: Ensure all major world languages (top 25 by speakers) are included

### Countries Target (`/client/src/data/countries.js`)

**Required Schema**:

```javascript
{
  name: "",                    // Official English name
  nameLocal: "",              // Local name (use English if not available)
  iso3166_1_alpha2: "",       // 2-letter ISO code
  iso3166_1_alpha3: "",       // 3-letter ISO code
  iso3166_1_numeric: 0,       // Numeric ISO code
  languages: [],              // Array of language codes (iso639_1 or iso639_2)
  currency: "",               // 3-letter currency code
  telCountryCode: 0,          // International dialing code
  continent: "",              // Continent code (AS, EU, AF, NA, SA, OC, AN)
  region: "",                 // Geographic region/sub-region
  population: 0,              // Population (use 0 if unknown)
}
```

**Special Requirements**:

- **First Entry**: Always keep the "Not Selected/Other" entry with all empty/zero values
- **Sorting**: Alphabetical by `name` field (after the first special entry)
- **Key Uniqueness**: Ensure no duplicate ISO codes
- **Language Mapping**: Map language codes to available language data
- **Validation**: Ensure all UN member states and major territories are included

## Synchronization Process

### Phase 1: Data Mapping

1. **Parse Source Files**:

   - Load and parse `/data/source/languages.txt` (pipe-delimited)
   - Load and parse `/data/source/countries.csv` (CSV with headers)

2. **Map Languages**:

   - Extract `iso639_2`, `iso639_1`, and `english_name` from source
   - Map to target schema fields
   - Preserve existing `nameLocal`, `ietfRegions`, `lcid`, and `speakers` data where available
   - Add new languages not in current canonical data

3. **Map Countries**:
   - Extract relevant fields from CSV columns
   - Map `UNTERM English Short` or `official_name_en` to `name`
   - Map ISO codes, currency, dialing code, continent
   - Parse `Languages` field and map to language code arrays
   - Preserve existing enhancements like `nameLocal` and `population`

### Phase 2: Data Enhancement

1. **Language Enhancements**:

   - **Speaker Counts**: Add/update speaker population data from reliable sources
   - **Regional Tags**: Enhance `ietfRegions` with country-specific language tags
   - **Local Names**: Research and add native language names where missing
   - **LCID Codes**: Add Windows LCID codes for major languages

2. **Country Enhancements**:
   - **Local Names**: Research and add native country names where missing
   - **Population Data**: Add current population estimates where missing
   - **Language Validation**: Ensure language codes exist in the languages data
   - **Regional Data**: Enhance region/sub-region information

### Phase 3: Data Validation

1. **Referential Integrity**:

   - Ensure all country `languages` arrays contain valid language codes
   - Verify no orphaned language references
   - Check for duplicate ISO codes or identifiers

2. **Completeness Checks**:

   - Verify all UN member states are present
   - Ensure top 25 world languages by speakers are included
   - Check for missing critical fields (names, ISO codes)

3. **Format Validation**:
   - Validate ISO code formats (2-letter, 3-letter patterns)
   - Check numeric field formats
   - Ensure proper array and object structures

### Phase 4: Quality Assurance

1. **Data Consistency**:

   - Consistent naming conventions across files
   - Proper capitalization and formatting
   - Consistent use of empty strings vs null values

2. **Sorting and Organization**:

   - Maintain alphabetical sorting by display names
   - Preserve special "Not Selected/Other" entries at the top
   - Consistent indentation and formatting in output files

3. **Backwards Compatibility**:
   - Preserve existing application-specific enhancements
   - Maintain API compatibility for consuming code
   - Document any breaking changes

## Implementation Approach

**IMPORTANT**: The LLM should perform the synchronization directly by reading, comparing, and updating the data files. Do NOT create scripts - implement the synchronization process using the available file editing tools.

### Data Comparison Tool

Before performing synchronization, use the comparison tool to identify differences:

```bash
# Compare all data types
yarn compare:data

# Compare specific data types
yarn compare:data languages
yarn compare:data countries

# Get detailed output
node bin/compare-data.cjs languages --verbose
```

The comparison tool provides:

- **Missing in canonical**: Items that should be added from source data
- **Only in canonical**: Application-specific entries to preserve
- **Detailed counts**: Total items and sync status
- **Key identification**: Specific codes/keys for easy reference

### Process Overview

1. **Run Comparison**: Use `yarn compare:data` to identify missing entries
2. **Read Source Data**: Parse `/data/source/languages.txt` and `/data/source/countries.csv`
3. **Read Current Data**: Load existing `/client/src/data/languages.js` and `/client/src/data/countries.js`
4. **Compare & Merge**: Add missing entries identified by the comparison tool
5. **Create Backups**: Generate `.bak` files before making changes
6. **Update Files**: Apply changes while preserving structure and formatting
7. **Validate Results**: Re-run comparison tool to verify synchronization

### Example Logic (Conceptual Reference Only)

```javascript
// EXAMPLE ONLY - Language synchronization concept
// LLM should implement this logic using file editing tools, not create this script

// Parse source: iso639_2||iso639_1|english_name|french_name
// For each source language:
//   - Find existing language by iso639_2 code
//   - If not found: add new language with proper schema
//   - If found but missing data: fill in gaps (preserve existing enhancements)
//   - Maintain "Not Selected" entry at position 0
//   - Sort alphabetically by name (except position 0)

// Enhanced language object structure:
const languageExample = {
  iso639_1: sourceLang.iso639_1 || "",
  iso639_2: sourceLang.iso639_2,
  iso639_3: sourceLang.iso639_2, // Usually the same
  name: sourceLang.english_name,
  nameLocal: existing?.nameLocal || sourceLang.english_name, // Preserve existing
  ietf: sourceLang.iso639_1 || "",
  ietfRegions: existing?.ietfRegions || {}, // Preserve existing
  lcid: existing?.lcid || 0, // Preserve existing
  speakers: existing?.speakers || 0, // Preserve existing
};
```

```javascript
// EXAMPLE ONLY - Country synchronization concept
// LLM should implement this logic using file editing tools, not create this script

// Parse source CSV with headers
// For each source country:
//   - Find existing country by ISO3166-1-Alpha-2
//   - If not found: add new country with proper schema
//   - If found but missing data: fill in gaps (preserve existing enhancements)
//   - Validate language codes against language data
//   - Maintain "Not Selected" entry at position 0
//   - Sort alphabetically by name (except position 0)

// Enhanced country object structure:
const countryExample = {
  name:
    sourceCountry["UNTERM English Short"] || sourceCountry["official_name_en"],
  nameLocal: existing?.nameLocal || sourceCountry["UNTERM English Short"], // Preserve existing
  iso3166_1_alpha2: sourceCountry["ISO3166-1-Alpha-2"],
  iso3166_1_alpha3: sourceCountry["ISO3166-1-Alpha-3"],
  iso3166_1_numeric: parseInt(sourceCountry["ISO3166-1-numeric"]) || 0,
  languages: validatedLanguageCodes, // Parse and validate from source
  currency: sourceCountry["ISO4217-currency_alphabetic_code"] || "",
  telCountryCode: parseInt(sourceCountry.Dial) || 0,
  continent: sourceCountry.Continent || "",
  region: sourceCountry["Sub-region Name"] || "",
  population: existing?.population || 0, // Preserve existing
};
```

## File Modification Process

### Direct Implementation

The LLM should use file editing tools to directly:

1. **Create Backups**: Copy existing files to `.bak` versions before modification
2. **Parse Source Data**: Read and understand source file formats
3. **Analyze Current Data**: Identify what exists and what's missing
4. **Merge Intelligently**: Add missing entries and fill data gaps
5. **Preserve Structure**: Maintain file headers, formatting, and export statements
6. **Validate Changes**: Ensure data integrity and application compatibility

### Backup Strategy

Before making any changes:

- Create `.bak` files of existing canonical data files
- Use the same single backup approach as the update script
- Validate source data is available and parseable

### File Format Requirements

1. **File Headers**: Preserve existing JSDoc comments and structure
2. **Export Format**: Maintain `const data = [...]; export default data;` pattern
3. **Indentation**: Use 2-space indentation consistently
4. **Line Endings**: Use Unix line endings (LF)
5. **Sorting**: Alphabetical by name (preserving special entries at top)

### Data Preservation Rules

- **Never overwrite good existing data** (nameLocal, speakers, population, etc.)
- **Always preserve** the "Not Selected/Other" entry at position 0
- **Maintain existing enhancements** like ietfRegions, lcid values
- **Fill gaps only** - don't replace complete, accurate data

## Error Handling

1. **Missing Data**: Log warnings for missing critical fields
2. **Invalid Codes**: Report and skip invalid ISO or language codes
3. **Duplicate Entries**: Resolve conflicts in favor of more complete data
4. **Format Errors**: Provide clear error messages for parsing failures

## Success Metrics

After synchronization, verify:

- ✅ All files parse correctly as JavaScript modules
- ✅ No duplicate keys or identifiers
- ✅ All referential integrity constraints satisfied
- ✅ Existing application functionality remains intact
- ✅ New authoritative data is properly integrated
- ✅ Top 25 world languages and all UN countries included

## Maintenance Notes

- **Update Frequency**: Run synchronization when source data is updated
- **Review Process**: Manual review recommended for significant changes
- **Testing**: Run integration tests after data updates
- **Documentation**: Update this file when adding new data sources or fields

## Extension Points

This synchronization process is designed to be extensible:

1. **New Data Sources**: Add entries to the `DATA_SOURCES` array in `/bin/update-source-data.sh`
2. **Additional Fields**: Extend schemas while maintaining backwards compatibility
3. **Validation Rules**: Add new validation steps to the process
4. **Enhancement Sources**: Integrate additional authoritative data sources

## Validation Checklist

After synchronization, verify:

- [ ] All source entries are represented in target (unless deliberately excluded)
- [ ] No existing good data was overwritten
- [ ] All required fields are present in each entry
- [ ] Data types match the structure requirements
- [ ] Arrays are sorted consistently
- [ ] Empty/default entries for UI are preserved
- [ ] File exports remain functional
- [ ] **Comparison tool shows no missing entries**: `yarn compare:data` reports sync status

## Success Criteria

The synchronization is successful when:

1. **Coverage is improved** - more countries/languages available
2. **Data quality is enhanced** - missing fields are filled
3. **Structure is maintained** - existing code continues to work
4. **Performance is acceptable** - file sizes remain reasonable
5. **Tests pass** - existing functionality is not broken

---

_This document serves as a comprehensive guide for LLMs to perform accurate, consistent, and enhanced data synchronization while preserving application functionality and data quality using direct file editing tools._
