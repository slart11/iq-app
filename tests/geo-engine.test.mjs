import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { KOMMUNE_DATA, getKommuneInfo } from '../js/geo-data.js';
import {
  MAX_ATTEMPTS,
  createQuizState,
  getCurrentTarget,
  submitGuess,
  useHint,
  giveUpQuiz,
  getHardestMunicipality,
  shouldSaveToHistory,
} from '../js/geo-engine.js';

const GEOJSON_PATH = new URL('../data/trondelag-kommuner.geojson', import.meta.url);
const GEOJSON = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8'));

function makeSampleMunicipalities() {
  return [
    { id: '5001', name: 'Trondheim', ...KOMMUNE_DATA['5001'] },
    { id: '5046', name: 'Høylandet', ...KOMMUNE_DATA['5046'] },
    { id: '5049', name: 'Flatanger', ...KOMMUNE_DATA['5049'] },
    { id: '5025', name: 'Røros', ...KOMMUNE_DATA['5025'] },
  ];
}

describe('geo-data & GeoJSON integrity', () => {
  it('covers all 38 municipalities in trondelag-kommuner.geojson with valid metadata', () => {
    assert.equal(GEOJSON.type, 'FeatureCollection');
    assert.equal(GEOJSON.features.length, 38);

    const seenIds = new Set();
    for (const feature of GEOJSON.features) {
      const id = String(feature.properties.kommunenummer);
      assert.ok(!seenIds.has(id), `Duplicate kommunenummer in GeoJSON: ${id}`);
      seenIds.add(id);

      const entry = KOMMUNE_DATA[id];
      assert.ok(entry, `Missing KOMMUNE_DATA entry for ${id} (${feature.properties.name})`);
      assert.ok(typeof entry.displayName === 'string' && entry.displayName.trim().length > 0);
      assert.ok(typeof entry.region === 'string' && entry.region.trim().length > 0);
      assert.ok(typeof entry.fact === 'string' && entry.fact.trim().length > 20);
    }

    assert.equal(Object.keys(KOMMUNE_DATA).length, 38);
  });

  it('has accurate facts for Høylandet (Revyfestival) and Flatanger (Hanshelleren)', () => {
    assert.match(KOMMUNE_DATA['5046'].fact, /Revyfestival/i);
    assert.match(KOMMUNE_DATA['5049'].fact, /Hanshelleren/i);
  });

  it('getKommuneInfo returns known data and clean fallback for unknown ids', () => {
    const known = getKommuneInfo('5001');
    assert.equal(known.displayName, 'Trondheim');
    assert.equal(known.region, 'Trondheimsregionen');

    const unknown = getKommuneInfo('9999', 'Testkommune');
    assert.equal(unknown.id, '9999');
    assert.equal(unknown.displayName, 'Testkommune');
    assert.equal(unknown.region, 'Trøndelag');
  });
});

describe('geo-engine state machine', () => {
  it('createQuizState initializes deterministically with injected rng', () => {
    const items = makeSampleMunicipalities();
    const s1 = createQuizState(items, { rng: () => 0.25 });
    const s2 = createQuizState(items, { rng: () => 0.25 });

    assert.deepEqual(s1, s2);
    assert.equal(s1.total, 4);
    assert.equal(s1.currentIndex, 0);
    assert.equal(s1.attemptsLeft, MAX_ATTEMPTS);
    assert.equal(s1.score, 0);
    assert.equal(s1.failed, 0);
    assert.equal(s1.done, false);
    assert.equal(s1.gaveUp, false);
  });

  it('handles empty municipality list as immediately done', () => {
    const state = createQuizState([]);
    assert.equal(state.done, true);
    assert.equal(getCurrentTarget(state), null);
  });

  it('getCurrentTarget returns the active target and null when done', () => {
    const items = makeSampleMunicipalities();
    const state = createQuizState(items, { rng: () => 0.99 }); // identity order
    assert.equal(getCurrentTarget(state).id, items[0].id);

    const finished = giveUpQuiz(state);
    assert.equal(getCurrentTarget(finished), null);
  });

  it('submitGuess handles correct click, wrong click, duplicate wrong click, and 3rd wrong click -> failed', () => {
    const items = makeSampleMunicipalities();
    // rng returning 0.99 keeps order [5001, 5046, 5049, 5025]
    let state = createQuizState(items, { rng: () => 0.99 });
    assert.equal(getCurrentTarget(state).id, '5001');

    // 1. Correct click on 5001
    let res = submitGuess(state, '5001');
    assert.equal(res.outcome, 'correct');
    assert.equal(res.targetId, '5001');
    state = res.state;
    assert.equal(state.score, 1);
    assert.deepEqual(state.solvedIds, ['5001']);
    assert.equal(getCurrentTarget(state).id, '5046');

    // Clicking already solved 5001 is ignored
    res = submitGuess(state, '5001');
    assert.equal(res.outcome, 'ignored');
    assert.equal(res.state.attemptsLeft, MAX_ATTEMPTS);

    // 2. First wrong click on 5046 (clicking 5049)
    res = submitGuess(state, '5049');
    assert.equal(res.outcome, 'wrong');
    assert.equal(res.attemptsLeft, 2);
    state = res.state;
    assert.equal(state.wrongClicksById['5046'], 1);

    // 3. Duplicate wrong click (5049 again) is ignored and does not decrement attemptsLeft
    res = submitGuess(state, '5049');
    assert.equal(res.outcome, 'ignored');
    assert.equal(res.attemptsLeft, 2);
    assert.equal(res.state.wrongClicksById['5046'], 1);

    // 4. Second wrong click (5025)
    res = submitGuess(state, '5025');
    assert.equal(res.outcome, 'wrong');
    assert.equal(res.attemptsLeft, 1);
    state = res.state;
    assert.equal(state.wrongClicksById['5046'], 2);

    // 5. Third wrong click (unknown/other id '5020') -> failed
    res = submitGuess(state, '5020');
    assert.equal(res.outcome, 'failed');
    assert.equal(res.attemptsLeft, 0);
    state = res.state;
    assert.equal(state.failed, 1);
    assert.deepEqual(state.failedIds, ['5046']);
    assert.equal(state.wrongClicksById['5046'], 3);
    assert.equal(state.attemptsLeft, MAX_ATTEMPTS);
    assert.equal(getCurrentTarget(state).id, '5049');
  });

  it('useHint reveals region and fact and marks hintUsedForCurrent', () => {
    const items = makeSampleMunicipalities();
    const state = createQuizState(items, { rng: () => 0.99 });

    const hinted = useHint(state);
    assert.ok(hinted);
    assert.equal(hinted.state.hintUsedForCurrent, true);
    assert.equal(hinted.hint.region, KOMMUNE_DATA['5001'].region);
    assert.equal(hinted.hint.fact, KOMMUNE_DATA['5001'].fact);

    const finished = giveUpQuiz(hinted.state);
    assert.equal(useHint(finished), null);
  });

  it('giveUpQuiz marks remaining as failed WITHOUT polluting wrongClicksById', () => {
    const items = makeSampleMunicipalities();
    let state = createQuizState(items, { rng: () => 0.99 });

    // Solve 1st, make 1 wrong click on 2nd, then give up
    state = submitGuess(state, '5001').state;
    state = submitGuess(state, '5025').state; // wrong click on 5046
    const givenUp = giveUpQuiz(state);

    assert.equal(givenUp.done, true);
    assert.equal(givenUp.gaveUp, true);
    assert.equal(givenUp.score, 1);
    assert.equal(givenUp.failed, 3);
    assert.deepEqual(givenUp.failedIds, ['5046', '5049', '5025']);
    // Only 5046 had an actual wrong click; 5049 and 5025 were unattempted
    assert.deepEqual(givenUp.wrongClicksById, { '5046': 1 });
  });

  it('getHardestMunicipality returns null when zero wrong clicks and highest wrongClicks otherwise', () => {
    const items = makeSampleMunicipalities();
    const fresh = createQuizState(items, { rng: () => 0.99 });

    // Giving up immediately should still yield null hardest municipality
    assert.equal(getHardestMunicipality(giveUpQuiz(fresh)), null);

    // 1 wrong click on 5001, then solve; 2 wrong clicks on 5046, then solve
    let state = submitGuess(fresh, '5046').state; // wrong on 5001
    state = submitGuess(state, '5001').state; // solve 5001
    state = submitGuess(state, '5049').state; // wrong 1 on 5046
    state = submitGuess(state, '5025').state; // wrong 2 on 5046
    state = submitGuess(state, '5046').state; // solve 5046

    const hardest = getHardestMunicipality(state);
    assert.ok(hardest);
    assert.equal(hardest.id, '5046');
    assert.equal(hardest.displayName, 'Høylandet');
    assert.equal(hardest.wrongClicks, 2);
  });

  it('shouldSaveToHistory returns false while active or after giveUp, and true after normal completion', () => {
    const items = makeSampleMunicipalities().slice(0, 2);
    let state = createQuizState(items, { rng: () => 0.99 });

    assert.equal(shouldSaveToHistory(state), false);
    assert.equal(shouldSaveToHistory(giveUpQuiz(state)), false);

    state = submitGuess(state, '5001').state;
    assert.equal(shouldSaveToHistory(state), false);

    state = submitGuess(state, '5046').state;
    assert.equal(state.done, true);
    assert.equal(state.gaveUp, false);
    assert.equal(shouldSaveToHistory(state), true);
  });
});
