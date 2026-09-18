# Verifikation V — Q16 3/3, Q17 (pressed-Zombie), Energie-Spur des Hold-Laufs (v0.0.49, `6bbf286`)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbarer Chrome, echte Maus via `page.mouse.*`) · **Vorgänger:** Verifikation IV

---

## 1. Q16 — Zyklus 3 abgeschlossen: **3/3, Befund bestätigt**

Kontroll- und Experiment-Lauf in einer Session (frisches Profil, echter Onboarding-Pfad bis Notiz 5):

| Phase | Beobachtung |
|---|---|
| **Kontrolllauf (Tutorial gescippt, kein Hold)** | Leihe wählen → Zelle (6,3) → **sofort platziert** (`loan_sprout×0`, PATH QUALITY 100%). Platzierungs-Pfad selbst ist gesund. |
| **Notiz-5-Hold aktiv** | Auswahl `pressed=true` ✓, Zell-Taps auf **fünf** statisch freie Zellen (6,10 / 7,10 / 0,10 / 2,8 / 9,9): **kein Toast, keine Platzierung, Notiz 5 bleibt** — die Taps werden still konsumiert. Canvas laut `elementFromPoint` frei erreichbar (hit: CANVAS), Cursor `crosshair`, Ghost aktiv. |
| **Nach Skip der Notiz 5** | Der **nächste** Zell-Tap platziert sofort (`loan_sprout×0`). |

**Interpretation (verschärft gegen IV):** Während `hold:true` werden Brett-Taps **still geschluckt** —
ohne Ablehnungs-Toast, ohne Sim-Effekt. Der on_path-Toast aus Runde IV war ein Folge-Artefakt
(verdeckter Karten-Klicks + Toast-Restlauf), nicht die Kernursache. Beobachtung aus IV
(„UI lehnt ab, obwohl platziert") bleibt als Nebenaspekt stehen; die Kern-Mechanik ist:
**Hold schluckt Brett-Eingaben lautlos.** Für den Spieler fühlt es sich an wie „das Spiel ist kaputt" —
exakt die Klasse, die der Eigentümer jagen lässt.

**DEV-Frage (Team-Kanal):** Soll der Hold nur den Wellen-Takt anhalten (`root.advance`) — nicht die
Eingabe-Verarbeitung? Oder soll die UI während Hold Taps sichtbar ablehnen („Erst weiterlesen")?

## 2. Energie-Spur des Hold-Laufs (Beinahe-Phantom aufgelöst)

Vor Skip: 150⚡. Nach Skip+Tap: **30⚡** — Differenz 120 = **1× Myzel-Nachkauf (80)** + …
Inventar-Audit deckt auf: `Myzel×1` erschienen, `Wurzelmauer×0` unverändert, plus ein **zweiter**
unbeabsichtigter Kauf. Ursache: Meine Hold-Zell-Taps trafen während der Blasen-Geometrie teils die
**darunterliegenden Nachkauf-Buttons** (F6-Familie: verdeckte Karten-Zonen). Die 3×-Regel hat also
auch diesmal gegen mich selbst gearbeitet: Kein Ökonomie-Bug — **F6-Verdeckung + Kauf-Buttons in
Klick-Reichweite der Karten** erzeugen unbeabsichtigte Käufe. Das ist die scharfste bisherige
Ausprägung von F6: **verdeckte Zonen führen zu Echtgeld-Käufen** (Energie), nicht nur zu
Auswahl-Wechseln.

## 3. Q17 (neu, 2/3) — „Auswahl-Zombie" bei leerer Karte

| Zyklus | Aktion | Beobachtung |
|---|---|---|
| 1 | Klick auf `Spross×0` (Karte **nicht** disabled!) | `pressed` bleibt `false`, **aber**: Cancel-Button erscheint, Canvas-Cursor `crosshair` — ein Ghost ist aktiv ohne sichtbare Auswahl |
| 2 | Zell-Tap mit diesem Zombie-Ghost | Kein Toast, keine Platzierung, keine Änderung — stiller Konsum |
| 3 | Erneuter Karten-Klick (Toggle-Test) | Zustand unverändert (`pressed=false`, Cancel bleibt) — kein Toggle, kein Ausweg außer ✕/Abbrechen |

Source-Beleg (nur gelesen): `PlacementTray.tsx:48` — der `onPointerDown`-Handler übergibt
`(id, count)` ungefiltert; `selectFromTray` bricht bei `count <= 0` ab — **aber der Tray rendert die
Karte klickbar** (`disabled=false` bei ×0). Der Ghost-Zustand (Cancel + crosshair) kommt vermutlich
aus der vorherigen Auswahl, die der ×0-Klick nicht sauber umschaltet. DEV-Fix-Richtung: Karte bei
Bestand 0 deaktivieren (wie die Basis-Karten im ersten Run-Zustand) oder Klick auf ×0-Karte als
Abbruch interpretieren.

## 4. Q15-Nebenfund bestätigt (Kontext aus Runde 2)

`loan_sprout+100⚡` (Leihe-Nachkauf) existiert und ist klickbar — der Nachkauf-Versuch in diesem Lauf
buchte allerdings nicht sichtbar (Energie unverändert beim Klick; Kartenzahl `×0` blieb). Q15 bleibt
als Design-Frage an den DEV stehen: **Darf die Krix-Leihe überhaupt nachkaufbar sein?**

## 5. Umgebung/Build

- Konsole des sichtbaren Chrome über die gesamte Session: **0 Fehler** (Log geprüft).
- `tsc -b --noEmit` → **0 Fehler** · `components_tutorial.test.ts` → **26/26 grün**.
- Spiel-Code unverändert (Report-only-Regel).

## Offene Posten für den DEV (Priorität)

1. **F6 (3/3, eskaliert):** Verdeckte Karten-Zonen lösen **Echtgeld-Käufe** aus (Myzel-Nachkauf unbeabsichtigt). Fix: Reihen-Überlappung entfernen, Nachkauf-Buttons aus der Trefferzone der Karten, Blasen-Zonen respektieren.
2. **Q16 (3/3):** Hold-Semantik klären — Eingaben während Notiz-5 entweder sichtbar ablehnen oder verarbeiten.
3. **Q17 (2/3):** ×0-Karten deaktivieren oder Klick als Abbruch; Zombie-Ghost auflösen.
4. **N4 (3/3):** unverändert offen (Leiste über Tray).
