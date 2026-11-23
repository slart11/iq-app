/**
 * Main UI controller for Matte · IQ-app.
 * Zero-dependency ES module, 100% Norwegian bokmål, safe DOM construction only.
 */

import {
  STORAGE_KEYS,
  loadJson,
  saveJson,
  sanitizeMathAttempts,
} from './storage.js';

import {
  OPERATIONS,
  OP_SYMBOLS,
  OP_LABELS,
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  DEFAULT_OP_CONFIGS,
  ROUND_LENGTH,
  getActiveOperations,
  getTimeLimitMs,
  generateProblem,
  parseAnswer,
  shouldAutoSubmit,
  gradeAnswer,
  buildPracticeQueue,
  calculateRoundStats,
  computeWeeklySummaries,
  getPersonalBests,
} from './math-engine.js';

import { PenguinArena } from './penguin-scene.js';

const MAX_INPUT_LENGTH = 6;
const CORRECT_DELAY_MS = 550;
const WRONG_DELAY_MS = 1350;
const CRITICAL_TIME_MS = 3000;

/* ==========================================================================
   WebAudio Sound Engine
   ========================================================================== */
const soundEngine = {
  ctx: null,
  muted: false,

  init() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  },

  vibrate(pattern) {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Ignore unsupported environments
      }
    }
  },

  playCorrect() {
    this.vibrate([14, 24, 14]);
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;
      const notes = [523.25, 659.25]; // C5 -> E5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        gain.gain.setValueAtTime(0.08, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.23);
      });
    } catch {
      // Audio playback blocked
    }
  },

  _noiseBuffer: null,

  _getNoiseBuffer() {
    if (!this.ctx) return null;
    if (this._noiseBuffer && this._noiseBuffer.sampleRate === this.ctx.sampleRate) {
      return this._noiseBuffer;
    }
    const length = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this._noiseBuffer = buffer;
    return buffer;
  },

  /**
   * Wooden trapdoor latch & double-leaf clack ("klakk!") when a hatch snaps open.
   */
  playTrapdoor() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;

      // 1. Metallic iron latch click (sharp high-mid ping)
      const latchOsc = this.ctx.createOscillator();
      const latchGain = this.ctx.createGain();
      latchOsc.type = 'square';
      latchOsc.frequency.setValueAtTime(1180, now);
      latchOsc.frequency.exponentialRampToValueAtTime(420, now + 0.025);
      latchGain.gain.setValueAtTime(0.055, now);
      latchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
      latchOsc.connect(latchGain);
      latchGain.connect(this.ctx.destination);
      latchOsc.start(now);
      latchOsc.stop(now + 0.035);

      // 2. Hollow wooden trapdoor "klakk!" (bandpass noise burst + woody resonance)
      const noiseBuf = this._getNoiseBuffer();
      if (noiseBuf) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(520, now + 0.015);
        filter.Q.setValueAtTime(2.6, now + 0.015);
        const nGain = this.ctx.createGain();
        nGain.gain.setValueAtTime(0.24, now + 0.015);
        nGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
        noise.connect(filter);
        filter.connect(nGain);
        nGain.connect(this.ctx.destination);
        noise.start(now + 0.015);
        noise.stop(now + 0.11);
      }

      const woodOsc = this.ctx.createOscillator();
      const woodGain = this.ctx.createGain();
      woodOsc.type = 'triangle';
      woodOsc.frequency.setValueAtTime(260, now + 0.015);
      woodOsc.frequency.exponentialRampToValueAtTime(95, now + 0.085);
      woodGain.gain.setValueAtTime(0.16, now + 0.015);
      woodGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);
      woodOsc.connect(woodGain);
      woodGain.connect(this.ctx.destination);
      woodOsc.start(now + 0.015);
      woodOsc.stop(now + 0.1);
    } catch {
      // Audio playback blocked
    }
  },

  /**
   * Comical descending slide-whistle as the penguin drops down into the ice cavern.
   */
  playPenguinFall() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;
      const slideOsc = this.ctx.createOscillator();
      const slideGain = this.ctx.createGain();
      slideOsc.type = 'sine';
      slideOsc.frequency.setValueAtTime(860, now);
      slideOsc.frequency.exponentialRampToValueAtTime(720, now + 0.06);
      slideOsc.frequency.exponentialRampToValueAtTime(210, now + 0.48);

      // Gentle vibrato for playful cartoon whistle feel
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(14, now);
      lfoGain.gain.setValueAtTime(14, now);
      lfo.connect(lfoGain);
      lfoGain.connect(slideOsc.frequency);

      slideGain.gain.setValueAtTime(0.001, now);
      slideGain.gain.linearRampToValueAtTime(0.1, now + 0.03);
      slideGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      slideOsc.connect(slideGain);
      slideGain.connect(this.ctx.destination);
      lfo.start(now);
      slideOsc.start(now);
      lfo.stop(now + 0.52);
      slideOsc.stop(now + 0.52);
    } catch {
      // Audio playback blocked
    }
  },

  /**
   * Soft snowy poof when the penguin lands on the cavern snow floor.
   */
  playSnowLand() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;
      const noiseBuf = this._getNoiseBuffer();
      if (noiseBuf) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuf;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(680, now);
        filter.frequency.exponentialRampToValueAtTime(160, now + 0.14);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        noise.stop(now + 0.16);
      }

      const thumpOsc = this.ctx.createOscillator();
      const thumpGain = this.ctx.createGain();
      thumpOsc.type = 'sine';
      thumpOsc.frequency.setValueAtTime(125, now);
      thumpOsc.frequency.exponentialRampToValueAtTime(48, now + 0.1);
      thumpGain.gain.setValueAtTime(0.14, now);
      thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      thumpOsc.connect(thumpGain);
      thumpGain.connect(this.ctx.destination);
      thumpOsc.start(now);
      thumpOsc.stop(now + 0.12);
    } catch {
      // Audio playback blocked
    }
  },

  /**
   * Playful polar bear double-bite "knask-knask!" when chomping the penguin.
   */
  playBearChomp() {
    this.vibrate([25, 40, 20]);
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;
      const noiseBuf = this._getNoiseBuffer();

      // Two rhythmic crunch bites ("knask-knask!")
      const bites = [
        { offset: 0, pitch: 155, crunchFreq: 1350, vol: 0.24 },
        { offset: 0.19, pitch: 130, crunchFreq: 1050, vol: 0.18 },
      ];

      for (const bite of bites) {
        const t = now + bite.offset;

        // Low jaw snap thud
        const jawOsc = this.ctx.createOscillator();
        const jawGain = this.ctx.createGain();
        jawOsc.type = 'sawtooth';
        jawOsc.frequency.setValueAtTime(bite.pitch, t);
        jawOsc.frequency.exponentialRampToValueAtTime(46, t + 0.11);
        const jawFilter = this.ctx.createBiquadFilter();
        jawFilter.type = 'lowpass';
        jawFilter.frequency.setValueAtTime(360, t);
        jawGain.gain.setValueAtTime(bite.vol, t);
        jawGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        jawOsc.connect(jawFilter);
        jawFilter.connect(jawGain);
        jawGain.connect(this.ctx.destination);
        jawOsc.start(t);
        jawOsc.stop(t + 0.13);

        // Crisp "knask" crunch noise burst
        if (noiseBuf) {
          const crunch = this.ctx.createBufferSource();
          crunch.buffer = noiseBuf;
          const bp = this.ctx.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.setValueAtTime(bite.crunchFreq, t);
          bp.Q.setValueAtTime(1.6, t);
          const cGain = this.ctx.createGain();
          cGain.gain.setValueAtTime(bite.vol * 0.9, t);
          cGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
          crunch.connect(bp);
          bp.connect(cGain);
          cGain.connect(this.ctx.destination);
          crunch.start(t);
          crunch.stop(t + 0.1);
        }
      }
    } catch {
      // Audio playback blocked
    }
  },

  playWrong() {
    // Immediate tactile feedback; the synchronized trapdoor clack, penguin fall whistle,
    // snow landing poof, and bear chomp crunch are triggered directly by PenguinArena events!
    this.vibrate([30, 35]);
    if (this.muted) return;
    this.init();
  },

  playComplete() {
    this.vibrate([20, 35, 20, 35, 30]);
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const now = this.ctx.currentTime + 0.005;
      const fanfare = [
        { f: 523.25, t: 0, d: 0.14 },
        { f: 659.25, t: 0.11, d: 0.14 },
        { f: 783.99, t: 0.22, d: 0.14 },
        { f: 1046.5, t: 0.33, d: 0.42 },
      ];
      for (const note of fanfare) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, now + note.t);
        gain.gain.setValueAtTime(0.12, now + note.t);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + note.t);
        osc.stop(now + note.t + note.d + 0.02);
      }
    } catch {
      // Audio playback blocked
    }
  },
};

/* ==========================================================================
   Settings & Persistence Helpers
   ========================================================================== */
const VALID_DIFF_SET = new Set(DIFFICULTIES);

function sanitizeSettings(raw) {
  const opConfigs = { ...DEFAULT_OP_CONFIGS };
  if (raw && typeof raw === 'object' && raw.opConfigs && typeof raw.opConfigs === 'object') {
    for (const op of OPERATIONS) {
      const val = raw.opConfigs[op];
      if (val === null || VALID_DIFF_SET.has(val)) {
        opConfigs[op] = val;
      }
    }
  }
  return {
    opConfigs,
    muted: Boolean(raw && typeof raw === 'object' && raw.muted),
  };
}

function loadSettings() {
  const raw = loadJson(STORAGE_KEYS.MATH_SETTINGS, null);
  return sanitizeSettings(raw);
}

function saveSettings() {
  saveJson(STORAGE_KEYS.MATH_SETTINGS, {
    opConfigs: state.opConfigs,
    muted: state.muted,
  });
}

function loadAttempts() {
  const raw = loadJson(STORAGE_KEYS.MATH_ATTEMPTS, []);
  return sanitizeMathAttempts(raw);
}

function saveAttempts(attempts) {
  saveJson(STORAGE_KEYS.MATH_ATTEMPTS, attempts);
}

/* ==========================================================================
   Application State
   ========================================================================== */
const initialSettings = loadSettings();

const state = {
  view: 'setup', // 'setup' | 'game' | 'results'
  opConfigs: initialSettings.opConfigs,
  muted: initialSettings.muted,
  attempts: loadAttempts(),
  chartMode: 'attempts', // 'attempts' | 'weekly'

  // Active round state
  sessionId: 0,
  roundTotal: ROUND_LENGTH,
  currentIdx: 0,
  streak: 0,
  isPracticeRound: false,
  practiceQueue: [],
  lastMistakeQueue: [],
  currentProblem: null,
  previousProblemKey: null,
  history: [],
  isProcessing: false,
  isPaused: false,

  // Timing state (drift-free performance.now())
  questionStartMs: 0,
  questionTimeLimitMs: 12000,
  timerDeadlineMs: 0,
  remainingMsWhenPaused: 0,
  pauseStartedMs: 0,
  pausedTotalMs: 0,
  timerRafId: null,
  feedbackTimerId: null,
};

soundEngine.muted = state.muted;

/* ==========================================================================
   DOM References
   ========================================================================== */
const dom = {
  audioToggleBtn: document.getElementById('audio-toggle-btn'),
  audioIcon: document.getElementById('audio-icon'),
  audioLabel: document.getElementById('audio-label'),

  setupView: document.getElementById('math-setup'),
  opConfigGrid: document.getElementById('op-config-grid'),
  setupError: document.getElementById('setup-error'),
  startBtn: document.getElementById('start-btn'),
  setupBests: document.getElementById('setup-bests'),
  setupHistoryContent: document.getElementById('setup-history-content'),

  gameView: document.getElementById('math-game'),
  questionCounter: document.getElementById('question-counter'),
  streakPill: document.getElementById('streak-pill'),
  practiceBadge: document.getElementById('practice-badge'),
  pauseBtn: document.getElementById('pause-btn'),
  quitBtn: document.getElementById('quit-btn'),
  penguinArenaEl: document.getElementById('penguin-arena'),
  timerWrap: document.getElementById('timer-wrap'),
  timerProgressbar: document.getElementById('timer-progressbar'),
  timerFill: document.getElementById('timer-fill'),
  playArea: document.getElementById('play-area'),
  equationDisplay: document.getElementById('equation-display'),
  answerInput: document.getElementById('answer-input'),
  feedbackBanner: document.getElementById('feedback-banner'),
  numBackspace: document.getElementById('num-backspace'),
  numSubmit: document.getElementById('num-submit'),
  pauseOverlay: document.getElementById('pause-overlay'),
  resumeBtn: document.getElementById('resume-btn'),
  pauseQuitBtn: document.getElementById('pause-quit-btn'),

  resultsView: document.getElementById('math-results'),
  penguinSummary: document.getElementById('penguin-summary'),
  resultsStats: document.getElementById('results-stats'),
  playAgainBtn: document.getElementById('play-again-btn'),
  practiceMistakesBtn: document.getElementById('practice-mistakes-btn'),
  backSetupBtn: document.getElementById('back-setup-btn'),
  opBreakdownSection: document.getElementById('op-breakdown-section'),
  opBreakdownList: document.getElementById('op-breakdown-list'),
  resultsList: document.getElementById('results-list'),
  resultsChart: document.getElementById('results-chart'),
};

let arena = null;

function ensureArena(totalPenguins) {
  if (!dom.penguinArenaEl) return null;
  if (!arena) {
    arena = new PenguinArena(dom.penguinArenaEl, {
      totalPenguins,
      onTrapdoorOpen: () => soundEngine.playTrapdoor(),
      onPenguinFall: () => soundEngine.playPenguinFall(),
      onPenguinLand: () => soundEngine.playSnowLand(),
      onBearChomp: () => soundEngine.playBearChomp(),
    });
  } else {
    arena.reset(totalPenguins);
  }
  return arena;
}

/* ==========================================================================
   Safe DOM Helpers
   ========================================================================== */
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function formatSeconds(ms) {
  const sec = Math.max(0, Number(ms) || 0) / 1000;
  return `${sec.toFixed(1).replace('.', ',')} s`;
}

function formatShortDate(timestamp) {
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

/* ==========================================================================
   Audio Toggle UI
   ========================================================================== */
function updateAudioUI() {
  if (!dom.audioToggleBtn) return;
  dom.audioIcon.textContent = state.muted ? '🔇' : '🔊';
  dom.audioLabel.textContent = state.muted ? 'Lyd av' : 'Lyd på';
  dom.audioToggleBtn.setAttribute('aria-pressed', String(state.muted));
  dom.audioToggleBtn.setAttribute('aria-label', state.muted ? 'Slå på lyd' : 'Slå av lyd');
}

function toggleAudio() {
  state.muted = !state.muted;
  soundEngine.muted = state.muted;
  saveSettings();
  updateAudioUI();
  if (!state.muted) {
    soundEngine.init();
  }
}

/* ==========================================================================
   View Switching & Timer Cleanup
   ========================================================================== */
function cancelActiveTimers() {
  if (state.timerRafId !== null) {
    cancelAnimationFrame(state.timerRafId);
    state.timerRafId = null;
  }
  if (state.feedbackTimerId !== null) {
    clearTimeout(state.feedbackTimerId);
    state.feedbackTimerId = null;
  }
}

function setView(nextView) {
  cancelActiveTimers();
  state.view = nextView;
  state.isProcessing = false;
  state.isPaused = false;
  updatePauseUI();

  dom.setupView.hidden = nextView !== 'setup';
  dom.gameView.hidden = nextView !== 'game';
  dom.resultsView.hidden = nextView !== 'results';

  if (nextView === 'setup') {
    renderSetupStats();
  }
}

/* ==========================================================================
   Setup View Rendering
   ========================================================================== */
const DIFFICULTY_PIPS = {
  single: '+',
  double: '++',
  triple: '+++',
};

function buildOpConfigGrid() {
  dom.opConfigGrid.replaceChildren();

  for (const op of OPERATIONS) {
    const row = el('div', 'op-row');

    const labelWrap = el('div', 'op-label-wrap');
    const symbolBadge = el('span', 'op-symbol-badge', OP_SYMBOLS[op]);
    symbolBadge.setAttribute('aria-hidden', 'true');
    const opName = el('span', 'op-name', OP_LABELS[op]);
    labelWrap.append(symbolBadge, opName);

    const diffGroup = el('div', 'diff-group');
    diffGroup.setAttribute('role', 'group');
    diffGroup.setAttribute('aria-label', OP_LABELS[op]);

    for (const diff of DIFFICULTIES) {
      const pipLabel = DIFFICULTY_PIPS[diff] || DIFFICULTY_LABELS[diff];
      const btn = el('button', `diff-btn diff-${diff}`, pipLabel);
      btn.type = 'button';
      btn.dataset.op = op;
      btn.dataset.diff = diff;
      btn.setAttribute('aria-label', `${OP_LABELS[op]} – ${DIFFICULTY_LABELS[diff]} (${pipLabel})`);
      btn.setAttribute('aria-pressed', 'false');
      btn.title = `${OP_LABELS[op]} – ${DIFFICULTY_LABELS[diff]}`;
      btn.addEventListener('click', () => {
        toggleOpDifficulty(op, diff);
      });
      diffGroup.appendChild(btn);
    }

    row.append(labelWrap, diffGroup);
    dom.opConfigGrid.appendChild(row);
  }

  updateOpConfigUI();
}

function toggleOpDifficulty(op, diff) {
  soundEngine.vibrate(10);
  if (state.opConfigs[op] === diff) {
    state.opConfigs[op] = null;
  } else {
    state.opConfigs[op] = diff;
  }
  saveSettings();
  updateOpConfigUI();
}

function updateOpConfigUI() {
  const buttons = dom.opConfigGrid.querySelectorAll('.diff-btn');
  for (const btn of buttons) {
    const { op, diff } = btn.dataset;
    const isActive = state.opConfigs[op] === diff;
    btn.setAttribute('aria-pressed', String(isActive));
  }

  const activeOps = getActiveOperations(state.opConfigs);
  const hasActive = activeOps.length > 0;
  dom.startBtn.disabled = !hasActive;
  dom.setupError.hidden = hasActive;
}

function renderSetupStats() {
  const bests = getPersonalBests(state.attempts);

  // Personal bests strip
  dom.setupBests.replaceChildren();
  if (bests.totalGames > 0) {
    dom.setupBests.hidden = false;

    const chips = [
      { label: 'Økter spilt', value: String(bests.totalGames) },
      { label: 'Beste poengsum', value: `${bests.bestScore} / ${bests.bestTotal}` },
    ];
    if (bests.fastestPerfectMs !== null) {
      chips.push({ label: 'Raskeste full pott', value: formatSeconds(bests.fastestPerfectMs) });
    }
    if (bests.recentStreak > 0) {
      chips.push({ label: 'Rekke (≥ 80 %)', value: `${bests.recentStreak} på rad` });
    }

    for (const chip of chips) {
      const card = el('div', 'best-chip');
      card.append(
        el('span', 'best-chip-label', chip.label),
        el('span', 'best-chip-value', chip.value),
      );
      dom.setupBests.appendChild(card);
    }
  } else {
    dom.setupBests.hidden = true;
  }

  // History / chart
  renderHistoryChart(dom.setupHistoryContent, true);
}

/* ==========================================================================
   Shared Progress Chart & Weekly Summary Builder (Safe DOM APIs only)
   ========================================================================== */
function renderHistoryChart(container, showEmptyEncourage = false) {
  container.replaceChildren();

  if (state.attempts.length === 0) {
    const empty = el('div', 'empty-state');
    const title = el('strong', null, 'Ingen økter ennå');
    const copy = el(
      'span',
      null,
      showEmptyEncourage
        ? 'Spill din første runde for å følge fremgangen din og redde pingviner!'
        : 'Fullfør en vanlig økt for å se utviklingen din over tid.',
    );
    empty.append(title, copy);
    container.appendChild(empty);
    return;
  }

  const weekly = computeWeeklySummaries(state.attempts);
  const recent = state.attempts.slice(-5);

  const card = el('div', 'chart-card');

  // Header + mode tabs
  const header = el('div', 'chart-header');
  const latest = state.attempts[state.attempts.length - 1];
  const latestWeek = weekly[weekly.length - 1];
  const summaryText =
    state.chartMode === 'weekly' && latestWeek
      ? `Siste uke: ${String(latestWeek.avgScore).replace('.', ',')} / 10 i snitt (${latestWeek.accuracy} %)`
      : `Siste økt: ${latest.score} / ${latest.total} (${latest.penguinsSaved} pingviner reddet)`;
  header.appendChild(el('span', 'chart-summary-text', summaryText));

  const tabs = el('div', 'chart-mode-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', 'Visningsmodus for graf');

  const btnAttempts = el('button', 'chart-tab', 'Siste 5');
  btnAttempts.type = 'button';
  btnAttempts.setAttribute('aria-pressed', String(state.chartMode === 'attempts'));
  btnAttempts.addEventListener('click', () => {
    state.chartMode = 'attempts';
    renderHistoryChart(container, showEmptyEncourage);
  });

  const btnWeekly = el('button', 'chart-tab', 'Ukentlig');
  btnWeekly.type = 'button';
  btnWeekly.setAttribute('aria-pressed', String(state.chartMode === 'weekly'));
  btnWeekly.addEventListener('click', () => {
    state.chartMode = 'weekly';
    renderHistoryChart(container, showEmptyEncourage);
  });

  tabs.append(btnAttempts, btnWeekly);
  header.appendChild(tabs);
  card.appendChild(header);

  // Build chart data points
  const points =
    state.chartMode === 'weekly'
      ? weekly.slice(-6).map((w) => ({
          label: w.label,
          value: w.avgScore,
          max: 10,
          displayValue: String(w.avgScore).replace('.', ','),
          pct: Math.min(100, Math.max(4, Math.round((w.avgScore / 10) * 100))),
        }))
      : recent.map((a, idx) => {
          const runNum = state.attempts.length - recent.length + idx + 1;
          const total = a.total || 10;
          const ratio = total > 0 ? a.score / total : 0;
          return {
            label: formatShortDate(a.timestamp) || `#${runNum}`,
            value: a.score,
            max: total,
            displayValue: `${a.score}/${total}`,
            pct: Math.min(100, Math.max(4, Math.round(ratio * 100))),
          };
        });

  const barChart = el('div', 'bar-chart');
  const barLabels = el('div', 'bar-labels');

  for (const pt of points) {
    const col = el('div', 'bar-col');
    if (pt.pct >= 100) {
      const crown = document.createElement('img');
      crown.src = './assets/crown-10-10.png';
      crown.alt = '10/10 krone';
      crown.className = 'score-crown-mini';
      col.appendChild(crown);
    }
    const valEl = el('span', 'bar-value', pt.displayValue);
    const track = el('div', 'bar-track');

    let fillClass = 'bar-fill-high';
    if (pt.pct >= 100) fillClass = 'bar-fill-perfect';
    else if (pt.pct < 50) fillClass = 'bar-fill-low';
    else if (pt.pct < 75) fillClass = 'bar-fill-mid';

    const fill = el('div', `bar-fill ${fillClass}`);
    fill.style.height = `${pt.pct}%`;

    track.appendChild(fill);
    col.append(valEl, track);
    barChart.appendChild(col);

    barLabels.appendChild(el('span', 'bar-label', pt.label));
  }

  card.append(barChart, barLabels);

  // Weekly breakdown rows when in weekly mode or when multiple weeks exist
  if (weekly.length > 0 && state.chartMode === 'weekly') {
    const list = el('div', 'weekly-list');
    for (const w of [...weekly].reverse().slice(0, 4)) {
      const row = el('div', 'weekly-row');
      const main = el('div', 'weekly-row-main');
      main.append(
        el('span', 'weekly-title', w.label),
        el(
          'span',
          'weekly-meta',
          `${w.count} ${w.count === 1 ? 'økt' : 'økter'} · Snitt ${String(w.avgScore).replace('.', ',')}/10 (${w.accuracy} %)`,
        ),
      );
      row.appendChild(main);

      if (w.diff !== null) {
        const sign = w.diff > 0 ? '+' : '';
        const diffClass =
          w.diff > 0 ? 'weekly-diff-up' : w.diff < 0 ? 'weekly-diff-down' : 'weekly-diff-flat';
        row.appendChild(
          el('span', `weekly-diff ${diffClass}`, `${sign}${String(w.diff).replace('.', ',')}`),
        );
      }
      list.appendChild(row);
    }
    card.appendChild(list);
  }

  container.appendChild(card);
}

/* ==========================================================================
   Game Lifecycle
   ========================================================================== */
function startRound({ practiceQueue = null } = {}) {
  const isPractice = Array.isArray(practiceQueue) && practiceQueue.length > 0;
  if (!isPractice && getActiveOperations(state.opConfigs).length === 0) {
    updateOpConfigUI();
    return;
  }

  soundEngine.init();
  cancelActiveTimers();

  state.sessionId += 1;
  state.isPracticeRound = isPractice;
  state.practiceQueue = isPractice ? [...practiceQueue] : [];
  state.roundTotal = isPractice ? practiceQueue.length : ROUND_LENGTH;
  state.currentIdx = 0;
  state.streak = 0;
  state.history = [];
  state.currentProblem = null;
  state.previousProblemKey = null;
  state.isProcessing = false;
  state.isPaused = false;

  setView('game');
  dom.practiceBadge.hidden = !isPractice;
  dom.timerWrap.hidden = false;

  ensureArena(10); // Always start with all 10 penguins aligned on the 10 bridge hatches
  updateHud();
  loadNextQuestion();
}

function quitToSetup() {
  state.sessionId += 1;
  setView('setup');
}

function updateHud() {
  const displayIdx = Math.min(state.currentIdx + 1, state.roundTotal);
  dom.questionCounter.textContent = `Oppgave ${displayIdx} / ${state.roundTotal}`;

  if (state.streak >= 2) {
    dom.streakPill.hidden = false;
    dom.streakPill.textContent = `🔥 ${state.streak} på rad`;
  } else {
    dom.streakPill.hidden = true;
  }
}

function clearFeedbackUI() {
  dom.answerInput.value = '';
  dom.answerInput.classList.remove('is-correct', 'is-wrong', 'iq-shake');
  dom.feedbackBanner.textContent = '';
  dom.feedbackBanner.classList.remove('is-correct', 'is-wrong');
}

function loadNextQuestion() {
  if (state.currentIdx >= state.roundTotal) {
    finishRound();
    return;
  }

  let problem = null;
  if (state.isPracticeRound) {
    problem = state.practiceQueue[state.currentIdx] || null;
  } else {
    problem = generateProblem(state.opConfigs, {
      previousKey: state.previousProblemKey,
    });
  }

  if (!problem) {
    quitToSetup();
    return;
  }

  state.currentProblem = problem;
  state.previousProblemKey = problem.key || null;
  state.isProcessing = false;

  clearFeedbackUI();
  updateHud();
  dom.equationDisplay.textContent = `${problem.eq} =`;

  // Start drift-free timer
  const now = performance.now();
  state.questionStartMs = now;
  state.pausedTotalMs = 0;
  state.pauseStartedMs = 0;
  state.questionTimeLimitMs = getTimeLimitMs(problem.opKey, problem.diff);
  state.timerDeadlineMs = now + state.questionTimeLimitMs;

  updateTimerVisual(state.questionTimeLimitMs, state.questionTimeLimitMs);
  startTimerLoop(state.sessionId);
}

/* ==========================================================================
   Drift-Free Timer & Pause
   ========================================================================== */
function updateTimerVisual(remainingMs, totalMs) {
  const ratio = totalMs > 0 ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const pct = Math.round(ratio * 100);
  dom.timerFill.style.width = `${ratio * 100}%`;
  dom.timerProgressbar.setAttribute('aria-valuenow', String(pct));

  dom.timerFill.classList.toggle('is-critical', remainingMs <= CRITICAL_TIME_MS);
  dom.timerFill.classList.toggle(
    'is-warning',
    remainingMs > CRITICAL_TIME_MS && ratio <= 0.5,
  );
}

function startTimerLoop(activeSessionId) {
  if (state.timerRafId !== null) {
    cancelAnimationFrame(state.timerRafId);
    state.timerRafId = null;
  }

  const tick = () => {
    if (
      state.view !== 'game' ||
      state.sessionId !== activeSessionId ||
      state.isProcessing ||
      state.isPaused
    ) {
      state.timerRafId = null;
      return;
    }

    const remainingMs = state.timerDeadlineMs - performance.now();
    updateTimerVisual(Math.max(0, remainingMs), state.questionTimeLimitMs);

    if (remainingMs <= 0) {
      state.timerRafId = null;
      handleSubmission({ isTimeout: true });
      return;
    }

    state.timerRafId = requestAnimationFrame(tick);
  };

  state.timerRafId = requestAnimationFrame(tick);
}

function updatePauseUI() {
  if (!dom.pauseBtn) return;
  dom.pauseBtn.textContent = state.isPaused ? '▶' : '⏸';
  dom.pauseBtn.setAttribute('aria-pressed', String(state.isPaused));
  dom.pauseBtn.setAttribute('aria-label', state.isPaused ? 'Fortsett' : 'Pause');
  dom.pauseBtn.title = state.isPaused ? 'Fortsett (P)' : 'Pause (P)';

  if (dom.playArea) {
    dom.playArea.classList.toggle('is-paused', state.isPaused);
  }
  if (dom.pauseOverlay) {
    dom.pauseOverlay.hidden = !state.isPaused;
  }
}

function togglePause(forcePaused) {
  if (state.view !== 'game' || state.isProcessing) return;

  const nextPaused = typeof forcePaused === 'boolean' ? forcePaused : !state.isPaused;
  if (nextPaused === state.isPaused) return;

  const now = performance.now();
  state.isPaused = nextPaused;

  if (state.isPaused) {
    if (state.timerRafId !== null) {
      cancelAnimationFrame(state.timerRafId);
      state.timerRafId = null;
    }
    state.pauseStartedMs = now;
    state.remainingMsWhenPaused = Math.max(0, state.timerDeadlineMs - now);
    updatePauseUI();
    dom.resumeBtn.focus();
  } else {
    if (state.pauseStartedMs > 0) {
      state.pausedTotalMs += now - state.pauseStartedMs;
      state.pauseStartedMs = 0;
    }
    state.timerDeadlineMs = now + state.remainingMsWhenPaused;
    updatePauseUI();
    startTimerLoop(state.sessionId);
  }
}

/* ==========================================================================
   Answer Input & Grading
   ========================================================================== */
function addDigit(digit) {
  if (state.view !== 'game' || state.isProcessing || state.isPaused || !state.currentProblem) {
    return;
  }
  if (!/^\d$/.test(digit)) return;
  if (dom.answerInput.value.length >= MAX_INPUT_LENGTH) return;

  soundEngine.vibrate(10);
  dom.answerInput.value += digit;

  if (shouldAutoSubmit(dom.answerInput.value, state.currentProblem.ans)) {
    handleSubmission({ isTimeout: false });
  }
}

function backspace() {
  if (state.view !== 'game' || state.isProcessing || state.isPaused || !state.currentProblem) {
    return;
  }
  if (dom.answerInput.value.length === 0) return;
  soundEngine.vibrate(8);
  dom.answerInput.value = dom.answerInput.value.slice(0, -1);
}

function submitAnswer() {
  if (state.view !== 'game' || state.isProcessing || state.isPaused || !state.currentProblem) {
    return;
  }
  const parsed = parseAnswer(dom.answerInput.value);
  if (parsed.empty) {
    // Empty submit is silently ignored, never penalized
    return;
  }
  handleSubmission({ isTimeout: false });
}

function handleSubmission({ isTimeout = false }) {
  if (state.isProcessing || !state.currentProblem) return;
  state.isProcessing = true;

  if (state.timerRafId !== null) {
    cancelAnimationFrame(state.timerRafId);
    state.timerRafId = null;
  }

  const activeSessionId = state.sessionId;
  const problem = state.currentProblem;
  const rawInput = dom.answerInput.value.trim();
  const elapsedMs = Math.max(0, Math.round(performance.now() - state.questionStartMs - state.pausedTotalMs));

  const graded = gradeAnswer({
    problem,
    rawInput,
    isTimeout,
    elapsedMs,
  });

  state.history.push(graded);

  if (graded.correct) {
    state.streak += 1;
    soundEngine.playCorrect();
    if (arena) arena.onCorrectAnswer();

    dom.answerInput.classList.add('is-correct');
    dom.feedbackBanner.classList.add('is-correct');
    dom.feedbackBanner.textContent = 'Riktig! Pingvinene jubler!';
  } else {
    state.streak = 0;
    soundEngine.playWrong();
    if (arena) arena.onWrongAnswer();

    dom.answerInput.classList.add('is-wrong', 'iq-shake');
    dom.feedbackBanner.classList.add('is-wrong');
    if (graded.isTimeout) {
      dom.feedbackBanner.textContent = `Tiden gikk ut – riktig svar er ${problem.ans}. En pingvin falt ned til isbjørnen!`;
    } else {
      dom.feedbackBanner.textContent = `Feil – riktig svar er ${problem.ans} (du svarte ${rawInput}). En pingvin falt ned til isbjørnen!`;
    }
  }

  updateHud();

  const delayMs = graded.correct ? CORRECT_DELAY_MS : WRONG_DELAY_MS;
  state.feedbackTimerId = setTimeout(() => {
    state.feedbackTimerId = null;
    if (state.sessionId !== activeSessionId || state.view !== 'game') {
      return;
    }
    state.currentIdx += 1;
    loadNextQuestion();
  }, delayMs);
}

/* ==========================================================================
   Results View Rendering
   ========================================================================== */
function finishRound() {
  cancelActiveTimers();
  soundEngine.playComplete();

  const stats = calculateRoundStats(state.history);
  const arenaState = arena
    ? arena.getState()
    : { total: stats.total, remaining: stats.score, eaten: stats.mistakes };

  // Persist standard rounds to localStorage
  if (!state.isPracticeRound && stats.total > 0) {
    state.attempts.push({
      timestamp: Date.now(),
      score: stats.score,
      total: stats.total,
      avgTimeMs: stats.avgTimeMs,
      penguinsSaved: arenaState.remaining,
    });
    saveAttempts(state.attempts);
  }

  state.lastMistakeQueue = buildPracticeQueue(state.history);

  setView('results');

  // Penguin Rescue Summary
  dom.penguinSummary.classList.remove('is-perfect');
  if (arenaState.eaten === 0) {
    dom.penguinSummary.classList.add('is-perfect');
    dom.penguinSummary.textContent = `Perfekt! Alle ${arenaState.total} pingviner er trygge!`;
  } else if (arenaState.remaining === 0) {
    dom.penguinSummary.textContent = `Uff! Isbjørnen fikk alle ${arenaState.total} pingvinene denne gangen.`;
  } else {
    dom.penguinSummary.textContent = `${arenaState.remaining} av ${arenaState.total} pingviner reddet! Isbjørnen fikk ${arenaState.eaten}.`;
  }

  // Top stats cards
  dom.resultsStats.replaceChildren();
  const isPerfectScore = stats.total > 0 && stats.score === stats.total;
  const statItems = [
    { label: 'Poengsum', value: `${stats.score} / ${stats.total}`, crown: isPerfectScore },
    { label: 'Treffsikkerhet', value: `${stats.accuracy} %`, crown: false },
    { label: 'Snittid', value: formatSeconds(stats.avgTimeMs), crown: false },
  ];
  for (const item of statItems) {
    const card = el('div', item.crown ? 'stat-card stat-card-crowned' : 'stat-card');
    if (item.crown) {
      const crown = document.createElement('img');
      crown.src = './assets/crown-10-10.png';
      crown.alt = 'Gullkrone for full pott';
      crown.className = 'score-crown-img';
      card.appendChild(crown);
    }
    card.append(
      el('span', 'stat-value', item.value),
      el('span', 'stat-label', item.label),
    );
    dom.resultsStats.appendChild(card);
  }

  // Practice mistakes button
  if (state.lastMistakeQueue.length > 0) {
    dom.practiceMistakesBtn.hidden = false;
    dom.practiceMistakesBtn.textContent = `Øv på feilene (${state.lastMistakeQueue.length})`;
  } else {
    dom.practiceMistakesBtn.hidden = true;
  }

  // Per-operation breakdown
  dom.opBreakdownList.replaceChildren();
  const opEntries = OPERATIONS.filter((op) => stats.byOp[op] && stats.byOp[op].total > 0);
  if (opEntries.length > 0) {
    dom.opBreakdownSection.hidden = false;
    for (const op of opEntries) {
      const entry = stats.byOp[op];
      const card = el('div', 'op-breakdown-card');
      card.append(
        el('span', 'op-breakdown-title', `${OP_SYMBOLS[op]} ${OP_LABELS[op]}`),
        el('span', 'op-breakdown-score', `${entry.correct} / ${entry.total} riktig (${entry.accuracy} %)`),
      );
      dom.opBreakdownList.appendChild(card);
    }
  } else {
    dom.opBreakdownSection.hidden = true;
  }

  // Question-by-question list (safe DOM APIs only)
  dom.resultsList.replaceChildren();
  for (const entry of state.history) {
    const li = el('li', `result-item ${entry.correct ? 'is-correct' : 'is-wrong'}`);
    const eqSpan = el('span', 'result-eq', `${entry.eq} = ${entry.ans}`);

    let detailText = '';
    if (entry.correct) {
      detailText = `Riktig · ${formatSeconds(entry.elapsedMs)}`;
    } else if (entry.isTimeout) {
      detailText = 'Tiden gikk ut';
    } else {
      detailText = `Du svarte ${entry.rawInput || 'ingenting'}`;
    }

    const detailSpan = el('span', 'result-detail', detailText);
    li.append(eqSpan, detailSpan);
    dom.resultsList.appendChild(li);
  }

  // Real progress history chart
  renderHistoryChart(dom.resultsChart, false);
}

/* ==========================================================================
   Event Wiring
   ========================================================================== */
function bindEvents() {
  // Audio unlock on first gesture
  const unlock = () => soundEngine.init();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  dom.audioToggleBtn.addEventListener('click', toggleAudio);

  dom.startBtn.addEventListener('click', () => startRound());

  // Game HUD
  dom.pauseBtn.addEventListener('click', () => togglePause());
  dom.resumeBtn.addEventListener('click', () => togglePause(false));
  dom.quitBtn.addEventListener('click', quitToSetup);
  dom.pauseQuitBtn.addEventListener('click', quitToSetup);

  // Numpad
  const digitButtons = document.querySelectorAll('.num-btn[data-digit]');
  for (const btn of digitButtons) {
    btn.addEventListener('click', () => addDigit(btn.dataset.digit));
  }
  dom.numBackspace.addEventListener('click', backspace);
  dom.numSubmit.addEventListener('click', submitAnswer);

  // Results buttons
  dom.playAgainBtn.addEventListener('click', () => startRound());
  dom.practiceMistakesBtn.addEventListener('click', () => {
    if (state.lastMistakeQueue.length > 0) {
      startRound({ practiceQueue: state.lastMistakeQueue });
    }
  });
  dom.backSetupBtn.addEventListener('click', () => setView('setup'));

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    const isInteractiveFocus =
      activeTag === 'BUTTON' || activeTag === 'A' || activeTag === 'INPUT';

    if (state.view === 'setup') {
      if (event.key === 'Enter' && !isInteractiveFocus && !dom.startBtn.disabled) {
        event.preventDefault();
        startRound();
      }
      return;
    }

    if (state.view === 'results') {
      if (event.key === 'Enter' && !isInteractiveFocus) {
        event.preventDefault();
        startRound();
      }
      return;
    }

    if (state.view === 'game') {
      if (event.key === 'Escape') {
        event.preventDefault();
        togglePause();
        return;
      }

      if (event.key === 'p' || event.key === 'P' || event.key === ' ') {
        event.preventDefault();
        togglePause();
        return;
      }

      // Block all answer input while paused or processing
      if (state.isPaused || state.isProcessing) {
        return;
      }

      if (/^\d$/.test(event.key)) {
        event.preventDefault();
        addDigit(event.key);
      } else if (event.key === 'Backspace') {
        event.preventDefault();
        backspace();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        submitAnswer();
      }
    }
  });

  // Clean up arena on page unload
  window.addEventListener('pagehide', () => {
    cancelActiveTimers();
    if (arena) {
      arena.destroy();
      arena = null;
    }
  });
}

/* ==========================================================================
   Init
   ========================================================================== */
function init() {
  updateAudioUI();
  buildOpConfigGrid();
  bindEvents();
  setView('setup');
}

init();
