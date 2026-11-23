/**
 * Pure state machine for Trøndelag Geography Map Quiz.
 * Zero DOM or Leaflet dependencies — fully unit-testable in Node.js.
 */

export const MAX_ATTEMPTS = 3;

/**
 * Returns a shuffled shallow copy of an array using Fisher-Yates.
 * @template T
 * @param {readonly T[]} items
 * @param {() => number} rng
 * @returns {T[]}
 */
function shuffle(items, rng) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const raw = rng();
    const clamped = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999999) : 0;
    const j = Math.floor(clamped * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Creates an initial quiz state for a list of municipalities.
 * @param {Array<{ id: string, name: string, displayName: string, region: string, fact: string }>} municipalities
 * @param {{ rng?: () => number }} [options]
 */
export function createQuizState(municipalities, { rng = Math.random } = {}) {
  const list = Array.isArray(municipalities)
    ? municipalities.map((m) => ({ ...m }))
    : [];
  const order = shuffle(list, rng);

  return {
    order,
    total: order.length,
    currentIndex: 0,
    attemptsLeft: MAX_ATTEMPTS,
    score: 0,
    failed: 0,
    solvedIds: [],
    failedIds: [],
    wrongThisTargetIds: [],
    wrongClicksById: {},
    hintUsedForCurrent: false,
    gaveUp: false,
    done: order.length === 0
  };
}

/**
 * Returns the active target municipality, or null if the quiz is finished.
 */
export function getCurrentTarget(state) {
  if (!state || state.done || state.currentIndex >= state.order.length) {
    return null;
  }
  return state.order[state.currentIndex];
}

/**
 * Pure transition when the player clicks a municipality on the map.
 * @param {ReturnType<typeof createQuizState>} state
 * @param {string} clickedId
 * @returns {{
 *   state: ReturnType<typeof createQuizState>,
 *   outcome: "ignored" | "correct" | "wrong" | "failed",
 *   clickedId: string,
 *   targetId: string | null,
 *   attemptsLeft: number
 * }}
 */
export function submitGuess(state, clickedId) {
  const target = getCurrentTarget(state);
  if (!target || state.done) {
    return {
      state,
      outcome: "ignored",
      clickedId,
      targetId: null,
      attemptsLeft: state ? state.attemptsLeft : 0
    };
  }

  if (
    state.solvedIds.includes(clickedId) ||
    state.failedIds.includes(clickedId) ||
    state.wrongThisTargetIds.includes(clickedId)
  ) {
    return {
      state,
      outcome: "ignored",
      clickedId,
      targetId: target.id,
      attemptsLeft: state.attemptsLeft
    };
  }

  if (clickedId === target.id) {
    const nextIndex = state.currentIndex + 1;
    const done = nextIndex >= state.order.length;
    const nextState = {
      ...state,
      score: state.score + 1,
      solvedIds: [...state.solvedIds, target.id],
      currentIndex: nextIndex,
      attemptsLeft: MAX_ATTEMPTS,
      wrongThisTargetIds: [],
      hintUsedForCurrent: false,
      done
    };
    return {
      state: nextState,
      outcome: "correct",
      clickedId,
      targetId: target.id,
      attemptsLeft: nextState.attemptsLeft
    };
  }

  const nextAttempts = state.attemptsLeft - 1;
  const nextWrongClicksById = {
    ...state.wrongClicksById,
    [target.id]: (state.wrongClicksById[target.id] || 0) + 1
  };

  if (nextAttempts > 0) {
    const nextState = {
      ...state,
      attemptsLeft: nextAttempts,
      wrongThisTargetIds: [...state.wrongThisTargetIds, clickedId],
      wrongClicksById: nextWrongClicksById
    };
    return {
      state: nextState,
      outcome: "wrong",
      clickedId,
      targetId: target.id,
      attemptsLeft: nextAttempts
    };
  }

  const nextIndex = state.currentIndex + 1;
  const done = nextIndex >= state.order.length;
  const nextState = {
    ...state,
    failed: state.failed + 1,
    failedIds: [...state.failedIds, target.id],
    wrongClicksById: nextWrongClicksById,
    currentIndex: nextIndex,
    attemptsLeft: MAX_ATTEMPTS,
    wrongThisTargetIds: [],
    hintUsedForCurrent: false,
    done
  };
  return {
    state: nextState,
    outcome: "failed",
    clickedId,
    targetId: target.id,
    attemptsLeft: 0
  };
}

/**
 * Reveals the hint (subregion + fact) for the current target municipality.
 * Returns null if the quiz is finished.
 */
export function useHint(state) {
  const target = getCurrentTarget(state);
  if (!target || state.done) {
    return null;
  }
  return {
    state: {
      ...state,
      hintUsedForCurrent: true
    },
    hint: {
      region: target.region,
      fact: target.fact
    }
  };
}

/**
 * Ends the quiz early, marking all remaining unattempted municipalities as failed
 * WITHOUT incrementing wrongClicksById for unattempted municipalities.
 */
export function giveUpQuiz(state) {
  if (!state || state.done) {
    return state;
  }

  const resolvedSet = new Set([...state.solvedIds, ...state.failedIds]);
  const remainingIds = state.order
    .slice(state.currentIndex)
    .map((m) => m.id)
    .filter((id) => !resolvedSet.has(id));

  return {
    ...state,
    failed: state.failed + remainingIds.length,
    failedIds: [...state.failedIds, ...remainingIds],
    wrongThisTargetIds: [],
    currentIndex: state.order.length,
    attemptsLeft: 0,
    hintUsedForCurrent: false,
    gaveUp: true,
    done: true
  };
}

/**
 * Returns the municipality with the highest number of actual wrong clicks (> 0),
 * or null if the player had zero wrong clicks.
 */
export function getHardestMunicipality(state) {
  if (!state || !state.wrongClicksById) {
    return null;
  }

  let bestId = null;
  let bestCount = 0;

  for (const [id, count] of Object.entries(state.wrongClicksById)) {
    if (count > bestCount) {
      bestId = id;
      bestCount = count;
    }
  }

  if (!bestId || bestCount <= 0) {
    return null;
  }

  const municipality = state.order.find((m) => m.id === bestId);
  if (!municipality) {
    return null;
  }

  return {
    ...municipality,
    wrongClicks: bestCount
  };
}

/**
 * Returns true only if the quiz finished naturally without giving up.
 */
export function shouldSaveToHistory(state) {
  return Boolean(state && state.done && !state.gaveUp);
}
