/**
 * Minimal async test runner for `test-consumer/server`.
 *
 * Purpose: provide `describe/it/expect/beforeAll/afterAll` primitives to run
 * the shared-utils CMS/FM connector conformance harnesses without adding
 * external test framework dependencies.
 */

const isPromiseLike = (value) => {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.then === "function" &&
    typeof value.catch === "function"
  );
};

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}

const deepEqual = (a, b) => {
  if (Object.is(a, b)) {
    return true;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (a === null || b === null) {
    return a === b;
  }

  if (typeof a !== "object") {
    return false;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    return false;
  }

  if (Array.isArray(a)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();

  if (aKeys.length !== bKeys.length) {
    return false;
  }

  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) {
      return false;
    }
  }

  for (const key of aKeys) {
    if (!deepEqual(a[key], b[key])) {
      return false;
    }
  }

  return true;
};

const formatValue = (value) => {
  try {
    if (typeof value === "string") {
      return JSON.stringify(value);
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const makeExpect = (received, negate) => {
  const assert = (condition, message) => {
    if (negate ? condition : !condition) {
      const prefix = negate ? "Expected NOT: " : "Expected: ";
      throw new AssertionError(prefix + message);
    }
  };

  const api = {
    get not() {
      return makeExpect(received, !negate);
    },

    toBe(expected) {
      assert(
        Object.is(received, expected),
        `${formatValue(received)} to be ${formatValue(expected)}`,
      );
    },

    toEqual(expected) {
      assert(
        deepEqual(received, expected),
        `${formatValue(received)} to equal ${formatValue(expected)}`,
      );
    },

    toBeTruthy() {
      assert(
        Boolean(received) === true,
        `${formatValue(received)} to be truthy`,
      );
    },

    toBeFalsy() {
      assert(
        Boolean(received) === false,
        `${formatValue(received)} to be falsy`,
      );
    },

    toBeNull() {
      assert(received === null, `${formatValue(received)} to be null`);
    },

    toBeUndefined() {
      assert(
        received === undefined,
        `${formatValue(received)} to be undefined`,
      );
    },

    toBeDefined() {
      assert(received !== undefined, `${formatValue(received)} to be defined`);
    },

    toContain(sub) {
      if (typeof received === "string") {
        assert(
          received.includes(sub),
          `${formatValue(received)} to contain ${formatValue(sub)}`,
        );
        return;
      }
      if (Array.isArray(received)) {
        assert(
          received.includes(sub),
          `${formatValue(received)} to contain ${formatValue(sub)}`,
        );
        return;
      }
      throw new AssertionError(
        `toContain not supported for type: ${typeof received}`,
      );
    },

    toMatch(regex) {
      if (!(regex instanceof RegExp)) {
        throw new AssertionError("toMatch expects a RegExp");
      }
      assert(
        typeof received === "string" && regex.test(received),
        `${formatValue(received)} to match ${String(regex)}`,
      );
    },

    toBeGreaterThan(n) {
      assert(
        typeof received === "number" && received > n,
        `${formatValue(received)} to be > ${formatValue(n)}`,
      );
    },

    toBeGreaterThanOrEqual(n) {
      assert(
        typeof received === "number" && received >= n,
        `${formatValue(received)} to be >= ${formatValue(n)}`,
      );
    },

    toBeLessThanOrEqual(n) {
      assert(
        typeof received === "number" && received <= n,
        `${formatValue(received)} to be <= ${formatValue(n)}`,
      );
    },
  };

  return api;
};

export const expect = (received) => {
  return makeExpect(received, false);
};

const createSuite = (name) => {
  return {
    name,
    suites: [],
    tests: [],
    beforeAll: [],
    afterAll: [],
  };
};

export function createMiniTestRunner() {
  const root = createSuite("<root>");
  const suiteStack = [root];

  const describe = (name, fn) => {
    const parent = suiteStack[suiteStack.length - 1];
    const suite = createSuite(String(name));
    parent.suites.push(suite);

    suiteStack.push(suite);
    try {
      fn();
    } finally {
      suiteStack.pop();
    }
  };

  const it = (name, fn) => {
    const suite = suiteStack[suiteStack.length - 1];
    suite.tests.push({ name: String(name), fn });
  };

  const beforeAll = (fn) => {
    const suite = suiteStack[suiteStack.length - 1];
    suite.beforeAll.push(fn);
  };

  const afterAll = (fn) => {
    const suite = suiteStack[suiteStack.length - 1];
    suite.afterAll.push(fn);
  };

  const results = [];

  const runHook = async (hook) => {
    const r = hook();
    if (isPromiseLike(r)) {
      await r;
    }
  };

  const runTest = async (fullName, test) => {
    const startedAt = Date.now();
    try {
      const r = test.fn();
      if (isPromiseLike(r)) {
        await r;
      }
      results.push({
        name: fullName,
        status: "passed",
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      results.push({
        name: fullName,
        status: "failed",
        durationMs: Date.now() - startedAt,
        error,
      });
    }
  };

  const runSuite = async (suite, parentNames) => {
    const names =
      suite.name === "<root>" ? parentNames : [...parentNames, suite.name];
    const suitePrefix = names.filter(Boolean).join(" > ");

    for (const hook of suite.beforeAll) {
      await runHook(hook);
    }

    for (const test of suite.tests) {
      const fullName = suitePrefix
        ? `${suitePrefix} :: ${test.name}`
        : test.name;
      await runTest(fullName, test);
    }

    for (const child of suite.suites) {
      await runSuite(child, names);
    }

    for (const hook of suite.afterAll) {
      await runHook(hook);
    }
  };

  const run = async () => {
    results.length = 0;
    await runSuite(root, []);
    return {
      results: [...results],
      summary: {
        total: results.length,
        passed: results.filter((r) => r.status === "passed").length,
        failed: results.filter((r) => r.status === "failed").length,
      },
    };
  };

  return {
    describe,
    it,
    beforeAll,
    afterAll,
    expect,
    run,
  };
}
