#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { lstat, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import countries from "../../dist/client/src/data/countries.js";
import languages from "../../dist/client/src/data/languages.js";
import {
  getCountryByCode,
  getCountryOptions,
} from "../../dist/client/src/helpers/countries.js";
import {
  getCountryByCodeFromData,
  getCountryOptionsFromData,
} from "../../dist/client/src/helpers/countries-core.js";
import {
  getLanguageByCode,
  getLanguageOptions,
} from "../../dist/client/src/helpers/languages.js";
import {
  getLanguageByCodeFromData,
  getLanguageOptionsFromData,
} from "../../dist/client/src/helpers/languages-core.js";
import {
  getSupportedTimezones,
  getTimezoneOptions,
} from "../../dist/client/src/helpers/timezones.js";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const FIXTURES = [
  {
    name: "country-lookup",
    run: () => getCountryByCode(countries.at(-1)?.iso3166_1_alpha2),
  },
  {
    name: "country-lookup-host-data",
    run: () =>
      getCountryByCodeFromData(countries.at(-1)?.iso3166_1_alpha2, countries),
  },
  {
    name: "country-options-priority",
    run: () =>
      getCountryOptions({
        includeEmpty: true,
        topCountries: ["TW", "US", "GB"],
        sortBy: "name",
      }),
  },
  {
    name: "country-options-host-data",
    run: () =>
      getCountryOptionsFromData(countries, {
        includeEmpty: true,
        topCountries: ["TW", "US", "GB"],
        sortBy: "name",
      }),
  },
  {
    name: "language-lookup",
    run: () => getLanguageByCode(languages.at(-1)?.iso639_1),
  },
  {
    name: "language-lookup-host-data",
    run: () => getLanguageByCodeFromData(languages.at(-1)?.iso639_1, languages),
  },
  {
    name: "language-options-priority",
    run: () =>
      getLanguageOptions({
        includeEmpty: true,
        topLanguages: { ietfRegions: ["TW", "US"] },
        sortBy: "name",
      }),
  },
  {
    name: "language-options-host-data",
    run: () =>
      getLanguageOptionsFromData(languages, {
        includeEmpty: true,
        topLanguages: { ietfRegions: ["TW", "US"] },
        sortBy: "name",
      }),
  },
  {
    name: "timezone-list",
    run: () => getSupportedTimezones(),
  },
  {
    name: "timezone-options-winter",
    run: () =>
      getTimezoneOptions({ referenceDate: new Date("2026-01-15T12:00:00Z") }),
  },
  {
    name: "timezone-options-winter-duplicate-work-control",
    run: () => {
      getSupportedTimezones();
      return getTimezoneOptions({
        referenceDate: new Date("2026-01-15T12:00:00Z"),
      });
    },
  },
  {
    name: "timezone-options-summer",
    run: () =>
      getTimezoneOptions({ referenceDate: new Date("2026-07-15T12:00:00Z") }),
  },
  {
    name: "timezone-options-summer-duplicate-work-control",
    run: () => {
      getSupportedTimezones();
      return getTimezoneOptions({
        referenceDate: new Date("2026-07-15T12:00:00Z"),
      });
    },
  },
];

const loadUiFixtures = async () => {
  const clientRoot = path.join(repositoryRoot, "client");
  const clientDistRoot = path.join(repositoryRoot, "dist/client");
  const temporaryDirectory = await mkdtemp(
    path.join(clientRoot, ".benchmark-geographic-"),
  );
  const distNodeModules = path.join(clientDistRoot, "node_modules");
  let createdNodeModulesLink = false;

  try {
    try {
      await lstat(distNodeModules);
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await symlink(
        path.join(clientRoot, "node_modules"),
        distNodeModules,
        "dir",
      );
      createdNodeModulesLink = true;
    }

    const entryPath = path.join(temporaryDirectory, "selectors.mjs");
    const entry = [
      'import * as React from "react";',
      'import * as ReactDOMServer from "react-dom/server";',
      `import CountrySelect from ${JSON.stringify(path.join(repositoryRoot, "dist/client/src/components/form/CountrySelect.js"))};`,
      `import LanguageSelect from ${JSON.stringify(path.join(repositoryRoot, "dist/client/src/components/form/LanguageSelect.js"))};`,
      `import CountrySelectCore from ${JSON.stringify(path.join(repositoryRoot, "dist/client/src/components/form/CountrySelectCore.js"))};`,
      `import LanguageSelectCore from ${JSON.stringify(path.join(repositoryRoot, "dist/client/src/components/form/LanguageSelectCore.js"))};`,
      "export { React, ReactDOMServer, CountrySelect, LanguageSelect, CountrySelectCore, LanguageSelectCore };",
    ].join("\n");
    await writeFile(entryPath, entry);
    const {
      React,
      ReactDOMServer,
      CountrySelect: CountrySelectModule,
      LanguageSelect: LanguageSelectModule,
      CountrySelectCore: CountrySelectCoreModule,
      LanguageSelectCore: LanguageSelectCoreModule,
    } = await import(pathToFileURL(entryPath).href);
    const renderToStaticMarkup = ReactDOMServer.renderToStaticMarkup;

    const renderSelect = (Component, props) => {
      return renderToStaticMarkup(React.createElement(Component, props));
    };

    return [
      {
        name: "country-select-default-ssr",
        run: () =>
          renderSelect(CountrySelectModule, {
            value: "US",
            onChange: () => {},
            topCountries: ["TW", "US", "GB"],
          }),
      },
      {
        name: "country-select-host-data-ssr",
        run: () =>
          renderSelect(CountrySelectCoreModule, {
            countries,
            value: "US",
            onChange: () => {},
            topCountries: ["TW", "US", "GB"],
          }),
      },
      {
        name: "language-select-default-ssr",
        run: () =>
          renderSelect(LanguageSelectModule, {
            value: "en",
            onChange: () => {},
            topLanguages: ["en", "fr", "es", "de"],
          }),
      },
      {
        name: "language-select-host-data-ssr",
        run: () =>
          renderSelect(LanguageSelectCoreModule, {
            languages,
            value: "en",
            onChange: () => {},
            topLanguages: ["en", "fr", "es", "de"],
          }),
      },
    ];
  } catch (error) {
    throw new Error(
      `Selector fixtures require the optional React/PropTypes/MUI client dependencies: ${error.message}`,
    );
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
    if (createdNodeModulesLink) {
      await rm(distNodeModules, { force: true });
    }
  }
};

const parseArgs = (args) => {
  const options = {
    durationMs: 150,
    samples: 5,
    only: null,
    includeUi: false,
    json: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--json") {
      options.json = true;
    } else if (arg === "--include-ui") {
      options.includeUi = true;
    } else if (arg === "--duration-ms") {
      options.durationMs = Number(args[++index]);
    } else if (arg === "--samples") {
      options.samples = Number(args[++index]);
    } else if (arg === "--only") {
      options.only = args[++index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isInteger(options.durationMs) || options.durationMs < 1) {
    throw new Error("--duration-ms must be a positive integer");
  }
  if (!Number.isInteger(options.samples) || options.samples < 1) {
    throw new Error("--samples must be a positive integer");
  }

  return options;
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

const runFor = (callback, durationMs) => {
  let iterations = 0;
  const startedAt = performance.now();

  do {
    callback();
    iterations += 1;
  } while (performance.now() - startedAt < durationMs);

  return {
    iterations,
    elapsedMs: performance.now() - startedAt,
  };
};

const measure = (fixture, options) => {
  runFor(fixture.run, Math.min(50, options.durationMs));

  const samples = [];
  for (let sample = 0; sample < options.samples; sample += 1) {
    const result = runFor(fixture.run, options.durationMs);
    samples.push(result.elapsedMs / result.iterations);
  }

  return {
    name: fixture.name,
    medianMsPerOperation: median(samples),
    samplesMsPerOperation: samples,
  };
};

const printHelp = () => {
  process.stdout.write(
    `Usage: node scripts/dev/benchmark-geographic.mjs [options]\n\nOptions:\n  --duration-ms <n>  Target duration of each sample (default: 150)\n  --samples <n>      Number of samples per fixture (default: 5)\n  --only <fixture>   Run one named fixture\n  --include-ui       Also profile React server-rendered selectors\n  --json             Print machine-readable results\n  --help, -h         Show this help\n\nFixtures:\n${[...FIXTURES.map(({ name }) => name), "country-select-default-ssr", "country-select-host-data-ssr", "language-select-default-ssr", "language-select-host-data-ssr"].map((name) => `  ${name}`).join("\n")}\n`,
  );
};

try {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
  } else {
    const fixtures = [...FIXTURES];
    const needsUi =
      options.includeUi ||
      options.only?.startsWith("country-select-") ||
      options.only?.startsWith("language-select-");

    if (needsUi) {
      fixtures.push(...(await loadUiFixtures()));
    }

    const selectedFixtures = options.only
      ? fixtures.filter(({ name }) => name === options.only)
      : fixtures;

    if (selectedFixtures.length === 0) {
      throw new Error(`Unknown fixture: ${options.only}`);
    }

    const report = {
      runtime: process.version,
      countryRows: countries.length,
      languageRows: languages.length,
      timezoneCount: getSupportedTimezones().length,
      durationMs: options.durationMs,
      samples: options.samples,
      fixtures: selectedFixtures.map((fixture) => measure(fixture, options)),
    };

    if (options.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      process.stdout.write(
        `Node ${report.runtime}; ${report.countryRows} countries; ${report.languageRows} languages; ${report.timezoneCount} timezones\n`,
      );
      const fixtureNameWidth =
        Math.max(
          "Fixture".length,
          ...report.fixtures.map(({ name }) => name.length),
        ) + 2;
      process.stdout.write(
        `${"Fixture".padEnd(fixtureNameWidth)}Median ms/op\n`,
      );
      for (const fixture of report.fixtures) {
        process.stdout.write(
          `${fixture.name.padEnd(fixtureNameWidth)}${fixture.medianMsPerOperation.toFixed(6)}\n`,
        );
      }
    }
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
