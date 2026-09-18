# Verifikation IV — Runde 3: Tutorial-Hold-Q16, N4/N5-Messung, F6-Zyklus 3 (v0.0.49, `6bbf286`)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbarer Chrome via Playwright-Bridge, echte Maus-Klicks `page.mouse.*`)
**Methode:** Abholprotokoll (kein neuer main-Commit seit `6bbf286`) → frisches Profil → Onboarding real durchspielen → Koordinaten-Klicks mit Renderer-Geometrie → Source-Gegenprüfung (nur lesen).

---

## 1. Q16 (neu, 2/3 — Verdacht: UI/Sim-Divergenz während des Tutorial-Holds)

**Beobachtung:** Während **Feldnotiz 5** („pflanzen"-Schritt, `hold:true`) akzeptierte die Platzierungs-UI
Taps nicht sichtbar: Auswahl-Karte blieb `pressed=true`, Canvas-Klicks auf statisch freie Zellen
(108 von 144 laut Regel-Scan, z. B. (6,3) d=2.24) erzeugten wiederholt den Toast
**„Someone walks here — no room."** (`field.reject.on_path`) — trotz Ghost sichtbar, Crosshair aktiv,
Inventar `loan_sprout×1`, Energie 150. Nach **Skip der Notiz** plötzlich: Status
`50 20 Wave 0 PATH QUALITY 100%`, Karte `loan_sprout×0` — **die Leihe war längst platziert**, die
Ablehnungs-Zustände (Toast/pressed) hatten weiter gelebt.

**Source-Beleg (nur gelesen):** `controller.ts:76-82` — `hold:true` stoppt die Sim
(`gameRuntime.ts:224`: `if (!paused && !holdRef.current) root.advance(dt)`). Gleichzeitig läuft
`PlacementController` (UI-Layer) weiter und beantwortet `drop()` mit Regeln gegen den **eingefrorenen**
Sim-Snapshot. Die Ablehnungs-Events entstehen also im UI gegen einen Stand, der nicht mehr tickt.
Zusätzlich: der zuerst gemeldete Toast passte **nicht** zur Zelle (statisch d=2.24 ⇒ nie `on_path`) —
der Toast des vorherigen Drags blieb stehen (Toast-Ablauf während Hold ungeklärt).

**Konsequenz (DEV-Frage, nicht Fix):** Ist die Ablehnungs-Anzeige während `hold:true` bewusst
eingefroren (Sim steht, UI zeigt alt) oder soll der Hold nur den Wellen-Takt stoppen, nicht die
Platzierungs-Verarbeitung? Spieler-Erlebnis: „Ich tippe, nichts passiert, Toast lügt" — genau die
Spielfluss-Klasse, die der Eigentümer meint.

## 2. N4 (Eigentümer-#1) — dritte Messung, Verdeckung präzisiert

- Leiste `[309..927 × 580..642]`, `pointerEvents:none`, liegt **31 px** auf der oberen Kartenhälfte
  (`611..677`) — visuell bestätigt am Screenshot („Tap a plant below…"-Blase überdeckt Kartenköpfe).
- **Interaktiv bleibt frei** (pointer-events:none): echter Klick auf die verdeckte Kartenmitte
  wählte korrekt aus (`pressed=true`). N4 bleibt ein **visueller** Befund (3/3), kein Interaktions-Bug.
- Neu: Bei **breitem Viewport** überlappen PLANTS- und FIELD-Reihe **sich gegenseitig**: die
  `loan_sprout`-Karte ragt 57 px in den FIELD-Container, `Blumentopf` rendert ~41 px über der
  Leihe (elementFromPoint belegt: Klick auf Leihe-Rechtszone trifft Blumentopf).

## 3. F6 — Zyklus 3 mit echter Maus (jetzt 3/3, Formalisierung)

| Zyklus | Geometrie | Klick auf verdeckte Ziel-Zone | Ergebnis |
|---|---|---|---|
| 1 (17.09, Preview) | schmal, Notiz-4-Blase | unten-rechts der Leihe | **Blumentopf** `pressed=true`, Ziel `false` |
| 2 (17.09, Verifikation II) | schmal, Notiz-4-Blase | identisch | **Blumentopf** `pressed=true`, Ziel `false` |
| 3 (heute, breit) | PLANTS/FIELD-Überlappung | Leihe-Rechtszone (830,665) | **Blumentopf** `pressed=true`, Ziel `false` |

**F6 = 3/3:** Klicks auf von Blase/Reihen-Überlappung verdeckte Karten-Zonen wählen die
**verdeckende** Karte (Nachbar/überlappende Karte) — zwei verschiedene Verdeckungs-Ursachen,
dasselbe Spieler-Ergebnis: man wählt versehentlich um. Fix-Richtung für den DEV: Karten-Reihen
nicht überlappen lassen (Container-Overflow) + Blasen-Cue-Zonen respektieren.

## 4. Beobachtung B (leere Route nach Resume) — 2. Messung

Nicht repliciert in dieser Runde: `PATH QUALITY 100%` stand direkt nach Skip im HUD, Route aktiv.
Status bleibt **0/3** (Kandidat, kein Befund). Der erste Messwert (Verifikation II) bleibt als
Einzelmessung dokumentiert.

## 5. Sonstige Beobachtungen (ehrlich, klein)

- **Karten-Press-State hinkt:** nach Placement blieb `pressed=true` sichtbar, obwohl Inventar
  `×0` und Karte disabled war (blinkender „ausgewählt"-Zustand bei leerer Karte). → Kandidat Q17 (0/3).
- **DevOverlay verdeckt Nachkauf-Buttons** bei `?dev=1` (Messumgebung, nicht Release).
- **Onboarding-Skip-Schleife:** Skip setzt Tutorial terminal (Quelle: `skip()`), aber mein
  Notiz-1-„Deutsch"-Klick wurde vom Blasen-Hit-Test verschluckt — Workaround über Event-Dispatch
  nötig (nur im Test relevant, echte Maus klickt die Sprache, siehe Runde-2-Bericht).

## Build/Tests

`tsc -b --noEmit` → **0 Fehler** · `persistence_resume.test.ts` + `maze_loan.test.ts` → **8/8 grün**
(Projekt-Code unverändert — QA-Runde ändert keinen Code).

## Nächste Schritte (Team-Kanal)

1. **Q16 (2/3):** Zyklus 3 = identischer Ablauf; danach Status setzen. DEV-Frage nach Hold-Semantik.
2. **F6 (3/3) → Status `neu`/`in-arbeit` für DEV** mit Fix-Richtung (Reihen-Überlappung + Blasen-Zonen).
3. **N4 (3/3)** wartet unverändert auf DEV-Fix (Leiste über Tray) — Priorität HOCH.
4. Q17-Kandidat (pressed-State bei leerer Karte) auf 3 Zyklen prüfen.
