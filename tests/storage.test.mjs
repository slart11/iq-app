import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEYS,
  loadJson,
  saveJson,
  sanitizeGeoHistory,
  sanitizeMathAttempts
} from "../js/storage.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function createThrowingStorage(errorMessage = "SecurityError: storage disabled") {
  return {
    getItem() {
      throw new Error(errorMessage);
    },
    setItem() {
      throw new Error(errorMessage);
    }
  };
}

test("STORAGE_KEYS exposes expected frozen keys", () => {
  assert.equal(Object.isFrozen(STORAGE_KEYS), true);
  assert.equal(STORAGE_KEYS.MATH_ATTEMPTS, "iq_app_math_attempts_v1");
  assert.equal(STORAGE_KEYS.MATH_SETTINGS, "iq_app_math_settings_v1");
  assert.equal(STORAGE_KEYS.GEO_HISTORY, "trondelag-kartquiz-history");
});

test("loadJson returns parsed value when stored JSON is valid", () => {
  const storage = createMemoryStorage({
    testKey: JSON.stringify({ level: 3, streak: 7 })
  });
  const result = loadJson("testKey", { level: 1 }, (v) => v && typeof v.level === "number", storage);
  assert.deepEqual(result, { level: 3, streak: 7 });
});

test("loadJson returns fallback on missing key or empty string", () => {
  const storage = createMemoryStorage({ emptyKey: "" });
  const fallback = [{ score: 0 }];

  assert.equal(loadJson("missingKey", fallback, null, storage), fallback);
  assert.equal(loadJson("emptyKey", fallback, null, storage), fallback);
});

test("loadJson returns fallback on invalid JSON", () => {
  const storage = createMemoryStorage({ broken: "{not-valid-json" });
  const fallback = { ok: false };

  assert.equal(loadJson("broken", fallback, null, storage), fallback);
});

test("loadJson returns fallback when validator fails", () => {
  const storage = createMemoryStorage({
    wrongType: JSON.stringify({ notAnArray: true })
  });
  const fallback = [];

  assert.equal(loadJson("wrongType", fallback, Array.isArray, storage), fallback);
});

test("loadJson returns fallback when storage is null or throws (private browsing)", () => {
  const fallback = { safe: true };
  const throwingStorage = createThrowingStorage("SecurityError");

  assert.equal(loadJson("anyKey", fallback, null, null), fallback);
  assert.equal(loadJson("anyKey", fallback, null, throwingStorage), fallback);
});

test("saveJson persists serialized JSON and returns true", () => {
  const storage = createMemoryStorage();
  const payload = [{ score: 9, total: 10 }];

  const saved = saveJson("attempts", payload, storage);
  assert.equal(saved, true);
  assert.equal(storage.getItem("attempts"), JSON.stringify(payload));
});

test("saveJson returns false on quota error, throwing storage, or null storage", () => {
  const quotaStorage = createThrowingStorage("QuotaExceededError");

  assert.equal(saveJson("key", { a: 1 }, quotaStorage), false);
  assert.equal(saveJson("key", { a: 1 }, null), false);
  assert.equal(saveJson("key", { a: 1 }, {}), false);
});

test("sanitizeGeoHistory filters corrupted entries, clamps negatives, rejects score > total, and preserves valid legacy entries", () => {
  assert.deepEqual(sanitizeGeoHistory(null), []);
  assert.deepEqual(sanitizeGeoHistory("not-an-array"), []);

  const input = [
    null,
    undefined,
    "corrupted",
    42,
    { score: 35, total: 38, date: "2026-01-15T12:00:00.000Z" },
    { score: -5, total: 38, date: "2026-01-16T12:00:00.000Z" },
    { score: 40, total: 38, date: "2026-01-17T12:00:00.000Z" }, // invalid: score > total
    { score: "12.9", total: "38", date: "15.01.2026" }, // legacy string numbers & date format
    { score: "NaN", total: 0, date: "" } // falls back to 0/1 and ISO date
  ];

  const sanitized = sanitizeGeoHistory(input);
  assert.equal(sanitized.length, 4);

  assert.deepEqual(sanitized[0], {
    score: 35,
    total: 38,
    date: "2026-01-15T12:00:00.000Z"
  });
  assert.deepEqual(sanitized[1], {
    score: 0,
    total: 38,
    date: "2026-01-16T12:00:00.000Z"
  });
  assert.deepEqual(sanitized[2], {
    score: 12,
    total: 38,
    date: "15.01.2026"
  });
  assert.equal(sanitized[3].score, 0);
  assert.equal(sanitized[3].total, 1);
  assert.equal(typeof sanitized[3].date, "string");
  assert.ok(sanitized[3].date.length > 0);
});

test("sanitizeMathAttempts filters corrupted entries, preserves valid entries, clamps negatives, and rejects score > total", () => {
  assert.deepEqual(sanitizeMathAttempts(undefined), []);
  assert.deepEqual(sanitizeMathAttempts({}), []);

  const input = [
    null,
    "bad",
    {
      timestamp: 1730000000000,
      score: 10,
      total: 10,
      avgTimeMs: 2450.6,
      penguinsSaved: 10
    },
    {
      timestamp: 1730000005000,
      score: 12,
      total: 10, // invalid: score > total
      avgTimeMs: 1800,
      penguinsSaved: 10
    },
    {
      timestamp: 1730000010000,
      score: -3,
      total: 10,
      avgTimeMs: -250,
      penguinsSaved: -2
    }
  ];

  const sanitized = sanitizeMathAttempts(input);
  assert.equal(sanitized.length, 2);

  assert.deepEqual(sanitized[0], {
    timestamp: 1730000000000,
    score: 10,
    total: 10,
    avgTimeMs: 2451,
    penguinsSaved: 10
  });

  assert.deepEqual(sanitized[1], {
    timestamp: 1730000010000,
    score: 0,
    total: 10,
    avgTimeMs: 0,
    penguinsSaved: 0
  });
});
