# Nachverifikation DEV-Fix `63222e5` — N4/F5/F6/Q16/Q17 + Reifungszähler-Drift

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbares Chrome, MCP-Bridge) · **Viewport:** 1280×860 + Mobile 390×844
**Version:** v0.0.50 · **main:** `63222e5` · **Worktree beim Test:** `main` (Titel-Check bestanden)
**Anlass:** DEV hat die fünf offenen Befunde (N4, F5, F6, Q16, Q17) plus den Meta-Drift im
Reifungszähler gefixt. Auftrag: Wirksamkeit im Spiel zeigen — Gameplay, Determinismus,
UI/UX, Persistenz — mit echter Maus, Frisch-Profilen, Release-Fläche (ohne `?dev=1`).
**Methode:** 3 vollständige Frisch-Zyklen (Onboarding → Run → Endpfad) + 1 Mobile-Durchlauf +
1 gezielte Blasen-Probe. Sim-Werte über `__simRootRef`, Klicks ausschließlich echte Pointer.

---

## Urteil (eine Zeile)

**Alle fünf Befunde sind im Spiel wirksam behoben; der Reifungszähler ist auf beiden
Endpfaden (GAME_OVER und Exit Run) exakt.** Kein neuer Befund auf FIX-Niveau — zwei
Fußnoten (F6a-Geometrie, Blasen-Mindestgröße) und eine Erwartungsfrage (Mobile-Tutorial-
Blende) unter „Offene Fragen“.

---

## 1. Befund-Nachverifikation (je 3 unabhängige Frisch-Zyklen)

### N4 — Erst-Hinweis-Leiste hängt ÜBER der Tray-Kante ✅ 3/3

| Zyklus | Leiste (y) | Tray-Karten (y) | Überlappung |
|---|---|---|---|
| 1 | 626–688 | 744.8–811 | **0 px** |
| 2 | 626–688 | 744.8–811 | **0 px** |
| 3 | 626–688 | 744.8–811 | **0 px** |

Identisch mit dem DEV-Vertrag (bottom 84→172, `gameViewStyles.firstRunHint`): die
Kartenreihe ist vollständig sichtbar und klickbar. Zusätzlich bestätigt: Leiste ist
`pointer-events: none` (kann auch bei späteren Layouts nicht klicken).

### F5 — Blase im Cue-Modus komplett durchlässig ✅ 3/3 (+ gezielte Probe)

| Zyklus | Blase | Rahmen-PE | Overlap Blase ⇄ Ziel-Karte | 9-Punkte-Matrix auf der Karte |
|---|---|---|---|---|
| 1 | 473,401 · 334×147 | `none` (nur Skip=auto) | **0 px** | 8/9 CARD, 1/9 Nachbar (Kantenstreifen, s. F6a) |
| 2 | 473,401 · 334×147 | `none` | **0 px** | identisch |
| 3 | 452,377 · 376×195 (expandiert) | `none` | **0 px** | identisch |

- Die 2529-px²-Verdeckungszone der F2-Regression ist **weg** — Blase und Ziel-Karte
  überlappen sich nicht einmal mehr zufällig.
- **Gezielte Probe (Frisch-Zyklus 4, 5 Punkte in der Blasen-Fläche inkl. Textmitte):**
  alle 5 Element-Ketten enden auf CANVAS/Overlay-DIV — **kein einziges pe:auto-Element
  der Blase außer dem Skip-Button**. Der früher im expanded-Zustand gesehene pe:auto-Knoten
  (Blasen-Zyklus 3) ist im cueMode nicht vorhanden.
- **Skip bleibt klickbar** (einzige interaktive Fläche, getestet im Fluss: Notiz 5→6
  über Brett-Tap, Skip nie benötigt — Button aber klickbar und beschriftet).
- Notiz 3 (Endless-Button): **9/9 Treffer auf dem Button** — auch die vorige Rand-Verdeckung
  der Notiz-3-Blase ist weg.

### F6 — Karten-Reihen: keine Verwechslungs-Käufe ✅ wirksam, eine Geometrie-Fußnote

Verhalten (3/3 Zyklen, identisch):
- Sim bleibt bei Rand-Klicks **unangetastet**: Energie 150, kein Kauf, kein Platzieren.
- Rand-Klick in den Überlappungsstreifen wählt nur die **Auswahl** des Nachbarn (gratis,
  umkehrbar), die korrekte Karten-Mitte wählt die Leihe — Auswahl-Hygiene greift genau
  wie im DEV-Vertrag (`aria-disabled` + Controller): **kein verdeckter Echtgeld-Kauf mehr
  möglich** (die Eskalationsstufe von Verifikation V ist tot).
- **Fußnote F6a (NEU, kosmetisch→leicht):** Die Leihe-Karte (Rechtskante x=841.7) überragt
  ihren Sektions-Container (PFLANZEN-Reihe endet x=816) und überlappt die FELD-Sektion um
  **~9,7 px** — der äußerste rechte Kartenstreifen gehört geometrisch zur Nachbar-Karte
  (Blumentopf), obwohl visuell die Leihe gezeichnet ist. Der 10-px-Streifen ist real
  (3/3 gemessen), aber folgenlos (Auswahl gratis, kein Kauf). Vorschlag an den DEV:
  Karten-Reihe mit `min-width:0`/flex-shrink oder 2 px Gap-Zuschlag dichten — oder
  bewusst akzeptieren.

### Q16 — Brett-Tap während des Hold platziert, Signal springt ✅ 3/3

| Zyklus | Brett-Tap | Sim nach Tap | Notiz |
|---|---|---|---|
| 1 | Zelle (5,4) | plants 1, Leihe 1→0, Energie 150 (gratis) | **5 → 6** |
| 2 | Zelle (5,4) | identisch | **5 → 6** |
| 3 | Zelle (5,4) | identisch | **5 → 6** |

Der alte Zustand („Hold schluckt Brett-Taps lautlos, Notiz bleibt 5/10") ist reproduzierbar
weg. Der Command-Flush vor dem Tap wirkt; das Onboarding-Signal zählt die echte Decision.

### Q17 — ×0-Karten echt disabled, kein pressed-Zombie ✅ 3/3

- Alle ×0-Karten (Spross/Root Wall/Mycelium) tragen `aria-disabled="true"` (3/3 Zyklen
  identisch); Tap auf die eigene leere Karte: keine Auswahl, kein Zombie, keine Reaktion.
- Nach der letzten Leihe-Platzierung: Auswahl automatisch gelöst (`pressed` leer) — 3/3.
- Kein no_inventory-Toast nötig getestet: die ×0-Karte nimmt den Tap gar nicht erst an
  (stärker als die geforderte Toast-Richtung — DEV hat die Wurzel statt des Symptoms gedichtet).

---

## 2. Reifungszähler-Drift (Meta-Pfad) ✅ 3/3 auf BEIDEN Endpfaden

| Zyklus | Endpfad | erreichte Welle | Meta danach (`lifegamelab_meta.data`) |
|---|---|---|---|
| 1 | **GAME_OVER** (Welle 2 leakt, lives→0) | 2 | `totalWavesSurvived: 2` · `runs: 1` · `bestWave: 2` |
| 2 | **Exit Run** (manueller Abbruch in Welle 2) | 2 | `totalWavesSurvived: 2` · `runs: 1` · `bestWave: 2` |
| 3 | **GAME_OVER** (Welle 2, Auto-Waves) | 2 | `totalWavesSurvived: 2` · `runs: 1` · `bestWave: 2` |

Der frühere Doppelzähler (Abbruch Welle X = +2X) ist tot: `countRun` bucht nicht mehr,
`WAVE_STARTED` ist die einzige Quelle. Nektar blieb in allen Läufen unverändert (40) —
auch der GAME_OVER-Pfad zahlt keinen Bonus (konsistent mit Verifikation III).

---

## 3. Determinismus-Linse ✅ (Frisch-Runs bit-konsistent)

- **Welle 1 in allen 3 Zyklen: exakt 3 Gegner, Start-HP alle 46** — gleicher Seed-Pfad,
  keine Streuung. (Loop 1 zeigte 3×46 beim ersten Poll, Loop 2/3 identisch.)
- **Startökonomie identisch:** Frisch-Profil → Energie 150, Inventar `{loan_sprout: 1}`,
  Welle 0/prep. Welle-1-Bonus +30 (150→180) in jedem Lauf.
- **Leihe-Platzierung gratis** (Energie bleibt 150) — konsistent mit D2b/Loadout-Kontrakt.
- Ein Poll-Artefakt, kein Spiel-Befund: der Gegner-Snapshot zeigte `x/y: null` im
  ersten 100-ms-Poll (Felder des Gegner-Objekts heißen anders als erwartet) — HP/kinds
  waren vollständig; nach einem Sim-Zyklus war das Objekt regulär lesbar. Kein
  Determinismus-Verdacht, reine Auslese-Timing-Frage (Messhygiene-Fußnote).

## 4. UI/UX-Linse

- **Desktop 1280×860:** Onboarding-Fluss (Notiz 1→2→3→4→5→6) in jedem Frisch-Zyklus
  ohne Hänger; Cue-Ziele frei; Skip erreichbar; Tray vollständig sichtbar.
- **Mobile 390×844 (Warteschleifen-Aspekt):** `overflowX: 0`, Canvas 366×695 sauber
  gedockt, **Leiste (y 534–672) und Blase (y 359–612) verdecken die Kartenreihe (y 728.8)
  nicht** — N4/F5 wirken mobil ebenso. Platzierung mobil bestanden (Zelle (5,4)-Pendant,
  plants 1, Leihe konsumiert, kein Zombie). Kein horizontaler Scroll, kein verdeckter
  Skip. Die Q10-DevGate-Fußnote war nicht relevant (Release-Fläche).
- **a11y (Fix-Nebenwirkung geprüft):** Close-Knöpfe von Greenhouse **und** Seed Shop
  tragen `aria-label: "Close"` (DEV-Claim aus `63222e5` bestätigt, DE/EN-Keys wirken).
- **F4 i18n (Pflichtpunkt aus dem Wirksamkeits-Check):** Sprachwechsel → Tray komplett
  deutsch („Spross, Wurzelmauer, Myzel, **Leih-Spross**, Blumentopf, Weg, Findling, Deko“)
  plus deutsche Hint-Leiste — F4 ist damit **im Spiel wirksam** (war dort „⏳ offen“).

## 5. Konsolenhygiene

Komplette Session (5 Frisch-Zyklen + Mobile): **nur die bekannte Q5-React-border-Warnung**
(`Removing borderColor border`, 3×). Kein Fehler, keine neue Warnung, favicon-404 wie
bekannt nicht neu.

---

## Positiv-Liste (explizit funktioniert)

- N4-Leiste-Position (3/3, Desktop UND Mobile)
- F5 Blasen-Durchlässigkeit inkl. expanded-Zustand (3/3 + 5-Punkte-Probe)
- F6 Auswahl-Hygiene: kein verdeckter Kauf, Sim unangetastet (3/3)
- Q16 Brett-Tap im Hold + Notiz-Sprung (3/3)
- Q17 ×0 disabled + Auto-Löse nach letzter Einheit (3/3)
- Reifungszähler exakt auf GAME_OVER UND Exit Run (3/3)
- Determinismus: Welle 1 = 3 Grunts à 46 HP in jedem Frisch-Lauf
- F4-Tray-i18n DE vollständig (inkl. „Leih-Spross“)
- Mobile 390×844 ohne Overflow/Verdeckung
- a11y Close-Buttons beschriftet

## Offene Fragen (Aktion: DEV)

1. **F6a (leicht):** Leihe-Karte überragt die PFLANZEN-Reihe um ~9,7 px in die FELD-Sektion
   (3/3 gemessen, Desktop). Folgelos, aber geometrisch falsch — dichten oder akzeptieren?
2. **Blasen-Mindestgröße (Fußnote):** In Notiz 4 war die Blase im expandierten Zustand
   376×195 (Zyklus 3) vs. 334×147 (kollabiert, Zyklus 1/2) — der cueMode-Vertrag hält in
   beiden Fällen (PE none), die Größe schwankt aber mit Textlänge. Absicht?
3. **Mobile-Tutorial-Blende:** Auf 390×844 lag die Notiz-4-Blase (y 359–612) über dem
   oberen Brettdrittel — klickdurchlässig (F5), aber der Spieler sieht das Feld hinter
   halbdurchlässigem Text nicht. Eigene Bewertung nötig, oder bewusste Kompromissfläche?

## Index-Status (in README.md gepflegt)

Neue Zeile für diesen Bericht (Status: in-arbeit bis DEV-Reply auf die 3 Fragen).
Die fünf Alt-Befunde (N4/F5/F6/Q16/Q17) sind mit DEV-Statuszeilen in ihren Berichten
versehen (bab434d) — dieser Bericht liefert die geforderte Spiel-Nachverifikation.

## Messhygiene (für Nachfolger)

- `PRESS HERE`-Klick landet bei 1280×860 exakt auf dem Start-Button (540,415+27) —
  der Blasen-Cue ist dort überflüssig aber harmlos (PE none).
- Mobile Brett-Taps: (180,300)/(180,500)/(100,400) = Weg-Rejects (korrekt abgelehnt,
  lautlos ohne Toast — akzeptiert, da Q17-Familie nur Tray-Karten betrifft); (260,550)
  = freie Zelle, platziert. Zellwahl mobil über Kartenreihen-Boxen nachmessen, nicht raten.
- Sim-Objekt: `state.enemies[i].hp` stabil; `kind/type/x/y` heißen anders — zuerst
  `Object.keys` lesen.
