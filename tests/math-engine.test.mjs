import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  OPERATIONS,
  DIFFICULTIES,
  getActiveOperations,
  getTimeLimitMs,
  generateProblem,
  parseAnswer,
  shouldAutoSubmit,
  gradeAnswer,
  buildPracticeQueue,
  calculateRoundStats,
  getIsoWeekKey,
  computeWeeklySummaries,
  getPersonalBests,
} from '../js/math-engine.js';

function createSeqRng(values) {
  let idx = 0;
  return () => {
    const val = values[idx % values.length];
    idx += 1;
    return val;
  };
}

describe('math-engine', () => {
  describe('getActiveOperations', () => {
    it('filters out null, undefined, and invalid difficulties while keeping canonical order', () => {
      const active = getActiveOperations({
        div: 'triple',
        add: 'single',
        sub: null,
        mul: 'invalid',
        extra: 'single',
      });
      assert.deepEqual(active, ['add', 'div']);
    });

    it('returns an empty array for null, undefined, or non-object configs', () => {
      assert.deepEqual(getActiveOperations(null), []);
      assert.deepEqual(getActiveOperations(undefined), []);
      assert.deepEqual(getActiveOperations({ add: null, sub: null, mul: null, div: null }), []);
    });
  });

  describe('getTimeLimitMs', () => {
    it('scales monotonically across single < double < triple for every operation', () => {
      for (const op of OPERATIONS) {
        const single = getTimeLimitMs(op, 'single');
        const double = getTimeLimitMs(op, 'double');
        const triple = getTimeLimitMs(op, 'triple');
        assert.ok(single < double, `${op}: single (${single}) should be < double (${double})`);
        assert.ok(double < triple, `${op}: double (${double}) should be < triple (${triple})`);
      }
    });

    it('falls back to 12000ms for unknown operation or difficulty', () => {
      assert.equal(getTimeLimitMs('unknown', 'single'), 12000);
      assert.equal(getTimeLimitMs('add', 'impossible'), 12000);
    });
  });

  describe('generateProblem', () => {
    it('returns null when no operations are active', () => {
      assert.equal(generateProblem({ add: null, sub: null, mul: null, div: null }), null);
      assert.equal(generateProblem({}), null);
    });

    it('is deterministic when an injectable rng is provided', () => {
      const config = { add: 'double', sub: 'single', mul: 'single', div: 'single' };
      const p1 = generateProblem(config, { rng: createSeqRng([0.1, 0.4, 0.7]) });
      const p2 = generateProblem(config, { rng: createSeqRng([0.1, 0.4, 0.7]) });
      assert.deepEqual(p1, p2);
    });

    it('generates exact integer division with divisor >= 2 across all difficulties', () => {
      for (const diff of DIFFICULTIES) {
        let seed = 0.03;
        const rng = () => {
          seed = (seed + 0.17) % 1;
          return seed;
        };
        for (let i = 0; i < 30; i += 1) {
          const p = generateProblem({ div: diff }, { rng });
          assert.ok(p);
          assert.equal(p.opKey, 'div');
          assert.equal(p.diff, diff);
          assert.ok(p.n2 >= 2, `divisor ${p.n2} must be >= 2`);
          assert.equal(p.n1 % p.n2, 0, `${p.n1} must be divisible by ${p.n2}`);
          assert.equal(p.n1 / p.n2, p.ans);
          assert.ok(Number.isInteger(p.ans) && p.ans >= 2);
        }
      }
    });

    it('generates non-negative subtraction with n1 > n2 across all difficulties', () => {
      for (const diff of DIFFICULTIES) {
        let seed = 0.05;
        const rng = () => {
          seed = (seed + 0.23) % 1;
          return seed;
        };
        for (let i = 0; i < 30; i += 1) {
          const p = generateProblem({ sub: diff }, { rng });
          assert.ok(p);
          assert.equal(p.opKey, 'sub');
          assert.ok(p.n1 > p.n2, `expected ${p.n1} > ${p.n2}`);
          assert.ok(p.ans >= 1, `expected positive answer, got ${p.ans}`);
          assert.equal(p.n1 - p.n2, p.ans);
        }
      }
    });

    it('generates valid addition and multiplication problems', () => {
      for (const diff of DIFFICULTIES) {
        const addP = generateProblem({ add: diff }, { rng: createSeqRng([0, 0.5, 0.9]) });
        assert.equal(addP.n1 + addP.n2, addP.ans);

        const mulP = generateProblem({ mul: diff }, { rng: createSeqRng([0, 0.5, 0.9]) });
        assert.equal(mulP.n1 * mulP.n2, mulP.ans);
      }
    });

    it('avoids consecutive duplicates when previousKey is passed', () => {
      const config = { add: 'single' };
      const first = generateProblem(config, { rng: createSeqRng([0, 0, 0]) });
      assert.equal(first.key, 'add:2:2');

      // First draw produces add:2:2 again, second draw produces a different problem
      const rng = createSeqRng([0, 0, 0, 0, 0.9, 0.9]);
      const second = generateProblem(config, { rng, previousKey: first.key });
      assert.notEqual(second.key, first.key);
    });
  });

  describe('parseAnswer', () => {
    it('rejects empty, whitespace, null, undefined, and non-digit strings', () => {
      assert.deepEqual(parseAnswer(''), { valid: false, value: null, empty: true });
      assert.deepEqual(parseAnswer('   '), { valid: false, value: null, empty: true });
      assert.deepEqual(parseAnswer(null), { valid: false, value: null, empty: true });
      assert.deepEqual(parseAnswer(undefined), { valid: false, value: null, empty: true });

      assert.deepEqual(parseAnswer('-5'), { valid: false, value: null, empty: false });
      assert.deepEqual(parseAnswer('3.14'), { valid: false, value: null, empty: false });
      assert.deepEqual(parseAnswer('12a'), { valid: false, value: null, empty: false });
      assert.deepEqual(parseAnswer('abc'), { valid: false, value: null, empty: false });
    });

    it('parses valid non-negative integers including zero and trimmed strings', () => {
      assert.deepEqual(parseAnswer('0'), { valid: true, value: 0, empty: false });
      assert.deepEqual(parseAnswer('42'), { valid: true, value: 42, empty: false });
      assert.deepEqual(parseAnswer('  105  '), { valid: true, value: 105, empty: false });
    });
  });

  describe('shouldAutoSubmit', () => {
    it('rejects leading zeros like "08" for 8', () => {
      assert.equal(shouldAutoSubmit('08', 8), false);
      assert.equal(shouldAutoSubmit('00', 0), false);
      assert.equal(shouldAutoSubmit('042', 42), false);
    });

    it('accepts exact canonical matches', () => {
      assert.equal(shouldAutoSubmit('8', 8), true);
      assert.equal(shouldAutoSubmit(' 8 ', 8), true);
      assert.equal(shouldAutoSubmit('0', 0), true);
      assert.equal(shouldAutoSubmit('144', 144), true);
    });

    it('returns false for null, undefined, or non-matching values', () => {
      assert.equal(shouldAutoSubmit(null, 8), false);
      assert.equal(shouldAutoSubmit('8', null), false);
      assert.equal(shouldAutoSubmit('7', 8), false);
    });
  });

  describe('gradeAnswer', () => {
    const sampleProblem = {
      n1: 6,
      n2: 7,
      op: '×',
      opKey: 'mul',
      diff: 'single',
      ans: 42,
      eq: '6 × 7',
      key: 'mul:6:7',
    };

    it('grades a correct answer cleanly', () => {
      const result = gradeAnswer({ problem: sampleProblem, rawInput: '42', elapsedMs: 1234.6 });
      assert.equal(result.correct, true);
      assert.equal(result.isTimeout, false);
      assert.equal(result.user, 42);
      assert.equal(result.ans, 42);
      assert.equal(result.elapsedMs, 1235);
    });

    it('grades a wrong or invalid answer cleanly', () => {
      const wrongNum = gradeAnswer({ problem: sampleProblem, rawInput: '41', elapsedMs: 2500 });
      assert.equal(wrongNum.correct, false);
      assert.equal(wrongNum.isTimeout, false);
      assert.equal(wrongNum.user, 41);

      const invalidInput = gradeAnswer({ problem: sampleProblem, rawInput: 'abc', elapsedMs: -50 });
      assert.equal(invalidInput.correct, false);
      assert.equal(invalidInput.user, null);
      assert.equal(invalidInput.elapsedMs, 0);
    });

    it('grades a timeout as incorrect with user = null even if rawInput matches', () => {
      const timeoutResult = gradeAnswer({
        problem: sampleProblem,
        rawInput: '42',
        isTimeout: true,
        elapsedMs: 10000,
      });
      assert.equal(timeoutResult.correct, false);
      assert.equal(timeoutResult.isTimeout, true);
      assert.equal(timeoutResult.user, null);
    });
  });

  describe('buildPracticeQueue', () => {
    it('deduplicates missed and timed-out problems and skips correct ones', () => {
      const p1 = { key: 'add:3:4', eq: '3 + 4', ans: 7 };
      const p2 = { key: 'mul:6:7', eq: '6 × 7', ans: 42 };
      const p3 = { key: 'sub:9:5', eq: '9 − 5', ans: 4 };

      const history = [
        { correct: true, problem: p3 },
        { correct: false, problem: p1 },
        { correct: false, isTimeout: true, problem: p2 },
        { correct: false, problem: p1 }, // duplicate key
      ];

      const queue = buildPracticeQueue(history);
      assert.deepEqual(queue, [p1, p2]);
    });

    it('returns an empty array for non-array input', () => {
      assert.deepEqual(buildPracticeQueue(null), []);
    });
  });

  describe('calculateRoundStats', () => {
    it('calculates score, accuracy, avgTimeMs, mistakes, and per-operation breakdown', () => {
      const history = [
        { opKey: 'add', correct: true, elapsedMs: 1000 },
        { opKey: 'add', correct: false, elapsedMs: 3000 },
        { opKey: 'mul', correct: true, elapsedMs: 2000 },
        { opKey: 'mul', correct: true, elapsedMs: 2000 },
      ];

      const stats = calculateRoundStats(history);
      assert.equal(stats.score, 3);
      assert.equal(stats.total, 4);
      assert.equal(stats.accuracy, 75);
      assert.equal(stats.avgTimeMs, 2000);
      assert.equal(stats.mistakes, 1);
      assert.deepEqual(stats.byOp, {
        add: { correct: 1, total: 2, accuracy: 50 },
        mul: { correct: 2, total: 2, accuracy: 100 },
      });
    });

    it('handles empty history safely', () => {
      const stats = calculateRoundStats([]);
      assert.deepEqual(stats, {
        score: 0,
        total: 0,
        accuracy: 0,
        avgTimeMs: 0,
        mistakes: 0,
        byOp: {},
      });
    });
  });

  describe('getIsoWeekKey', () => {
    it('computes UTC-safe ISO-8601 week keys including year boundaries', () => {
      // 2026-01-01 is a Thursday -> ISO week 2026-W01
      assert.equal(getIsoWeekKey(Date.UTC(2026, 0, 1)), '2026-W01');
      // 2025-12-29 is a Monday in 2026-W01
      assert.equal(getIsoWeekKey(Date.UTC(2025, 11, 29)), '2026-W01');
      // Invalid date returns 'Ukjent'
      assert.equal(getIsoWeekKey('not-a-date'), 'Ukjent');
    });
  });

  describe('computeWeeklySummaries', () => {
    it('returns empty array for empty or invalid input', () => {
      assert.deepEqual(computeWeeklySummaries([]), []);
      assert.deepEqual(computeWeeklySummaries(null), []);
    });

    it('safely handles total === 0 without NaN or Infinity', () => {
      const summaries = computeWeeklySummaries([
        { timestamp: Date.UTC(2026, 0, 5), score: 0, total: 0 },
      ]);
      assert.equal(summaries.length, 1);
      assert.equal(summaries[0].accuracy, 0);
      assert.equal(summaries[0].avgScore, 0);
      assert.equal(summaries[0].diff, null);
    });

    it('groups attempts by week ascending and computes week-over-week diffs', () => {
      const w2Date = Date.UTC(2026, 0, 8); // 2026-W02
      const w1DateA = Date.UTC(2026, 0, 1); // 2026-W01
      const w1DateB = Date.UTC(2026, 0, 2); // 2026-W01

      const summaries = computeWeeklySummaries([
        { timestamp: w2Date, score: 9, total: 10 },
        { timestamp: w1DateA, score: 6, total: 10 },
        { timestamp: w1DateB, score: 8, total: 10 },
      ]);

      assert.equal(summaries.length, 2);
      assert.deepEqual(summaries[0], {
        weekKey: '2026-W01',
        label: 'Uke 1',
        count: 2,
        avgScore: 7,
        accuracy: 70,
        diff: null,
      });
      assert.deepEqual(summaries[1], {
        weekKey: '2026-W02',
        label: 'Uke 2',
        count: 1,
        avgScore: 9,
        accuracy: 90,
        diff: 2,
      });
    });
  });

  describe('getPersonalBests', () => {
    it('returns zeroed defaults for empty attempts', () => {
      assert.deepEqual(getPersonalBests([]), {
        totalGames: 0,
        bestScore: 0,
        bestTotal: 0,
        fastestPerfectMs: null,
        recentStreak: 0,
      });
    });

    it('computes best score, fastest perfect round, and recent >=80% streak', () => {
      const attempts = [
        { timestamp: 1000, score: 7, total: 10, avgTimeMs: 1200 }, // breaks streak
        { timestamp: 2000, score: 8, total: 10, avgTimeMs: 1800 }, // >= 80%
        { timestamp: 3000, score: 10, total: 10, avgTimeMs: 1500 }, // perfect
        { timestamp: 4000, score: 10, total: 10, avgTimeMs: 1120.4 }, // faster perfect
      ];

      const bests = getPersonalBests(attempts);
      assert.deepEqual(bests, {
        totalGames: 4,
        bestScore: 10,
        bestTotal: 10,
        fastestPerfectMs: 1120,
        recentStreak: 3,
      });
    });
  });
});
