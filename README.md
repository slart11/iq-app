# IQ-app

En rask, tilgjengelig og null-avhengighets nettapp for trening i hoderegning og geografi i Trøndelag.

**Live-versjon:** https://slart11.github.io/iq-app/

## Moduler

1. **Matte (Hoderegning)** (`matte.html`)
   - Adaptiv tidsberegning per oppgave og valgfri tidspress-modus.
   - Egen øving på oppgaver du svarte feil på.
   - Lokalt lagret fremgang og statistikk i nettleseren.
   - Interaktiv **pingvinrampe- og isbjørn-animasjon** som belønner riktige svar og reagerer på tempo og treffsikkerhet.

2. **Geografi (Trøndelag kartquiz)** (`geografi.html`)
   - Alle **38 kommuner i Trøndelag** tegnet fra lokal GeoJSON.
   - Interaktivt kart med zoom og panorering (mus, touch og tastatur).
   - Regionshint, verifiserte kommunefakta og lagret spillhistorikk.

## Arkitektur og mappestruktur

Appen er bygget som statiske ES-moduler uten byggesteg eller eksterne rammeverk, klar for direkte publisering på GitHub Pages.

```text
iq-app/
├── index.html                      # Forside med fagkort og personlig beste
├── matte.html                      # Hoderegning med pingvin- og isbjørnutfordring
├── geografi.html                   # Trøndelag kartquiz
├── kartquiz.js                     # Kart- og quizlogikk for geografi
├── styles/
│   └── shared.css                  # Felles designsystem, farger og tilgjengelighet
├── js/
│   └── storage.js                  # Trygg localStorage-wrapper med datavalidering
├── data/
│   └── trondelag-kommuner.geojson  # Kommunegrenser for Trøndelag (38 kommuner)
├── tests/
│   └── storage.test.mjs            # Enhetstester (Node.js node:test)
└── package.json                    # Testskript og ESM-konfigurasjon
```

## Kjøre lokalt

Nettlesere blokkerer ES-moduler (`import`/`export`) og `fetch()` over `file://`-protokollen. Start derfor en enkel lokal HTTP-server i prosjektmappen:

```bash
python -m http.server 8000
```

eller med Node.js:

```bash
npx serve .
```

Åpne deretter `http://localhost:8000` (eller adressen som `serve` skriver ut) i nettleseren.

## Kjøre tester

Appen bruker Node.js sin innebygde testkjører (`node:test`) uten eksterne avhengigheter:

```bash
npm test
```

eller direkte:

```bash
node --test tests/*.test.mjs
```

## Datakilde og lisens

Kartdataene for kommunegrenser i Trøndelag (`data/trondelag-kommuner.geojson`) bygger på data fra **Kartverket** via [`robhop/fylker-og-kommuner`](https://github.com/robhop/fylker-og-kommuner), lisensiert under **CC BY 4.0**.
