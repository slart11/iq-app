const { useEffect, useRef, useState } = React;
const kommuneFacts = {
    Trondheim: "Trondheim var Norges hovedstad i vikingtiden og huser Nidarosdomen – Nordens største middelalderkatedral.",
    Steinkjer: "Steinkjer ble nesten fullstendig bombet i 1940, og byen ble bygget opp igjen i funkis-stil.",
    Namsos: "Namsos har Nord-Europas eneste rockemuseum – Rock City.",
    Frøya: "Frøya er kjent som «lakseøya» og har en av verdens største konsentrasjoner av oppdrettslaks.",
    Osen: "Osen har en kystlinje så full av holmer og skjær at ingen har klart å telle dem alle.",
    Oppdal: "Oppdal har Norges største villreinstamme og et av landets mest populære alpinanlegg.",
    Rennebu: "Rennebu er kjent for Rennebumartnan, en av Norges største håndverksmesser.",
    Røros: "Røros er på UNESCOs verdensarvliste, og temperaturen har vært målt til under −50 °C.",
    Holtålen: "Holtålen har Norges eldste trekirke i drift – Haltdalen stavkirke (kopien står her, originalen på Sverresborg).",
    "Midtre Gauldal": "Støren i Midtre Gauldal er kjent for å ha et av Norges eldste jernbaneknutepunkt.",
    Melhus: "Melhus var maktsentrum for høvdingen Einar Tambarskjelve på 1000-tallet.",
    Skaun: "I Skaun ligger Husaby, der kong Sverre bygde en av sine borger på 1100-tallet.",
    Malvik: "Malvik har Norges eneste jernbanestasjon oppkalt etter en potet – nei, tuller, men bygda Hommelvik var storhavn for tømmereksport.",
    Selbu: "Selbu er hjembygda til den verdensberømte selbuvotten med det åttebladede rosemønsteret.",
    Tydal: "Tydal er en av Norges minst befolkede kommuner, med færre innbyggere enn en middels stor ungdomsskole.",
    Meråker: "Meråker er kjent som «langrennsbygda» og har fostret utallige norske skistjerner.",
    Stjørdal: "Stjørdal huser Trondheim lufthavn Værnes, som opprinnelig var en militær flyplass fra 1914.",
    Frosta: "Frosta var stedet for Frostatinget – ett av Norges eldste lagting, grunnlagt rundt år 600.",
    Levanger: "Levanger sentrum har Norges største sammenhengende trehusbebyggelse fra sent 1800-tall.",
    Verdal: "På Stiklestad i Verdal falt Olav den Hellige i slaget i 1030 – et av Norges mest kjente historiske vendepunkt.",
    Snåsa: "Snåsa er tospråklig kommune (norsk og sørsamisk) og var hjem til den kjente «Snåsamannen» Joralf Gjerstad.",
    Lierne: "Lierne har Norges tetteste bjørnebestand – flere bjørner per kvadratkilometer enn noe annet sted i landet.",
    Røyrvik: "Røyrvik er Trøndelags minste kommune i folketall, med rundt 450 innbyggere.",
    Namsskogan: "Namsskogan Familiepark er kjent for sine bjørner, ulver og gauper – og for TV-serien om Salto bjørnen.",
    Grong: "I Grong renner Namsen – en av verdens beste lakseelver, kalt «laksens dronning».",
    Høylandet: "Høylandet er hjembygda til Trøndersk Matfestival og har egen revyfestival som er større enn folketallet.",
    Overhalla: "Overhalla er kjent for Overhalla Betongbygg og for at det ble funnet en 1500 år gammel «Overhallahjelm» her.",
    Flatanger: "Flatanger har Norges kanskje mest fotograferte klippe – Hillarnuten – og noen av Europas beste klatreruter.",
    Leka: "Leka er kalt Norges geologiske nasjonalmonument, med røde fjell fra jordas indre som er 500 millioner år gamle.",
    Inderøy: "Inderøy kalles «Den gyldne omvei» og er en av Trøndelags mest kjente matkommuner.",
    "Indre Fosen": "I Indre Fosen ligger Rissa, kjent for det spektakulære kvikkleireskredet i 1978 som ble filmet direkte.",
    Heim: "Heim ble opprettet i 2020 og har navn etter den norrøne betegnelsen for «hjem».",
    Hitra: "Hitra har Norges tetteste hjortebestand – det er faktisk flere hjort enn mennesker på øya.",
    Ørland: "Ørland huser Norges viktigste kampflybase, hjem til F-35-flyene.",
    Åfjord: "Åfjord er kjent for Åfjordsbåten, en tradisjonell trebåt som har vært brukt langs kysten i hundrevis av år.",
    Orkland: "Orkland ble dannet i 2020 og huser Løkken Verk, som var Norges eldste og lengst driftede kobbergruve.",
    Nærøysund: "Nærøysund er hjem til Rørvik – en av Norges viktigste fiskerihavner.",
    Rindal: "Rindal er kjent som «skibygda» og har produsert Rindalsski i over 100 år.",
};
const HISTORY_KEY = "trondelag-quiz-history-v1";
const loadHistory = () => {
    if (typeof window === "undefined")
        return [];
    try {
        const raw = window.localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
};
const saveHistory = (h) => {
    try {
        window.localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    }
    catch {
        // ignore
    }
};
function Quiz() {
    const mapRef = useRef(null);
    const leafletMap = useRef(null);
    const geoLayer = useRef(null);
    const remainingRef = useRef([]);
    const currentRef = useRef(null);
    // permanent: correct or failed. wrong is transient per attempt.
    const statusMap = useRef(new Map());
    const wrongThisRound = useRef(new Set());
    const wrongAttempts = useRef(0);
    const wrongPerTarget = useRef(new Map());
    const totalCount = useRef(0);
    const scoreRef = useRef(0);
    const finished = useRef(false);
    const locked = useRef(false);
    const pendingTimer = useRef(null);
    const [current, setCurrent] = useState(null);
    const [score, setScore] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [remainingCount, setRemainingCount] = useState(0);
    const [feedback, setFeedback] = useState({
        text: "Laster kart...",
        status: "idle",
    });
    const [shakeId, setShakeId] = useState(0);
    const [done, setDone] = useState(false);
    const [history, setHistory] = useState([]);
    const [hardest, setHardest] = useState(null);
    const [finalScore, setFinalScore] = useState(0);
    const nameOf = (props) => props?.kommunenavn || props?.navn || props?.name || props?.KOMMUNENAVN || "";
    const styleFor = (name) => {
        const s = statusMap.current.get(name);
        if (s === "correct")
            return { fillColor: "#22c55e", color: "#166534", weight: 1, fillOpacity: 0.8 };
        if (s === "failed")
            return { fillColor: "#7f1d1d", color: "#450a0a", weight: 1, fillOpacity: 0.9 };
        if (wrongThisRound.current.has(name))
            return { fillColor: "#ef4444", color: "#991b1b", weight: 1, fillOpacity: 0.8 };
        return { fillColor: "#0d9488", color: "#134e4a", weight: 1, fillOpacity: 0.55 };
    };
    const refreshStyles = () => {
        geoLayer.current?.setStyle((feat) => styleFor(nameOf(feat.properties)));
    };
    const finalize = () => {
        if (finished.current)
            return;
        finished.current = true;
        let hardestEntry = null;
        wrongPerTarget.current.forEach((v, k) => {
            if (v > 0 && (!hardestEntry || v > hardestEntry.wrong)) {
                hardestEntry = { name: k, wrong: v };
            }
        });
        setHardest(hardestEntry);
        const score = scoreRef.current;
        setFinalScore(score);
        const next = [...loadHistory(), { score, total: totalCount.current, date: Date.now() }].slice(-10);
        saveHistory(next);
        setHistory(next);
        setDone(true);
        setFeedback({ text: "Ferdig!", status: "idle" });
    };
    const giveUp = () => {
        if (pendingTimer.current)
            clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
        // Mark remaining as failed and increment wrong counter for summary purposes
        const remaining = [...remainingRef.current];
        remaining.forEach((name) => {
            statusMap.current.set(name, "failed");
            wrongPerTarget.current.set(name, (wrongPerTarget.current.get(name) ?? 0) + 1);
            geoLayer.current?.eachLayer((lyr) => {
                if (nameOf(lyr.feature?.properties) === name) {
                    lyr.bindTooltip(name, { sticky: true, direction: "top" });
                }
            });
        });
        setWrong((w) => w + remaining.length);
        remainingRef.current = [];
        setRemainingCount(0);
        currentRef.current = null;
        setCurrent(null);
        refreshStyles();
        finalize();
    };
    const pickNext = () => {
        pendingTimer.current = null;
        locked.current = false;
        wrongThisRound.current.clear();
        wrongAttempts.current = 0;
        refreshStyles();
        if (remainingRef.current.length === 0) {
            currentRef.current = null;
            setCurrent(null);
            finalize();
            return;
        }
        const idx = Math.floor(Math.random() * remainingRef.current.length);
        const name = remainingRef.current[idx];
        currentRef.current = name;
        setCurrent(name);
        setFeedback({ text: `Hvor ligger ${name}?`, status: "idle" });
    };
    const scheduleNext = (delay) => {
        locked.current = true;
        if (pendingTimer.current)
            clearTimeout(pendingTimer.current);
        pendingTimer.current = setTimeout(pickNext, delay);
    };
    const failCurrent = () => {
        const target = currentRef.current;
        if (!target || locked.current)
            return;
        statusMap.current.set(target, "failed");
        setShakeId((n) => n + 1);
        wrongThisRound.current.clear();
        remainingRef.current = remainingRef.current.filter((n) => n !== target);
        setRemainingCount(remainingRef.current.length);
        setFeedback({ text: `Riktig svar: ${target}`, status: "failed" });
        // bind tooltip on the failed municipality layer(s)
        geoLayer.current?.eachLayer((lyr) => {
            const name = nameOf(lyr.feature?.properties);
            if (name === target)
                lyr.bindTooltip(name, { sticky: true, direction: "top" });
        });
        refreshStyles();
        scheduleNext(1800);
    };
    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!window.L) {
                setFeedback({ text: "Kunne ikke laste kartbiblioteket. Last siden på nytt.", status: "wrong" });
                return;
            }
            const L = window.L;
            if (cancelled || !mapRef.current)
                return;
            const map = L.map(mapRef.current, {
                zoomControl: false,
                dragging: false,
                scrollWheelZoom: false,
                doubleClickZoom: false,
                boxZoom: false,
                touchZoom: false,
                keyboard: false,
                zoomSnap: 0.25,
            });
            map.attributionControl.addAttribution('<a href="https://github.com/robhop/fylker-og-kommuner">Kartverket og robhop</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>');
        leafletMap.current = map;
            let geo;
            try {
                const res = await fetch("https://raw.githubusercontent.com/robhop/fylker-og-kommuner/main/Kommuner-M.geojson");
                if (!res.ok)
                    throw new Error(`Kartdata: HTTP ${res.status}`);
                geo = await res.json();
                if (!Array.isArray(geo.features))
                    throw new Error("Ugyldige kartdata");
            }
            catch (e) {
                setFeedback({ text: "Kunne ikke laste kommunedata.", status: "wrong" });
                return;
            }
            if (cancelled)
                return;
            const features = geo.features.filter((f) => {
                const p = f.properties || {};
                const num = String(p.kommunenummer || p.knr || p.KOMMUNENR || "");
                return num.startsWith("50");
            });
            const filtered = { type: "FeatureCollection", features };
            const names = Array.from(new Set(features.map((f) => nameOf(f.properties)).filter(Boolean)));
            if (!names.length) {
                setFeedback({ text: "Fant ingen kommuner i kartdataene.", status: "wrong" });
                return;
            }
            remainingRef.current = [...names];
            totalCount.current = names.length;
            setRemainingCount(names.length);
            const layer = L.geoJSON(filtered, {
                style: (feat) => styleFor(nameOf(feat.properties)),
                onEachFeature: (feature, lyr) => {
                    const name = nameOf(feature.properties);
                    lyr.on("click", () => {
                        const target = currentRef.current;
                        if (!target || locked.current)
                            return;
                        // Correct/failed kommuner are locked
                        const s = statusMap.current.get(name);
                        if (s === "correct" || s === "failed")
                            return;
                        // Red municipalities from this round cannot be clicked again
                        if (wrongThisRound.current.has(name))
                            return;
                        if (name === target) {
                            statusMap.current.set(name, "correct");
                            wrongThisRound.current.clear();
                            wrongAttempts.current = 0;
                            scoreRef.current++;
                            setScore(scoreRef.current);
                            setFeedback({ text: `Riktig! ${name}`, status: "correct" });
                            remainingRef.current = remainingRef.current.filter((n) => n !== target);
                            setRemainingCount(remainingRef.current.length);
                            lyr.bindTooltip(name, { sticky: true, direction: "top" });
                            refreshStyles();
                            scheduleNext(900);
                        }
                        else {
                            if (!wrongThisRound.current.has(name)) {
                                wrongThisRound.current.add(name);
                                setWrong((w) => w + 1);
                            }
                            wrongAttempts.current += 1;
                            wrongPerTarget.current.set(target, (wrongPerTarget.current.get(target) ?? 0) + 1);
                            setFeedback({ text: `Hvor ligger ${target}?`, status: "wrong" });
                            setShakeId((n) => n + 1);
                            refreshStyles();
                            if (wrongAttempts.current >= 3) {
                                failCurrent();
                            }
                        }
                    });
                    lyr.on("mouseover", () => {
                        if (statusMap.current.get(name) === "correct" || statusMap.current.get(name) === "failed")
                            return;
                        lyr.setStyle({ weight: 2, fillOpacity: 0.85 });
                    });
                    lyr.on("mouseout", () => geoLayer.current?.resetStyle(lyr));
                },
            }).addTo(map);
            geoLayer.current = layer;
            const bounds = layer.getBounds();
            const fitMap = () => {
                map.invalidateSize();
                map.fitBounds(bounds, { padding: [8, 8] });
            };
            fitMap();
            const ro = new ResizeObserver(fitMap);
            if (mapRef.current)
                ro.observe(mapRef.current);
            leafletMap.current._ro = ro;
            pickNext();
        })();
        return () => {
            cancelled = true;
            if (pendingTimer.current)
                clearTimeout(pendingTimer.current);
            leafletMap.current?._ro?.disconnect();
            leafletMap.current?.remove();
            leafletMap.current = null;
        };
    }, []);
    const reset = () => {
        if (!geoLayer.current)
            return;
        finished.current = false;
        scoreRef.current = 0;
        if (pendingTimer.current)
            clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
        locked.current = false;
        statusMap.current.clear();
        wrongThisRound.current.clear();
        wrongAttempts.current = 0;
        wrongPerTarget.current.clear();
        setScore(0);
        setWrong(0);
        setDone(false);
        setHardest(null);
        setFinalScore(0);
        if (geoLayer.current) {
            const feats = geoLayer.current.toGeoJSON().features;
            const names = Array.from(new Set(feats.map((f) => nameOf(f.properties)).filter(Boolean)));
            remainingRef.current = [...names];
            totalCount.current = names.length;
            setRemainingCount(names.length);
            // remove all tooltips so failed/correct labels don't persist into a new game
            geoLayer.current?.eachLayer((lyr) => lyr.unbindTooltip?.());
            refreshStyles();
        }
        pickNext();
    };
    const questionClass = "text-2xl font-extrabold uppercase tracking-wide text-foreground";
    const feedbackTextColor = (status) => {
        if (status === "correct")
            return "text-green-600";
        if (status === "wrong" || status === "failed")
            return "text-red-600";
        return "text-foreground";
    };
    return (React.createElement("div", { className: "fixed inset-0 flex flex-col bg-background" },
        React.createElement("header", { className: "flex flex-wrap items-start justify-between gap-4 p-4 border-b border-border bg-background z-10" },
            React.createElement("div", null,
                React.createElement("a", { href: "./", className: "inline-block mb-2 text-sm font-semibold text-teal-700 hover:underline" }, "\u2190 Forside"),
                React.createElement("h1", { className: "text-xl font-bold" }, "Tr\u00F8ndelag Kartquiz"),
                React.createElement("div", { className: questionClass, "aria-live": "polite" }, done ? (React.createElement("span", { className: feedbackTextColor(feedback.status) }, feedback.text)) : current ? (React.createElement(React.Fragment, null,
                    React.createElement("span", { className: "text-foreground" }, "Hvor ligger "),
                    React.createElement("span", { key: shakeId, className: `inline-block text-3xl ${feedback.status === "wrong" || feedback.status === "failed"
                            ? "text-red-600 animate-shake"
                            : "text-teal-600"}` }, current),
                    React.createElement("span", { className: "text-foreground" }, "?"))) : (React.createElement("span", { className: feedbackTextColor(feedback.status) }, feedback.text)))),
            React.createElement("div", { className: "flex gap-2 items-center text-sm" },
                React.createElement("div", { className: "rounded-md bg-secondary px-3 py-2" },
                    React.createElement("div", { className: "text-xs text-muted-foreground" }, "Riktige"),
                    React.createElement("div", { className: "font-semibold text-green-600" }, score)),
                React.createElement("div", { className: "rounded-md bg-secondary px-3 py-2" },
                    React.createElement("div", { className: "text-xs text-muted-foreground" }, "Feil"),
                    React.createElement("div", { className: "font-semibold text-red-600" }, wrong)),
                React.createElement("div", { className: "rounded-md bg-secondary px-3 py-2" },
                    React.createElement("div", { className: "text-xs text-muted-foreground" }, "Gjenst\u00E5r"),
                    React.createElement("div", { className: "font-semibold" }, remainingCount)),
                !done && remainingCount > 0 && (React.createElement("button", { onClick: giveUp, className: "rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90" }, "Gi opp")),
                React.createElement("button", { onClick: reset, disabled: totalCount.current === 0, className: "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" }, "Start p\u00E5 nytt"))),
        React.createElement("div", { className: `flex-1 min-h-0 flex flex-col ${done ? "overflow-y-auto" : ""}` },
            done && (React.createElement("div", { className: "border-b border-border bg-background shrink-0" },
                React.createElement(SummaryOverlay, { finalScore: finalScore, total: totalCount.current, history: history, hardest: hardest, onRestart: reset }))),
            React.createElement("div", { id: "quiz-map", ref: mapRef, className: done ? "h-[70vh] shrink-0 bg-background" : "flex-1 min-h-0 bg-background" }))));
}
function SummaryOverlay({ finalScore, total, history, hardest, onRestart, }) {
    const last5 = history.slice(-5);
    const maxBar = Math.max(total, 1);
    return (React.createElement("div", { className: "p-6 space-y-5" },
        React.createElement("div", null,
            React.createElement("h2", { className: "text-2xl font-bold" }, "Ferdig!"),
            React.createElement("p", { className: "text-muted-foreground" },
                "Du fikk ",
                React.createElement("span", { className: "font-semibold text-green-600" }, finalScore),
                " av ",
                total,
                " riktige.")),
        React.createElement("div", null,
            React.createElement("h3", { className: "text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2" }, "Siste 5 spill"),
            last5.length === 0 ? (React.createElement("p", { className: "text-sm text-muted-foreground" }, "Ingen historikk enda.")) : (React.createElement("div", { className: "flex items-end gap-2 h-40" }, last5.map((h, i) => {
                const pct = (h.score / Math.max(h.total, 1)) * 100;
                const isCurrent = i === last5.length - 1;
                return (React.createElement("div", { key: h.date, className: "flex-1 flex flex-col items-center gap-1" },
                    React.createElement("div", { className: "text-xs font-semibold" }, h.score),
                    React.createElement("div", { className: "w-full bg-secondary rounded-t-md relative", style: { height: "100%" } },
                        React.createElement("div", { className: `absolute bottom-0 left-0 right-0 rounded-t-md ${isCurrent ? "bg-teal-600" : "bg-teal-600/50"}`, style: { height: `${pct}%` } })),
                    React.createElement("div", { className: "text-[10px] text-muted-foreground" }, isCurrent ? "Nå" : `#${last5.length - i - 1 + 1}`)));
            }))),
            React.createElement("p", { className: "text-xs text-muted-foreground mt-2" },
                "Maks mulig: ",
                maxBar)),
        hardest && (React.createElement("div", { className: "rounded-md bg-secondary p-4" },
            React.createElement("h3", { className: "text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-1" }, "Mest problematiske kommune"),
            React.createElement("p", { className: "text-lg font-bold text-teal-600" }, hardest.name),
            React.createElement("p", { className: "text-xs text-muted-foreground mb-2" },
                hardest.wrong,
                " feilklikk denne runden"),
            React.createElement("p", { className: "text-sm" },
                React.createElement("span", { className: "font-semibold" }, "Morsom fakta: "),
                kommuneFacts[hardest.name] ?? "Ingen fakta tilgjengelig for denne kommunen enda."))),
        React.createElement("button", { onClick: onRestart, className: "w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" }, "Spill igjen")));
}
ReactDOM.createRoot(document.getElementById("quiz")).render(React.createElement(Quiz, null));
