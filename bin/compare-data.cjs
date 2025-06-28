#!/usr/bin/env node

/**
 * Data Comparison Tool
 *
 * Compares source data files with canonical application data files
 * and outputs detailed differences for LLM-driven synchronization.
 *
 * Usage:
 *   node bin/compare-data.js [type] [options]
 *
 * Types:
 *   languages  - Compare languages source vs canonical
 *   countries  - Compare countries source vs canonical
 *   all        - Compare all data types (default)
 *
 * Options:
 *   --verbose  - Show detailed comparison information
 *   --json     - Output results in JSON format
 */

const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  sourceDir: path.join(__dirname, "../data/source"),
  canonicalDir: path.join(__dirname, "../client/src/data"),
  sources: {
    languages: {
      sourceFile: "languages.txt",
      canonicalFile: "languages.js",
      format: "pipe-delimited",
      primaryKey: "iso639_2",
    },
    countries: {
      sourceFile: "countries.csv",
      canonicalFile: "countries.js",
      format: "csv",
      primaryKey: "iso3166_1_alpha2",
    },
  },
};

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

class DataComparator {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.jsonOutput = options.json || false;
    this.results = {};
  }

  log(message, color = "") {
    if (!this.jsonOutput) {
      console.log(`${color}${message}${colors.reset}`);
    }
  }

  // Parse languages source file (pipe-delimited format)
  parseLanguagesSource(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content
      .replace(/^\uFEFF/, "")
      .split("\n")
      .filter((line) => line.trim());

    return lines
      .map((line) => {
        const parts = line.split("|");
        return {
          iso639_2: parts[0] || "",
          iso639_2_alt: parts[1] || "",
          iso639_1: parts[2] || "",
          english_name: parts[3] || "",
          french_name: parts[4] || "",
        };
      })
      .filter((item) => item.iso639_2);
  }

  // Parse countries source file (CSV format)
  parseCountriesSource(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.replace(/^\uFEFF/, "").split("\n");
    const headers = lines[0].split(",");

    return lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = this.parseCSVLine(line);
        const country = {};
        headers.forEach((header, index) => {
          country[header] = values[index] || "";
        });
        return country;
      })
      .filter((item) => item["ISO3166-1-Alpha-2"]);
  }

  // Simple CSV parser that handles quoted fields
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  // Parse canonical JavaScript data files
  parseCanonicalData(filePath) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract the array from the JavaScript file
    const arrayMatch = content.match(/const\s+\w+\s*=\s*(\[[\s\S]*?\]);/);
    if (!arrayMatch) {
      throw new Error(`Could not parse JavaScript array from ${filePath}`);
    }

    try {
      // Use eval to parse the array (safe in this controlled context)
      const data = eval(arrayMatch[1]);
      return data.filter((item) => item.iso639_2 || item.iso3166_1_alpha2); // Filter out empty entries
    } catch (error) {
      throw new Error(
        `Failed to parse data from ${filePath}: ${error.message}`,
      );
    }
  }

  // Compare languages data
  compareLanguages() {
    const config = CONFIG.sources.languages;
    const sourceFile = path.join(CONFIG.sourceDir, config.sourceFile);
    const canonicalFile = path.join(CONFIG.canonicalDir, config.canonicalFile);

    this.log(
      `\n${colors.bright}🔍 Comparing Languages Data${colors.reset}`,
      colors.cyan,
    );
    this.log(`Source: ${sourceFile}`);
    this.log(`Canonical: ${canonicalFile}`);

    const sourceData = this.parseLanguagesSource(sourceFile);
    const canonicalData = this.parseCanonicalData(canonicalFile);

    return this.performComparison(
      "languages",
      sourceData,
      canonicalData,
      config.primaryKey,
    );
  }

  // Compare countries data
  compareCountries() {
    const config = CONFIG.sources.countries;
    const sourceFile = path.join(CONFIG.sourceDir, config.sourceFile);
    const canonicalFile = path.join(CONFIG.canonicalDir, config.canonicalFile);

    this.log(
      `\n${colors.bright}🔍 Comparing Countries Data${colors.reset}`,
      colors.cyan,
    );
    this.log(`Source: ${sourceFile}`);
    this.log(`Canonical: ${canonicalFile}`);

    const sourceData = this.parseCountriesSource(sourceFile);
    const canonicalData = this.parseCanonicalData(canonicalFile);

    // Map source data to comparable format
    const mappedSourceData = sourceData.map((country) => ({
      iso3166_1_alpha2: country["ISO3166-1-Alpha-2"],
      iso3166_1_alpha3: country["ISO3166-1-Alpha-3"],
      iso3166_1_numeric: parseInt(country["ISO3166-1-numeric"]) || 0,
      name: country["UNTERM English Short"] || country["official_name_en"],
      currency: country["ISO4217-currency_alphabetic_code"],
      telCountryCode: parseInt(country.Dial) || 0,
      continent: country.Continent,
      region: country["Sub-region Name"] || "",
      languages: (country.Languages || "")
        .split(",")
        .map((lang) => lang.trim())
        .filter((lang) => lang),
    }));

    return this.performComparison(
      "countries",
      mappedSourceData,
      canonicalData,
      config.primaryKey,
    );
  }

  // Generic comparison logic
  performComparison(type, sourceData, canonicalData, primaryKey) {
    // Create lookup maps
    const sourceMap = new Map();
    const canonicalMap = new Map();

    sourceData.forEach((item) => {
      const key = item[primaryKey];
      if (key) sourceMap.set(key, item);
    });

    canonicalData.forEach((item) => {
      const key = item[primaryKey];
      if (key) canonicalMap.set(key, item);
    });

    // Find differences
    const onlyInSource = [];
    const onlyInCanonical = [];
    const inBoth = [];
    const conflicts = [];

    // Check items only in source
    sourceMap.forEach((sourceItem, key) => {
      if (!canonicalMap.has(key)) {
        onlyInSource.push({ key, data: sourceItem });
      } else {
        const canonicalItem = canonicalMap.get(key);
        const comparison = this.compareItems(sourceItem, canonicalItem, type);
        if (comparison.hasConflicts) {
          conflicts.push({
            key,
            source: sourceItem,
            canonical: canonicalItem,
            conflicts: comparison.conflicts,
          });
        } else {
          inBoth.push({ key, source: sourceItem, canonical: canonicalItem });
        }
      }
    });

    // Check items only in canonical
    canonicalMap.forEach((canonicalItem, key) => {
      if (!sourceMap.has(key)) {
        onlyInCanonical.push({ key, data: canonicalItem });
      }
    });

    const result = {
      type,
      summary: {
        totalSource: sourceData.length,
        totalCanonical: canonicalData.length,
        onlyInSource: onlyInSource.length,
        onlyInCanonical: onlyInCanonical.length,
        inBoth: inBoth.length,
        conflicts: conflicts.length,
      },
      differences: {
        onlyInSource,
        onlyInCanonical,
        conflicts,
      },
    };

    this.displayResults(result);
    return result;
  }

  // Compare individual items for conflicts
  compareItems(sourceItem, canonicalItem, type) {
    const conflicts = [];
    const hasConflicts = false;

    // For now, we primarily care about missing items, not field-level conflicts
    // This could be expanded to detect field-level differences if needed

    return { hasConflicts, conflicts };
  }

  // Display comparison results
  displayResults(result) {
    const { type, summary, differences } = result;

    this.log(
      `\n${colors.bright}📊 ${type.toUpperCase()} COMPARISON RESULTS${colors.reset}`,
      colors.blue,
    );
    this.log(`Total in source: ${summary.totalSource}`);
    this.log(`Total in canonical: ${summary.totalCanonical}`);

    if (summary.onlyInSource > 0) {
      this.log(
        `\n${colors.bright}➕ Missing in canonical (${summary.onlyInSource}):${colors.reset}`,
        colors.green,
      );
      differences.onlyInSource.forEach((item) => {
        if (type === "languages") {
          this.log(`  • ${item.data.english_name} (${item.key})`, colors.green);
        } else if (type === "countries") {
          this.log(`  • ${item.data.name} (${item.key})`, colors.green);
        }

        if (this.verbose) {
          this.log(`    ${JSON.stringify(item.data, null, 2)}`, colors.green);
        }
      });
    }

    if (summary.onlyInCanonical > 0) {
      this.log(
        `\n${colors.bright}🔍 Only in canonical (${summary.onlyInCanonical}):${colors.reset}`,
        colors.yellow,
      );
      differences.onlyInCanonical.forEach((item) => {
        if (type === "languages") {
          this.log(`  • ${item.data.name} (${item.key})`, colors.yellow);
        } else if (type === "countries") {
          this.log(`  • ${item.data.name} (${item.key})`, colors.yellow);
        }
      });
    }

    if (summary.conflicts > 0) {
      this.log(
        `\n${colors.bright}⚠️  Conflicts (${summary.conflicts}):${colors.reset}`,
        colors.red,
      );
      differences.conflicts.forEach((item) => {
        this.log(`  • ${item.key}`, colors.red);
      });
    }

    this.log(
      `\n${colors.bright}✅ Items in both: ${summary.inBoth}${colors.reset}`,
      colors.cyan,
    );
  }

  // Main comparison method
  compare(type = "all") {
    const startTime = Date.now();
    this.log(
      `${colors.bright}🚀 Starting Data Comparison${colors.reset}`,
      colors.magenta,
    );

    try {
      if (type === "all") {
        this.results.languages = this.compareLanguages();
        this.results.countries = this.compareCountries();
      } else if (type === "languages") {
        this.results.languages = this.compareLanguages();
      } else if (type === "countries") {
        this.results.countries = this.compareCountries();
      } else {
        throw new Error(`Unknown comparison type: ${type}`);
      }

      const duration = Date.now() - startTime;
      this.log(
        `\n${colors.bright}🎉 Comparison completed in ${duration}ms${colors.reset}`,
        colors.magenta,
      );

      if (this.jsonOutput) {
        console.log(JSON.stringify(this.results, null, 2));
      }

      return this.results;
    } catch (error) {
      this.log(
        `\n${colors.bright}❌ Error: ${error.message}${colors.reset}`,
        colors.red,
      );
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const type = args.find((arg) => !arg.startsWith("--")) || "all";
  const verbose = args.includes("--verbose");
  const json = args.includes("--json");

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Data Comparison Tool

Usage: node bin/compare-data.js [type] [options]

Types:
  languages    Compare languages source vs canonical
  countries    Compare countries source vs canonical
  all          Compare all data types (default)

Options:
  --verbose    Show detailed comparison information
  --json       Output results in JSON format
  --help, -h   Show this help message

Examples:
  node bin/compare-data.js languages
  node bin/compare-data.js countries --verbose
  node bin/compare-data.js all --json
  yarn compare:data languages
`);
    return;
  }

  const comparator = new DataComparator({ verbose, json });
  comparator.compare(type);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DataComparator };
