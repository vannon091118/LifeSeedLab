# Spielfluss-Audit — Frisch-Spieler-Perspektive (v0.0.38, ae64493)

**Datum:** 2026-09-17 · **Gerät:** QA-Gerät, sichtbares Chrome 153 via MCP-Bridge
**Version:** v0.0.38 · **Commit:** `ae64493` (main) · **Fläche:** Release (ohne `?dev=1`), frisches Profil
**Perspektive-Wechsel:** Dieser Bericht sucht **keine Bugs**, sondern Spielfluss-Brüche und
Agenten-Drift („fühlt sich falsch geplant an“). Bewertungshoheit liegt beim DEV/Eigentümer —
die Befunde unten tragen deshalb **offene Fragen**, keine endgültigen Urteile (AGENTS.md
Punkt 2: Team-Kommunikation über den Branch).

---

## Ablauf der Session

Frisches Profil (Cache-Löschung), kompletter Walkthrough der beabsichtigten Kette:
Start → Krix-Notizen → Hub → Run → Tray/Tutorial → Skip. Alle 10 Krix-Notizen-Bühnen
angesehen, Tutorial-Skript (src/components/tutorial/script.ts) nur lesend konsultiert,
um Soll-Verhalten von Ist-Verhalten zu trennen.

## Befunde (Spielfluss-Linse, jeweils mit Drift-Verdacht)

### F1 — Krix-Box: Klick expandiert nur, schaltet nie weiter

**Was passiert:** Die Sprechblase ist als Button gerendert mit Cursor-Pointer und Titel
„Tap for the whole text“. Ein Klick (echter Mausklick, mehrfach, Positionen variieren)
klappt den Text aus/ein — aber schaltet **niemals** zur nächsten Notiz. Vorankommen tut
man nur durch die Aktion, die die Notiz verlangt (Notiz 1: Sprachwahl — wobei sogar ein
überflüssiger Re-Klick auf die bereits aktive Sprache zählt).

**Warum es sich falsch anfühlt:** Der gesamte Hintergrund-Text der Notiz 1 („I prepared
ten field notes. First the hub, then the field…“) kündigt einen geführten Rundgang an —
aber der Spieler, der die Box antippt (die offensichtlichste Interaktion auf einem
gefüllten Text), bekommt kein Vorwärtskommen, kein Feedback, keine Erklärung. Das
„Tap for the whole text“-Verhalten widerspricht der Erwartung „Tap = weiter“.

**Quelle (lesend):** script.ts Notiz 1 (`ankunft`, `advanceOn: 'langChosen'`); das
Bubble-Button-Verhalten kommt aus TutorialOverlay.tsx/SpeechBubble.tsx (Expandieren).

**Offene Frage (Aktion: DEV):** Ist „Blase antippen = Text aufklappen, nie weiterschalten“
gewollt? Wenn ja: fehlt ein sichtbares „Wie geht's weiter“-Signal (z. B. Puls auf dem
Sprach-Button oder ein „→“-Hinweis), damit der Erstspieler die passende Aktion erkennt?

### F2 — Krix-Blase blockiert die geführte Ziel-Karte im Hub (Notiz 3)

**Was passiert:** Notiz 3 (`labor`) erklärt die Hub-Karten. Der einzige durchgelassene
Klickpfad laut Skript ist die Endlos-Karte (`cue: 'endless'`). Aber die Krix-Blase —
die ja Events annehmen muss, damit „Tap for the whole text“ funktioniert — lag in
Zyklus 1 **genau über** dieser Karte: normaler Klick ging nicht durch (Playwright:
„intercepts pointer events“), erst nach dem Einklappen der Blase funktionierte der Pfad.

**Warum es sich falsch anfühlt:** Das Overlay-Rahmen-Konzept („Rahmen ist
pointer-events:none, der Spieler drückt die ECHTEN Knöpfe“, Kommentar in
TutorialOverlay.tsx) wird von der expandierenden Blase unterlaufen — die Blase ist
Teil des Rahmens, nimmt aber Zeiger an und steht im Weg des geführten Ziels.

**Repro-Stand:** 1/3 (Zyklus 1 blockiert, Zyklus 2/3 nicht blockiert — Positionsabhängigkeit
der Blase). **Als „fühlt sich falsch an“ gemeldet, nicht als fixer Bug** — die Blasenposition
hängt vom Viewport ab; bei 1280×860 traf sie die Karte.

**Offene Frage (Aktion: DEV):** Soll die Blase bei „cue“-Schritten pointer-transparent
werden (nur der Titel-Button behält Events), oder ist die aktuelle Gefahr akzeptiert?
Ggf. Auto-Kollaps der Blase bei cue-Schritten?

### F3 — Notiz 4 verlangt „tap the blinking card“, aber es gibt keine (Deadlock mit Skip als Ausweg)

**Was passiert:** Nach dem Endlos-Start zeigt Notiz 4 (`karte`): „Now tap the blinking
card“. Auf dem Frisch-Profil existiert das Blink-Ziel **nicht**: `data-tut="card"` wird
nur auf der ersten Karte **mit Bestand** gesetzt (`PlacementTray.tsx: firstPlayable`).
Alle Karten stehen auf ×0 (der Leih-Spross aus `beginRun` erreicht den Tray nie —
Strukturbefund im Archiv: `qa/archiv/2026-09-17_q12-leihspross-tray.md`, 3/3). Die
geforderte Aktion ist unausführbar; ich habe nur per „Skip“ weiterkommen können.

**Warum das fast sicher anders geplant war:** Notiz 4 wurde zusammen mit dem
Blink-Ziel-Design geschrieben (B21: „Die ERSTE Karte mit Bestand ist das Cue-Ziel“).
Der Einstiegs-Loop desselben Commits (Leih-Spross statt Startpflanzen) hat diese
Prämisse still gebrochen: Krix verspricht eine Karte, die es nicht gibt. Das ist
Agenten-Drift im Reinstilz — zwei sauber getestete Features, die sich gegenseitig
erledigen.

**Repro-Stand:** 3/3 (drei Frisch-Zyklen: Notiz 4 erscheint, Blink-Karte fehlt,
Skip nötig).

**Offene Frage (Aktion: DEV):** Bestätigt die Diagnose? Der Leih-Spross-Fix (Q12) würde
auch diesen Deadlock heilen — alternativ müsste Notiz 4 umgeschrieben oder der
„card“-Cue auf den Nachkauf-Knopf („Spross +100⚡“) umgelenkt werden. Welche Richtung
ist gewollt?

### F4 — Tray-Labels bleiben deutsch bei englischer UI

**Was passiert:** Bei gesetztem EN zeigt die Platzierungsleiste deutsche Labels:
„Spross“, „Wurzelmauer“, „Myzel“, „Blumentopf“, „Weg“, „Findling“, „Deko“ (+ Nachkauf-
Karten). Der Rest der UI (Start, Hub, Shop, Brutstätte, Codex, HUD, Game Over) ist
vollständig übersetzt — i18n-Parität 15/15 Karten im Hub wurde separat verifiziert.

**Quelle (lesend):** `PlacementTray.tsx` liest `label` direkt aus `PLANTS_SOURCE`/
`MAP_TILES_SOURCE` (Content-Truth, deutsch) — ohne i18n-Schicht.

**Warum es sich falsch anfühlt:** Der Spieler liest im selben Screen Krix auf Englisch
(„Your seed cards… The sprout shoots“) und darunter „Spross×0“. Die Notiz-Texte reden
über dieselben Objekte mit englischen Namen — die Vokabeln passen nicht zusammen.

**Offene Frage (Aktion: DEV):** Gewolltes Design (Content-Truth bleibt deutsch, bewusst)
oder vergessene i18n-Fläche? Falls Übersetzung gewünscht: Die Labels kommen aus der
Source — dann gehört die Entscheidung in die Source (i18n-Keys statt Label-Feld) und
betrifft auch Tooltip/Titel der Karten.

## Positiv-Liste (Spielfluss funktioniert)

- **Krix-Fortschritts-Design ist stark**, wenn es greift: Notiz 1→2→3→4 führen konkret
  (Sprache → Start-Knopf → Hub → Karte), jede Notiz bezieht sich auf das, was auf dem
  Schirm liegt.
- **Der geführte Pfad Hub→Endlos→Feld funktioniert in 2 von 3 Zyklen ohne Reibung**
  (Overlay-Durchlässigkeit der Cue-Karte ist implementiert und wirkte in Zyklen 2/3).
- **Frisch-Ökonomie liest sich stimmig:** Nektar 40 (= genau ein Samen), Sammlung 0/3,
  keine Fortsetzen-Karte, Bestwelle/Läufe auf 0.
- **Sprachumschaltung instant und vollständig** auf allen Nicht-Tray-Flächen (DE↔EN).
- **Skip existiert** und rettet den Deadlock (F3) — besser als eine Sackgasse.

## Team-Kanal

**An den DEV-Agenten:** Die vier Fragen oben (F1–F4) brauchen eure Design-Bewertung.
Antwortformat: Status-Commit auf `qa-reports` (`docs(qa): status …`) plus Antwort-Sektion
im Bericht, oder direkt beim Eigentümer rückkoppeln. Wir verifizieren danach im Spiel und
setzen die Endstatus.

**Archiv-Hinweis:** Die bisherigen Befunde Q1–Q12 liegen unter `qa/archiv/` (Index dort
geführt). Q12 ist für F3 der Kontext — bitte beim Fix zusammen denken.

**Umfeld-Status:** `origin/main` stand während der ganzen Session bei `ae64493` (kein
neuer Commit sichtbar, 4-facher Fern-Poll bestätigt). Falls der Eigentümer einen neuen
Commit gesehen hat, der noch nicht auf GitHub liegt: Diese Befunde beziehen sich auf
`ae64493` — nach Pull bitte Status-Abgleich.
