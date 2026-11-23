/**
 * Safe, schema-validated localStorage wrapper.
 * Supports dependency injection of a custom Storage object for Node.js unit tests.
 */

export const STORAGE_KEYS = Object.freeze({
  MATH_ATTEMPTS: "iq_app_math_attempts_v1",
  MATH_SETTINGS: "iq_app_math_settings_v1",
  GEO_HISTORY: "trondelag-kartquiz-history"
});

export function getDefaultStorage() {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    // Private browsing or blocked storage
  }
  return null;
}

/**
 * Safely loads and validates JSON from storage.
 * @template T
 * @param {string} key
 * @param {T} fallback
 * @param {(value: unknown) => value is T} [validator]
 * @param {Storage | null} [storage]
 * @returns {T}
 */
export function loadJson(key, fallback, validator = null, storage = getDefaultStorage()) {
  if (!storage || typeof storage.getItem !== "function") return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined || raw === "") return fallback;
    const parsed = JSON.parse(raw);
    if (typeof validator === "function" && !validator(parsed)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

/**
 * Safely serializes and writes JSON to storage.
 * Returns true on success, false if storage is unavailable or quota exceeded.
 */
export function saveJson(key, value, storage = getDefaultStorage()) {
  if (!storage || typeof storage.setItem !== "function") return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes an array of geo quiz history entries (backward compatible with existing saved data).
 */
export function sanitizeGeoHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      score: Number.isFinite(Number(entry.score)) ? Math.max(0, Math.floor(Number(entry.score))) : 0,
      total: Number.isFinite(Number(entry.total)) ? Math.max(1, Math.floor(Number(entry.total))) : 38,
      date: typeof entry.date === "string" && entry.date ? entry.date : new Date().toISOString()
    }))
    .filter((entry) => entry.score <= entry.total);
}

/**
 * Sanitizes an array of math session attempts.
 */
export function sanitizeMathAttempts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => ({
      timestamp: Number.isFinite(Number(entry.timestamp)) ? Number(entry.timestamp) : Date.now(),
      score: Number.isFinite(Number(entry.score)) ? Math.max(0, Math.floor(Number(entry.score))) : 0,
      total: Number.isFinite(Number(entry.total)) ? Math.max(1, Math.floor(Number(entry.total))) : 10,
      avgTimeMs: Number.isFinite(Number(entry.avgTimeMs)) ? Math.max(0, Math.round(Number(entry.avgTimeMs))) : 0,
      penguinsSaved: Number.isFinite(Number(entry.penguinsSaved)) ? Math.max(0, Math.floor(Number(entry.penguinsSaved))) : 0
    }))
    .filter((entry) => entry.score <= entry.total);
}
