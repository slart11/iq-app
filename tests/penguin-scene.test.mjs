import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPenguinState,
  dropOnePenguin,
  celebratePenguins,
} from '../js/penguin-scene.js';

describe('penguin-scene pure state helpers', () => {
  describe('createPenguinState', () => {
    it('initializes total, remaining, eaten = 0, and patrol bear state', () => {
      const state = createPenguinState(10);
      assert.deepEqual(state, {
        total: 10,
        remaining: 10,
        eaten: 0,
        fallingIndex: null,
        bearState: 'patrol',
        bearSlot: 0,
      });
    });

    it('defaults to 10 penguins and clamps invalid or < 1 values safely', () => {
      assert.equal(createPenguinState().total, 10);
      assert.equal(createPenguinState(NaN).total, 10);
      assert.equal(createPenguinState(0).total, 1);
      assert.equal(createPenguinState(-5).total, 1);
      assert.equal(createPenguinState(6.9).total, 6);
    });
  });

  describe('dropOnePenguin', () => {
    it('decrements remaining by 1, increments eaten by 1, and sets bearState to eating', () => {
      const initial = createPenguinState(5);
      const next = dropOnePenguin(initial);

      assert.equal(next.remaining, 4);
      assert.equal(next.eaten, 1);
      assert.equal(next.bearState, 'eating');
      assert.equal(next.fallingIndex, 4);
      assert.equal(next.bearSlot, 4);

      // Original state is not mutated
      assert.equal(initial.remaining, 5);
      assert.equal(initial.eaten, 0);
    });

    it('safely clamps at 0 remaining and never goes negative', () => {
      let state = createPenguinState(2);
      state = dropOnePenguin(state);
      assert.equal(state.remaining, 1);
      assert.equal(state.eaten, 1);

      state = dropOnePenguin(state);
      assert.equal(state.remaining, 0);
      assert.equal(state.eaten, 2);

      // Dropping again when 0 remain must not go negative or increment eaten
      const clamped = dropOnePenguin(state);
      assert.equal(clamped.remaining, 0);
      assert.equal(clamped.eaten, 2);
      assert.equal(clamped.total, 2);
    });
  });

  describe('celebratePenguins', () => {
    it('sets bearState to grumble without losing any penguins', () => {
      const state = dropOnePenguin(createPenguinState(4));
      const celebrated = celebratePenguins(state);

      assert.equal(celebrated.bearState, 'grumble');
      assert.equal(celebrated.remaining, state.remaining);
      assert.equal(celebrated.eaten, state.eaten);
      assert.equal(celebrated.total, state.total);

      // Original state is not mutated
      assert.equal(state.bearState, 'eating');
    });
  });
});
