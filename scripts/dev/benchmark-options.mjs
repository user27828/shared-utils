#!/usr/bin/env node
/**
 * Compare hot utility calls with small and large unrelated ENV options.
 * Requires the built dist output. Timings are diagnostics; there are no CI thresholds.
 */
import { performance } from "node:perf_hooks";
import { formatDate } from "../../dist/utils/src/dates.js";
import { formatFileSize } from "../../dist/utils/src/files.js";
import log from "../../dist/utils/src/log.js";
import {
  OptionsManager,
  optionsManager,
} from "../../dist/utils/src/options-manager.js";

const defaults = {
  iterations: 1_000,
  samples: 5,
  normalEnvKeys: 8,
  largeEnvKeys: 2_000,
};
const usage =
  "Usage: node scripts/dev/benchmark-options.mjs [--iterations <count>] [--samples <count>] [--normal-env-keys <count>] [--large-env-keys <count>]\nRun after yarn build. Reports median milliseconds per operation and the large/small ratio; timings are informational, with no absolute threshold.";

function parseCount(value, option, maximum) {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 1 || count > maximum) {
    throw new Error(
      `${option} must be a positive integer no greater than ${maximum}.\n${usage}`,
    );
  }
  return count;
}

function parseArgs(args) {
  const options = { ...defaults };
  const optionNames = {
    "--iterations": "iterations",
    "--samples": "samples",
    "--normal-env-keys": "normalEnvKeys",
    "--large-env-keys": "largeEnvKeys",
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help") {
      console.log(usage);
      process.exit(0);
    }
    const optionName = optionNames[argument];
    if (!optionName || args[index + 1] === undefined) {
      throw new Error(`Invalid argument: ${argument}\n${usage}`);
    }
    const maximum =
      optionName === "iterations"
        ? 100_000
        : optionName === "samples"
          ? 31
          : 25_000;
    options[optionName] = parseCount(args[index + 1], argument, maximum);
    index += 1;
  }

  if (options.normalEnvKeys > options.largeEnvKeys) {
    throw new Error(
      `--large-env-keys must be at least --normal-env-keys.\n${usage}`,
    );
  }
  const warmupIterations = Math.min(options.iterations, 250);
  const optionReads =
    (options.iterations + warmupIterations) *
    options.samples *
    options.largeEnvKeys;
  if (optionReads > 50_000_000) {
    throw new Error(
      "The requested large configuration and sample count exceed the 50 million key-operation safety limit, including warmup. Reduce --iterations, --samples, or --large-env-keys.\n" +
        usage,
    );
  }
  return options;
}

function makeEnvOptions(keyCount) {
  return Object.fromEntries(
    Array.from({ length: keyCount }, (_, index) => [
      `BENCH_ENV_${index}`,
      `value-${index}`,
    ]),
  );
}

function makeEnvManager(keyCount) {
  const manager = new OptionsManager("ENV", {});
  manager.setOption(makeEnvOptions(keyCount));
  let getterCalls = 0;
  const getOption = manager.getOption.bind(manager);
  manager.getOption = (...args) => {
    getterCalls += 1;
    return getOption(...args);
  };
  return { manager, getGetterCalls: () => getterCalls };
}

function median(values) {
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 0) {
    return (ordered[middle - 1] + ordered[middle]) / 2;
  }
  return ordered[middle];
}

const options = parseArgs(process.argv.slice(2));
const envManagers = {
  normal: makeEnvManager(options.normalEnvKeys),
  large: makeEnvManager(options.largeEnvKeys),
};

const workloads = {
  formatFileSize: () => formatFileSize(4 * 1024 * 1024),
  formatDate: () => formatDate(new Date("2024-01-02T03:04:05.000Z")),
  logInfo: () => log.info("options benchmark"),
  allOptionsSnapshotControl: () => optionsManager.getAllOptions(),
};
const originalConsoleMethods = { ...log.ORIGINAL_CONSOLE_METHODS };
for (const method of Object.keys(originalConsoleMethods)) {
  log.ORIGINAL_CONSOLE_METHODS[method] = () => {};
}
log.setOptions({ type: "server", showCaller: false, interceptor: undefined });
log.isProduction = false;

function warmAndMeasure(workload, envSizeName) {
  optionsManager.registerManager("ENV", envManagers[envSizeName].manager);
  const run = workloads[workload];
  const warmupIterations = Math.min(options.iterations, 250);
  for (let index = 0; index < warmupIterations; index += 1) {
    run();
  }

  const getterCallsBeforeMeasurement =
    envManagers[envSizeName].getGetterCalls();
  const startedAt = performance.now();
  for (let index = 0; index < options.iterations; index += 1) {
    run();
  }
  return {
    millisecondsPerOperation:
      (performance.now() - startedAt) / options.iterations,
    envGetterCallsPerOperation:
      (envManagers[envSizeName].getGetterCalls() -
        getterCallsBeforeMeasurement) /
      options.iterations,
  };
}

const results = Object.fromEntries(
  Object.keys(workloads).map((workload) => [
    workload,
    { normal: [], large: [] },
  ]),
);

try {
  for (let sample = 0; sample < options.samples; sample += 1) {
    const sizes =
      sample % 2 === 0
        ? [
            ["normal", "normal"],
            ["large", "large"],
          ]
        : [
            ["large", "large"],
            ["normal", "normal"],
          ];
    for (const [sizeName, keyCount] of sizes) {
      for (const workload of Object.keys(workloads)) {
        const duration = warmAndMeasure(workload, keyCount);
        results[workload][sizeName].push(duration);
      }
    }
  }
} finally {
  Object.assign(log.ORIGINAL_CONSOLE_METHODS, originalConsoleMethods);
}

console.log(`Options hot path benchmark (${process.version})`);
console.log(
  `Units: median milliseconds per operation; ${options.samples} samples × ${options.iterations} measured operations, after up to 250 warmup operations per sample.`,
);
console.log(
  `Unrelated ENV size: ${options.normalEnvKeys} keys (normal), ${options.largeEnvKeys} keys (large). Logger output is muted.`,
);
console.log(
  "ENV getter calls per measured operation (direct workloads should stay at zero; the snapshot control reads all managers):",
);
for (const [workload, samples] of Object.entries(results)) {
  const normal = median(
    samples.normal.map((sample) => sample.millisecondsPerOperation),
  );
  const large = median(
    samples.large.map((sample) => sample.millisecondsPerOperation),
  );
  const ratio = normal === 0 ? Number.POSITIVE_INFINITY : large / normal;
  const normalEnvReads = median(
    samples.normal.map((sample) => sample.envGetterCallsPerOperation),
  );
  const largeEnvReads = median(
    samples.large.map((sample) => sample.envGetterCallsPerOperation),
  );
  console.log(
    `  ${workload}: ENV reads ${normalEnvReads} (normal), ${largeEnvReads} (large)`,
  );
  console.log(
    `${workload}: normal ${normal.toFixed(6)} ms/op; large ${large.toFixed(6)} ms/op; large/normal ${ratio.toFixed(2)}×`,
  );
}
