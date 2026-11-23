/**
 * Pure math engine for IQ-app (zero DOM/window dependencies).
 * Runnable in both browser ES modules and Node.js unit tests.
 */

export const OPERATIONS = Object.freeze(['add', 'sub', 'mul', 'div']);

export const OP_SYMBOLS = Object.freeze({
  add: '+',
  sub: '−',
  mul: '×',
  div: '÷',
});

export const OP_LABELS = Object.freeze({
  add: 'Addisjon',
  sub: 'Subtraksjon',
  mul: 'Multiplikasjon',
  div: 'Divisjon',
});

export const DIFFICULTIES = Object.freeze(['single', 'double', 'triple']);

export const DIFFICULTY_LABELS = Object.freeze({
  single: 'Lett',
  double: 'Middels',
  triple: 'Vanskelig',
});

export const DEFAULT_OP_CONFIGS = Object.freeze({
  add: 'single',
  sub: 'single',
  mul: 'single',
  div: null,
});

export const ROUND_LENGTH = 10;

const VALID_DIFFICULTY_SET = new Set(DIFFICULTIES);

const TIME_LIMITS_MS = Object.freeze({
  add: Object.freeze({ single: 10000, double: 14000, triple: 20000 }),
  sub: Object.freeze({ single: 10000, double: 14000, triple: 20000 }),
  mul: Object.freeze({ single: 10000, double: 16000, triple: 24000 }),
  div: Object.freeze({ single: 12000, double: 16000, triple: 22000 }),
});

/**
 * Returns an array of active operation keys whose configured difficulty is valid.
 * @param {Record<string, string | null | undefined> | null | undefined} opConfigs
 * @returns {string[]}
 */
export function getActiveOperations(opConfigs) {
  if (!opConfigs || typeof opConfigs !== 'object') {
    return [];
  }
  return OPERATIONS.filter((op) => VALID_DIFFICULTY_SET.has(opConfigs[op]));
}

/**
 * Returns the calibrated time limit in milliseconds for a given operation and difficulty.
 * @param {string} opKey
 * @param {string} diff
 * @returns {number}
 */
export function getTimeLimitMs(opKey, diff) {
  const opTable = TIME_LIMITS_MS[opKey];
  if (opTable && typeof opTable[diff] === 'number') {
    return opTable[diff];
  }
  return 12000;
}

/**
 * Inclusive random integer helper using an injectable RNG.
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng
 * @returns {number}
 */
function randInt(min, max, rng) {
  const r = Math.min(0.999999999, Math.max(0, Number(rng())));
  return Math.floor(r * (max - min + 1)) + min;
}

/**
 * Generates a single arithmetic problem for a specific opKey & difficulty.
 * @param {string} opKey
 * @param {string} diff
 * @param {() => number} rng
 */
function createRawProblem(opKey, diff, rng) {
  let n1 = 0;
  let n2 = 0;
  let ans = 0;

  if (opKey === 'add') {
    if (diff === 'single') {
      n1 = randInt(2, 9, rng);
      n2 = randInt(2, 9, rng);
    } else if (diff === 'double') {
      n1 = randInt(12, 89, rng);
      n2 = randInt(11, 89, rng);
    } else {
      n1 = randInt(105, 499, rng);
      n2 = randInt(105, 499, rng);
    }
    ans = n1 + n2;
  } else if (opKey === 'sub') {
    if (diff === 'single') {
      n1 = randInt(3, 9, rng);
      n2 = randInt(2, n1 - 1, rng);
    } else if (diff === 'double') {
      n1 = randInt(15, 99, rng);
      n2 = randInt(10, Math.min(89, n1 - 1), rng);
    } else {
      n1 = randInt(120, 899, rng);
      n2 = randInt(105, Math.min(799, n1 - 1), rng);
    }
    ans = n1 - n2;
  } else if (opKey === 'mul') {
    if (diff === 'single') {
      n1 = randInt(2, 9, rng);
      n2 = randInt(2, 9, rng);
    } else if (diff === 'double') {
      n1 = randInt(11, 29, rng);
      n2 = randInt(2, 9, rng);
    } else {
      n1 = randInt(12, 49, rng);
      n2 = randInt(11, 29, rng);
    }
    ans = n1 * n2;
  } else if (opKey === 'div') {
    if (diff === 'single') {
      ans = randInt(2, 9, rng);
      n2 = randInt(2, 9, rng);
    } else if (diff === 'double') {
      ans = randInt(10, 29, rng);
      n2 = randInt(2, 9, rng);
    } else {
      ans = randInt(12, 49, rng);
      n2 = randInt(3, 12, rng);
    }
    n1 = ans * n2;
  }

  const symbol = OP_SYMBOLS[opKey];
  return {
    n1,
    n2,
    op: symbol,
    opKey,
    diff,
    ans,
    eq: `${n1} ${symbol} ${n2}`,
    key: `${opKey}:${n1}:${n2}`,
  };
}

/**
 * Generates a calibrated arithmetic problem avoiding consecutive duplicates.
 * Returns null if no operations are active.
 * @param {Record<string, string | null | undefined>} opConfigs
 * @param {{ rng?: () => number, previousKey?: string | null }} [options]
 */
export function generateProblem(opConfigs, { rng = Math.random, previousKey = null } = {}) {
  const activeOps = getActiveOperations(opConfigs);
  if (activeOps.length === 0) {
    return null;
  }

  let candidate = null;
  const maxAttempts = 12;

  for (let i = 0; i < maxAttempts; i += 1) {
    const opKey = activeOps[randInt(0, activeOps.length - 1, rng)];
    const diff = opConfigs[opKey];
    candidate = createRawProblem(opKey, diff, rng);
    if (!previousKey || candidate.key !== previousKey) {
      return candidate;
    }
  }

  return candidate;
}

/**
 * Parses a raw user answer string strictly as a non-negative integer.
 * @param {unknown} rawInput
 * @returns {{ valid: boolean, value: number | null, empty: boolean }}
 */
export function parseAnswer(rawInput) {
  const trimmed = rawInput == null ? '' : String(rawInput).trim();
  if (trimmed === '') {
    return { valid: false, value: null, empty: true };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { valid: false, value: null, empty: false };
  }
  return {
    valid: true,
    value: Number.parseInt(trimmed, 10),
    empty: false,
  };
}

/**
 * Returns true ONLY when the trimmed input matches the exact canonical string
 * of the expected answer (preventing leading-zero surprises like "08" for 8).
 * @param {unknown} rawInput
 * @param {number} expectedAns
 * @returns {boolean}
 */
export function shouldAutoSubmit(rawInput, expectedAns) {
  if (rawInput == null || expectedAns == null) {
    return false;
  }
  return String(rawInput).trim() === String(expectedAns);
}

/**
 * Grades a user response (or timeout) against a problem.
 * @param {{ problem: object, rawInput?: unknown, isTimeout?: boolean, elapsedMs?: number }} params
 */
export function gradeAnswer({ problem, rawInput = '', isTimeout = false, elapsedMs = 0 }) {
  const parsed = parseAnswer(rawInput);
  const timedOut = Boolean(isTimeout);
  const numericUser = timedOut ? null : (parsed.valid ? parsed.value : null);
  const correct = !timedOut && parsed.valid && parsed.value === problem.ans;
  const safeElapsed = Number.isFinite(Number(elapsedMs)) ? Math.max(0, Math.round(Number(elapsedMs))) : 0;

  return {
    eq: problem.eq,
    opKey: problem.opKey,
    diff: problem.diff,
    ans: problem.ans,
    user: numericUser,
    rawInput: String(rawInput ?? ''),
    correct,
    isTimeout: timedOut,
    elapsedMs: safeElapsed,
    problem,
  };
}

/**
 * Extracts unique missed or timed-out problems from a round's history
 * so the player can drill their mistakes.
 * @param {Array<object>} history
 * @returns {Array<object>}
 */
export function buildPracticeQueue(history) {
  if (!Array.isArray(history)) {
    return [];
  }
  const seen = new Set();
  const queue = [];

  for (const entry of history) {
    if (!entry || entry.correct || !entry.problem) {
      continue;
    }
    const key = entry.problem.key ?? entry.eq;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    queue.push(entry.problem);
  }

  return queue;
}

/**
 * Calculates aggregate statistics for a completed round.
 * @param {Array<object>} history
 */
export function calculateRoundStats(history) {
  const items = Array.isArray(history) ? history.filter((item) => item && typeof item === 'object') : [];
  const total = items.length;
  let score = 0;
  let elapsedSum = 0;
  const byOp = {};

  for (const item of items) {
    if (item.correct) {
      score += 1;
    }
    elapsedSum += Number.isFinite(Number(item.elapsedMs)) ? Math.max(0, Number(item.elapsedMs)) : 0;

    const opKey = item.opKey || item.problem?.opKey;
    if (opKey) {
      if (!byOp[opKey]) {
        byOp[opKey] = { correct: 0, total: 0, accuracy: 0 };
      }
      byOp[opKey].total += 1;
      if (item.correct) {
        byOp[opKey].correct += 1;
      }
    }
  }

  for (const opKey of Object.keys(byOp)) {
    const entry = byOp[opKey];
    entry.accuracy = entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0;
  }

  const mistakes = total - score;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const avgTimeMs = total > 0 ? Math.round(elapsedSum / total) : 0;

  return {
    score,
    total,
    accuracy,
    avgTimeMs,
    mistakes,
    byOp,
  };
}

/**
 * Computes a UTC-safe ISO-8601 week key such as "2026-W48".
 * @param {number | string | Date} timestamp
 * @returns {string}
 */
export function getIsoWeekKey(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Ukjent';
  }
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  const isoYear = utcDate.getUTCFullYear();
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Groups attempts by ISO week (ascending) and computes weekly summaries.
 * Safely guards total === 0 and computes week-over-week diff from unrounded averages.
 * @param {Array<{ timestamp: number, score: number, total: number }>} attempts
 */
export function computeWeeklySummaries(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return [];
  }

  const buckets = new Map();

  for (const attempt of attempts) {
    if (!attempt || typeof attempt !== 'object') {
      continue;
    }
    const weekKey = getIsoWeekKey(attempt.timestamp);
    if (weekKey === 'Ukjent') {
      continue;
    }

    if (!buckets.has(weekKey)) {
      buckets.set(weekKey, {
        count: 0,
        scoreSum: 0,
        totalSum: 0,
      });
    }
    const bucket = buckets.get(weekKey);
    const score = Number.isFinite(Number(attempt.score)) ? Math.max(0, Number(attempt.score)) : 0;
    const total = Number.isFinite(Number(attempt.total)) ? Math.max(0, Number(attempt.total)) : 0;
    bucket.count += 1;
    bucket.scoreSum += score;
    bucket.totalSum += total;
  }

  const sortedKeys = Array.from(buckets.keys()).sort((a, b) => a.localeCompare(b));
  const summaries = [];
  let prevRawAvg = null;

  for (const weekKey of sortedKeys) {
    const bucket = buckets.get(weekKey);
    const rawAvgScore = bucket.count > 0 ? bucket.scoreSum / bucket.count : 0;
    const avgScore = Number(rawAvgScore.toFixed(1));
    const accuracy = bucket.totalSum > 0 ? Math.round((bucket.scoreSum / bucket.totalSum) * 100) : 0;
    const diff = prevRawAvg === null ? null : Number((rawAvgScore - prevRawAvg).toFixed(1));
    prevRawAvg = rawAvgScore;

    const match = /-W(\d+)$/.exec(weekKey);
    const label = match ? `Uke ${Number.parseInt(match[1], 10)}` : weekKey;

    summaries.push({
      weekKey,
      label,
      count: bucket.count,
      avgScore,
      accuracy,
      diff,
    });
  }

  return summaries;
}

/**
 * Computes personal best metrics across all recorded attempts.
 * @param {Array<{ timestamp?: number, score?: number, total?: number, avgTimeMs?: number }>} attempts
 */
export function getPersonalBests(attempts) {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return {
      totalGames: 0,
      bestScore: 0,
      bestTotal: 0,
      fastestPerfectMs: null,
      recentStreak: 0,
    };
  }

  const valid = attempts.filter((a) => a && typeof a === 'object');
  if (valid.length === 0) {
    return {
      totalGames: 0,
      bestScore: 0,
      bestTotal: 0,
      fastestPerfectMs: null,
      recentStreak: 0,
    };
  }

  let bestScore = 0;
  let bestTotal = 0;
  let bestRatio = -1;
  let fastestPerfectMs = null;

  for (const attempt of valid) {
    const score = Number.isFinite(Number(attempt.score)) ? Math.max(0, Number(attempt.score)) : 0;
    const total = Number.isFinite(Number(attempt.total)) ? Math.max(0, Number(attempt.total)) : 0;
    const ratio = total > 0 ? score / total : 0;

    if (score > bestScore || (score === bestScore && ratio > bestRatio)) {
      bestScore = score;
      bestTotal = total;
      bestRatio = ratio;
    }

    const avgTimeMs = Number(attempt.avgTimeMs);
    if (total > 0 && score === total && Number.isFinite(avgTimeMs) && avgTimeMs > 0) {
      if (fastestPerfectMs === null || avgTimeMs < fastestPerfectMs) {
        fastestPerfectMs = Math.round(avgTimeMs);
      }
    }
  }

  // Count consecutive recent rounds (newest first) with >= 80% accuracy
  const sortedNewestFirst = [...valid].sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
  let recentStreak = 0;
  for (const attempt of sortedNewestFirst) {
    const score = Number.isFinite(Number(attempt.score)) ? Math.max(0, Number(attempt.score)) : 0;
    const total = Number.isFinite(Number(attempt.total)) ? Math.max(0, Number(attempt.total)) : 0;
    if (total > 0 && score / total >= 0.8) {
      recentStreak += 1;
    } else {
      break;
    }
  }

  return {
    totalGames: valid.length,
    bestScore,
    bestTotal,
    fastestPerfectMs,
    recentStreak,
  };
}
