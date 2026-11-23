import { getKommuneInfo } from "./geo-data.js";
import {
  MAX_ATTEMPTS,
  createQuizState,
  getCurrentTarget,
  submitGuess,
  useHint,
  giveUpQuiz,
  getHardestMunicipality,
  shouldSaveToHistory
} from "./geo-engine.js";
import {
  STORAGE_KEYS,
  loadJson,
  saveJson,
  sanitizeGeoHistory
} from "./storage.js";

const GEOJSON_URL = "./data/trondelag-kommuner.geojson";
const FETCH_TIMEOUT_MS = 12000;
const GIVE_UP_CONFIRM_MS = 3500;
const CORRECT_DELAY_MS = 900;
const FAILED_DELAY_MS = 1800;

const STYLES = Object.freeze({
  default: { fillColor: "#3b82f6", color: "#1e3a8a", weight: 1, fillOpacity: 0.45 },
  hover: { fillColor: "#2563eb", color: "#1e3a8a", weight: 2, fillOpacity: 0.72 },
  wrong: { fillColor: "#ef4444", color: "#991b1b", weight: 1.5, fillOpacity: 0.8 },
  correct: { fillColor: "#16a34a", color: "#14532d", weight: 1.5, fillOpacity: 0.82 },
  failed: { fillColor: "#991b1b", color: "#450a0a", weight: 1.5, fillOpacity: 0.86 }
});

const dom = {
  statScore: document.getElementById("stat-score"),
  statFailed: document.getElementById("stat-failed"),
  statRemaining: document.getElementById("stat-remaining"),
  btnHint: document.getElementById("btn-hint"),
  btnGiveUp: document.getElementById("btn-giveup"),
  btnRestart: document.getElementById("btn-restart"),
  questionWrap: document.getElementById("geo-question"),
  targetName: document.getElementById("geo-target-name"),
  attemptsWrap: document.getElementById("geo-attempts"),
  attemptDots: Array.from(document.querySelectorAll(".attempt-dot")),
  feedback: document.getElementById("geo-feedback"),
  progress: document.getElementById("geo-progress"),
  progressFill: document.getElementById("geo-progress-fill"),
  mapEl: document.getElementById("quiz-map"),
  btnZoomIn: document.getElementById("btn-zoom-in"),
  btnZoomOut: document.getElementById("btn-zoom-out"),
  btnZoomReset: document.getElementById("btn-zoom-reset"),
  btnShowSummary: document.getElementById("btn-show-summary"),
  loadingOverlay: document.getElementById("geo-loading"),
  errorOverlay: document.getElementById("geo-error"),
  errorMessage: document.getElementById("geo-error-message"),
  btnRetry: document.getElementById("btn-retry"),
  summaryBackdrop: document.getElementById("geo-summary-backdrop"),
  summaryCard: document.getElementById("geo-summary"),
  summaryContent: document.getElementById("geo-summary-content")
};

let map = null;
let geoLayer = null;
let dataBounds = null;
let resizeObserver = null;
let resizeRafId = null;
let userMovedMap = false;

let municipalities = [];
let municipalitiesById = new Map();
let layersById = new Map();

let quizState = null;
let isTransitioning = false;
let revealedTarget = null;
let transitionTimer = null;
let giveUpArmed = false;
let giveUpTimer = null;
let historySavedForRound = false;

function extractKommuneId(props) {
  return String(props?.kommunenummer || props?.knr || props?.KOMMUNENR || "").trim();
}

function extractRawName(props) {
  return String(props?.name || props?.kommunenavn || props?.navn || props?.KOMMUNENAVN || "").trim();
}

function setFeedback(text, tone = "idle") {
  dom.feedback.textContent = text;
  dom.feedback.className = `geo-feedback geo-feedback-${tone}`;
}

function triggerTargetShake() {
  dom.targetName.classList.remove("iq-shake");
  void dom.targetName.offsetWidth;
  dom.targetName.classList.add("iq-shake");
}

function clearTransitionTimer() {
  if (transitionTimer !== null) {
    clearTimeout(transitionTimer);
    transitionTimer = null;
  }
}

function disarmGiveUp() {
  giveUpArmed = false;
  if (giveUpTimer !== null) {
    clearTimeout(giveUpTimer);
    giveUpTimer = null;
  }
  dom.btnGiveUp.textContent = "Gi opp";
}

function getLayerStyle(id) {
  if (!quizState) return STYLES.default;
  if (quizState.solvedIds.includes(id)) return STYLES.correct;
  if (quizState.failedIds.includes(id)) return STYLES.failed;
  if (quizState.wrongThisTargetIds.includes(id)) return STYLES.wrong;
  return STYLES.default;
}

function refreshAllLayerStyles() {
  for (const [id, layers] of layersById.entries()) {
    const style = getLayerStyle(id);
    for (const lyr of layers) {
      lyr.setStyle(style);
    }
  }
}

function bindMunicipalityTooltip(id, { open = false } = {}) {
  const info = municipalitiesById.get(id);
  const layers = layersById.get(id);
  if (!info || !layers || layers.length === 0) return;

  for (const lyr of layers) {
    if (!lyr.getTooltip()) {
      lyr.bindTooltip(info.displayName, {
        sticky: true,
        direction: "top",
        className: "geo-tooltip"
      });
    }
  }

  if (open) {
    layers[0].openTooltip();
  }
}

function closeMunicipalityTooltip(id) {
  const layers = layersById.get(id);
  if (!layers) return;
  for (const lyr of layers) {
    lyr.closeTooltip();
  }
}

function unbindAllTooltips() {
  for (const layers of layersById.values()) {
    for (const lyr of layers) {
      lyr.closeTooltip();
      lyr.unbindTooltip();
    }
  }
}

function updateHeaderUI() {
  if (!quizState) return;

  const answered = quizState.score + quizState.failed;
  const remaining = Math.max(0, quizState.total - answered);
  const pct = quizState.total > 0 ? Math.round((answered / quizState.total) * 100) : 0;

  dom.statScore.textContent = String(quizState.score);
  dom.statFailed.textContent = String(quizState.failed);
  dom.statRemaining.textContent = String(remaining);

  dom.progress.setAttribute("aria-valuemax", String(quizState.total));
  dom.progress.setAttribute("aria-valuenow", String(answered));
  dom.progressFill.style.width = `${pct}%`;

  const displayTarget = revealedTarget || getCurrentTarget(quizState);

  if (quizState.done && !revealedTarget) {
    dom.questionWrap.textContent = quizState.gaveUp
      ? "Runden ble avsluttet."
      : `Ferdig! ${quizState.score} av ${quizState.total} riktige.`;
    dom.attemptsWrap.hidden = true;
  } else if (displayTarget) {
    if (!dom.questionWrap.contains(dom.targetName)) {
      dom.questionWrap.textContent = "";
      const prefix = document.createElement("span");
      prefix.className = "geo-question-prefix";
      prefix.textContent = "Hvor ligger ";
      const suffix = document.createElement("span");
      suffix.className = "geo-question-prefix";
      suffix.textContent = "?";
      dom.questionWrap.append(prefix, dom.targetName, suffix);
    }
    dom.targetName.textContent = displayTarget.displayName;
    dom.targetName.classList.toggle("is-wrong", quizState.attemptsLeft < MAX_ATTEMPTS && !revealedTarget);
    dom.attemptsWrap.hidden = false;

    const used = MAX_ATTEMPTS - quizState.attemptsLeft;
    dom.attemptsWrap.setAttribute("aria-label", `${quizState.attemptsLeft} av ${MAX_ATTEMPTS} forsøk igjen`);
    dom.attemptDots.forEach((dot, idx) => {
      dot.classList.toggle("is-used", idx < used);
    });
  }

  const activePlay = !quizState.done && !isTransitioning;
  dom.btnHint.disabled = !activePlay || quizState.hintUsedForCurrent;
  dom.btnGiveUp.disabled = quizState.done;
  dom.btnRestart.disabled = municipalities.length === 0;
}

function loadSanitizedHistory() {
  const raw = loadJson(STORAGE_KEYS.GEO_HISTORY, []);
  return sanitizeGeoHistory(raw);
}

function finalizeQuiz() {
  clearTransitionTimer();
  disarmGiveUp();
  isTransitioning = false;
  revealedTarget = null;

  let history = loadSanitizedHistory();
  if (shouldSaveToHistory(quizState) && !historySavedForRound) {
    history = [
      ...history,
      {
        score: quizState.score,
        total: quizState.total,
        date: new Date().toISOString()
      }
    ].slice(-20);
    saveJson(STORAGE_KEYS.GEO_HISTORY, history);
    historySavedForRound = true;
  }

  setFeedback(
    quizState.gaveUp
      ? `Du ga opp med ${quizState.score} av ${quizState.total} riktige.`
      : `Ferdig! Du klarte ${quizState.score} av ${quizState.total} kommuner.`,
    quizState.gaveUp ? "idle" : "correct"
  );

  updateHeaderUI();
  renderSummary(history);
  openSummary();
}

function openSummary() {
  dom.summaryBackdrop.hidden = false;
  dom.btnShowSummary.hidden = true;
  dom.summaryCard.focus();
}

function closeSummary() {
  dom.summaryBackdrop.hidden = true;
  if (quizState && quizState.done) {
    dom.btnShowSummary.hidden = false;
  }
}

function renderSummary(history) {
  dom.summaryContent.textContent = "";

  const header = document.createElement("div");
  header.className = "summary-header";

  const title = document.createElement("h2");
  title.id = "summary-title";
  title.textContent = quizState.gaveUp ? "Runden er avsluttet" : "Gratulerer – ferdig!";
  header.appendChild(title);

  const scoreLine = document.createElement("p");
  scoreLine.className = "summary-score-line";
  const pctTotal = quizState.total > 0 ? Math.round((quizState.score / quizState.total) * 100) : 0;
  scoreLine.append("Du fikk ");
  const scoreStrong = document.createElement("span");
  scoreStrong.className = "summary-score-strong";
  scoreStrong.textContent = `${quizState.score} av ${quizState.total}`;
  scoreLine.append(scoreStrong, ` riktige (${pctTotal} %).`);
  header.appendChild(scoreLine);

  if (quizState.gaveUp) {
    const note = document.createElement("p");
    note.className = "summary-note";
    note.textContent = "Runden ble avsluttet tidlig og lagres ikke i historikken.";
    header.appendChild(note);
  }

  dom.summaryContent.appendChild(header);

  // Siste 5 spill bar chart
  const chartSection = document.createElement("div");
  const chartTitle = document.createElement("h3");
  chartTitle.className = "summary-section-title";
  chartTitle.textContent = "Siste 5 spill";
  chartSection.appendChild(chartTitle);

  const last5 = history.slice(-5);
  if (last5.length === 0) {
    const empty = document.createElement("p");
    empty.className = "summary-chart-empty";
    empty.textContent = "Ingen fullførte spill lagret enda.";
    chartSection.appendChild(empty);
  } else {
    const chart = document.createElement("div");
    chart.className = "summary-chart";
    chart.setAttribute("role", "list");
    chart.setAttribute("aria-label", "Resultater fra de siste fem spillene");

    last5.forEach((entry, index) => {
      const pct = Math.round((entry.score / Math.max(entry.total, 1)) * 100);
      const isCurrent = !quizState.gaveUp && index === last5.length - 1;

      const col = document.createElement("div");
      col.className = "summary-bar-col";
      col.setAttribute("role", "listitem");

      const scoreText = document.createElement("div");
      scoreText.className = "summary-bar-score";
      scoreText.textContent = `${entry.score}/${entry.total}`;

      const pctText = document.createElement("div");
      pctText.className = "summary-bar-pct";
      pctText.textContent = `${pct} %`;

      const track = document.createElement("div");
      track.className = "summary-bar-track";

      const fill = document.createElement("div");
      fill.className = isCurrent ? "summary-bar-fill is-current" : "summary-bar-fill";
      fill.style.height = `${Math.max(pct, 3)}%`;
      track.appendChild(fill);

      const label = document.createElement("div");
      label.className = "summary-bar-label";
      label.textContent = isCurrent ? "Nå" : `Spill ${index + 1}`;

      col.append(scoreText, pctText, track, label);
      chart.appendChild(col);
    });

    chartSection.appendChild(chart);
  }

  dom.summaryContent.appendChild(chartSection);

  // Hardest municipality (only shown if player actually had wrong clicks)
  const hardest = getHardestMunicipality(quizState);
  if (hardest) {
    const card = document.createElement("div");
    card.className = "summary-hardest";

    const hTitle = document.createElement("h3");
    hTitle.className = "summary-section-title";
    hTitle.textContent = "Vanskeligste kommune";

    const hName = document.createElement("p");
    hName.className = "summary-hardest-name";
    hName.textContent = hardest.displayName;

    const hMeta = document.createElement("p");
    hMeta.className = "summary-hardest-meta";
    hMeta.textContent = `${hardest.wrongClicks} feilklikk denne runden · ${hardest.region}`;

    const hFact = document.createElement("p");
    hFact.className = "summary-hardest-fact";
    const factLead = document.createElement("strong");
    factLead.textContent = "Visste du at: ";
    hFact.append(factLead, hardest.fact);

    card.append(hTitle, hName, hMeta, hFact);
    dom.summaryContent.appendChild(card);
  }

  // Action buttons
  const actions = document.createElement("div");
  actions.className = "summary-actions";

  const playAgainBtn = document.createElement("button");
  playAgainBtn.type = "button";
  playAgainBtn.className = "btn btn-primary-geo";
  playAgainBtn.textContent = "Spill igjen";
  playAgainBtn.addEventListener("click", () => {
    startNewGame();
  });

  const inspectMapBtn = document.createElement("button");
  inspectMapBtn.type = "button";
  inspectMapBtn.className = "btn btn-secondary";
  inspectMapBtn.textContent = "Se kartet";
  inspectMapBtn.addEventListener("click", () => {
    closeSummary();
  });

  actions.append(playAgainBtn, inspectMapBtn);
  dom.summaryContent.appendChild(actions);
}

function handleMunicipalityClick(clickedId) {
  if (!quizState || quizState.done || isTransitioning) return;

  const targetBefore = getCurrentTarget(quizState);
  if (!targetBefore) return;

  const result = submitGuess(quizState, clickedId);
  if (result.outcome === "ignored") return;

  quizState = result.state;
  const clickedInfo = municipalitiesById.get(clickedId);

  if (result.outcome === "correct") {
    revealedTarget = targetBefore;
    isTransitioning = true;
    bindMunicipalityTooltip(targetBefore.id, { open: true });
    setFeedback(`Riktig! Det var ${targetBefore.displayName}.`, "correct");
    refreshAllLayerStyles();
    updateHeaderUI();

    clearTransitionTimer();
    transitionTimer = setTimeout(() => {
      transitionTimer = null;
      closeMunicipalityTooltip(targetBefore.id);
      revealedTarget = null;
      isTransitioning = false;
      refreshAllLayerStyles();
      if (quizState.done) {
        finalizeQuiz();
      } else {
        const nextTarget = getCurrentTarget(quizState);
        setFeedback(`Finn ${nextTarget.displayName} på kartet.`, "idle");
        updateHeaderUI();
      }
    }, CORRECT_DELAY_MS);
    return;
  }

  if (result.outcome === "wrong") {
    const clickedName = clickedInfo ? clickedInfo.displayName : "den kommunen";
    setFeedback(
      `Feil – det var ${clickedName}. ${result.attemptsLeft} forsøk igjen for ${targetBefore.displayName}.`,
      "wrong"
    );
    triggerTargetShake();
    refreshAllLayerStyles();
    updateHeaderUI();
    return;
  }

  if (result.outcome === "failed") {
    revealedTarget = targetBefore;
    isTransitioning = true;
    bindMunicipalityTooltip(targetBefore.id, { open: true });
    setFeedback(`Riktig svar var ${targetBefore.displayName} – se markeringen på kartet.`, "failed");
    triggerTargetShake();
    refreshAllLayerStyles();
    updateHeaderUI();

    clearTransitionTimer();
    transitionTimer = setTimeout(() => {
      transitionTimer = null;
      closeMunicipalityTooltip(targetBefore.id);
      revealedTarget = null;
      isTransitioning = false;
      refreshAllLayerStyles();
      if (quizState.done) {
        finalizeQuiz();
      } else {
        const nextTarget = getCurrentTarget(quizState);
        setFeedback(`Finn ${nextTarget.displayName} på kartet.`, "idle");
        updateHeaderUI();
      }
    }, FAILED_DELAY_MS);
  }
}

function handleHintClick() {
  if (!quizState || quizState.done || isTransitioning) return;
  const result = useHint(quizState);
  if (!result) return;
  quizState = result.state;
  setFeedback(`Hint: Ligger i ${result.hint.region}.`, "hint");
  updateHeaderUI();
}

function handleGiveUpClick() {
  if (!quizState || quizState.done) return;

  if (!giveUpArmed) {
    giveUpArmed = true;
    dom.btnGiveUp.textContent = "Sikker? Klikk igjen";
    giveUpTimer = setTimeout(() => {
      disarmGiveUp();
    }, GIVE_UP_CONFIRM_MS);
    return;
  }

  disarmGiveUp();
  clearTransitionTimer();
  isTransitioning = false;
  revealedTarget = null;

  quizState = giveUpQuiz(quizState);
  for (const failedId of quizState.failedIds) {
    bindMunicipalityTooltip(failedId, { open: false });
  }
  refreshAllLayerStyles();
  finalizeQuiz();
}

function fitMapToTrondelag() {
  if (!map || !dataBounds) return;
  userMovedMap = false;
  map.invalidateSize();
  map.fitBounds(dataBounds, { padding: [12, 12] });
}

function startNewGame() {
  if (municipalities.length === 0) return;
  clearTransitionTimer();
  disarmGiveUp();
  isTransitioning = false;
  revealedTarget = null;
  historySavedForRound = false;

  dom.summaryBackdrop.hidden = true;
  dom.btnShowSummary.hidden = true;

  unbindAllTooltips();
  quizState = createQuizState(municipalities);
  refreshAllLayerStyles();

  const first = getCurrentTarget(quizState);
  if (first) {
    setFeedback(`Klikk på ${first.displayName} i kartet.`, "idle");
  }
  updateHeaderUI();
}

function showError(message) {
  dom.loadingOverlay.hidden = true;
  dom.errorMessage.textContent = message;
  dom.errorOverlay.hidden = false;
  setFeedback(message, "wrong");
}

async function fetchGeoJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    if (!json || !Array.isArray(json.features) || json.features.length === 0) {
      throw new Error("Ugyldig GeoJSON-format");
    }
    return json;
  } finally {
    clearTimeout(timeoutId);
  }
}

function teardownMap() {
  if (resizeRafId !== null) {
    cancelAnimationFrame(resizeRafId);
    resizeRafId = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  if (map) {
    map.remove();
    map = null;
  }
  geoLayer = null;
  dataBounds = null;
  layersById.clear();
}

async function initMapAndQuiz() {
  dom.errorOverlay.hidden = true;
  dom.loadingOverlay.hidden = false;
  setFeedback("Laster kartdata for Trøndelag …", "idle");

  if (!window.L) {
    showError("Kunne ikke laste kartbiblioteket Leaflet. Sjekk tilkoblingen og prøv igjen.");
    return;
  }

  let geo;
  try {
    geo = await fetchGeoJsonWithTimeout(GEOJSON_URL, FETCH_TIMEOUT_MS);
  } catch (err) {
    const isAbort = err && err.name === "AbortError";
    showError(
      isAbort
        ? "Lastingen av kartdata tok for lang tid. Prøv igjen."
        : "Kunne ikke laste kommunedata for Trøndelag. Prøv igjen."
    );
    return;
  }

  const trondelagFeatures = geo.features.filter((f) => extractKommuneId(f.properties).startsWith("50"));
  if (trondelagFeatures.length === 0) {
    showError("Fant ingen Trøndelag-kommuner i kartdataene.");
    return;
  }

  municipalitiesById.clear();
  for (const feature of trondelagFeatures) {
    const id = extractKommuneId(feature.properties);
    const rawName = extractRawName(feature.properties);
    if (!id || municipalitiesById.has(id)) continue;
    const info = getKommuneInfo(id, rawName);
    municipalitiesById.set(id, {
      id,
      name: rawName || info.displayName,
      displayName: info.displayName,
      region: info.region,
      fact: info.fact
    });
  }
  municipalities = Array.from(municipalitiesById.values());

  teardownMap();

  const L = window.L;
  map = L.map(dom.mapEl, {
    zoomControl: false,
    dragging: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    touchZoom: true,
    boxZoom: true,
    keyboard: true,
    zoomSnap: 0.25,
    maxBoundsViscosity: 0.8
  });

  map.attributionControl.setPrefix(false);
  map.attributionControl.addAttribution(
    'Kartdata: <a href="https://www.kartverket.no/" target="_blank" rel="noopener noreferrer">Kartverket</a> · CC BY 4.0'
  );

  map.on("dragstart zoomstart", () => {
    userMovedMap = true;
  });

  geoLayer = L.geoJSON(
    { type: "FeatureCollection", features: trondelagFeatures },
    {
      style: (feature) => getLayerStyle(extractKommuneId(feature.properties)),
      onEachFeature: (feature, lyr) => {
        const id = extractKommuneId(feature.properties);
        if (!id) return;

        if (!layersById.has(id)) {
          layersById.set(id, []);
        }
        layersById.get(id).push(lyr);

        lyr.on("click", () => {
          handleMunicipalityClick(id);
        });

        lyr.on("mouseover", () => {
          if (!quizState || quizState.done || isTransitioning) return;
          if (
            quizState.solvedIds.includes(id) ||
            quizState.failedIds.includes(id) ||
            quizState.wrongThisTargetIds.includes(id)
          ) {
            return;
          }
          const group = layersById.get(id) || [lyr];
          for (const item of group) {
            item.setStyle(STYLES.hover);
          }
        });

        lyr.on("mouseout", () => {
          const style = getLayerStyle(id);
          const group = layersById.get(id) || [lyr];
          for (const item of group) {
            item.setStyle(style);
          }
        });
      }
    }
  ).addTo(map);

  dataBounds = geoLayer.getBounds();
  fitMapToTrondelag();
  map.setMaxBounds(dataBounds.pad(0.28));
  map.setMinZoom(Math.max(map.getZoom() - 0.5, 4));
  map.setMaxZoom(12);

  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      if (resizeRafId !== null) return;
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null;
        if (!map) return;
        map.invalidateSize();
        if (!userMovedMap && dataBounds) {
          map.fitBounds(dataBounds, { padding: [12, 12] });
        }
      });
    });
    resizeObserver.observe(dom.mapEl);
  }

  dom.loadingOverlay.hidden = true;
  startNewGame();
}

function bindEvents() {
  dom.btnHint.addEventListener("click", handleHintClick);
  dom.btnGiveUp.addEventListener("click", handleGiveUpClick);
  dom.btnRestart.addEventListener("click", startNewGame);
  dom.btnRetry.addEventListener("click", initMapAndQuiz);
  dom.btnShowSummary.addEventListener("click", openSummary);

  dom.btnZoomIn.addEventListener("click", () => {
    if (map) map.zoomIn(0.75);
  });
  dom.btnZoomOut.addEventListener("click", () => {
    if (map) map.zoomOut(0.75);
  });
  dom.btnZoomReset.addEventListener("click", fitMapToTrondelag);

  dom.summaryBackdrop.addEventListener("click", (event) => {
    if (event.target === dom.summaryBackdrop) {
      closeSummary();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.summaryBackdrop.hidden) {
      closeSummary();
    }
  });
}

bindEvents();
initMapAndQuiz();
