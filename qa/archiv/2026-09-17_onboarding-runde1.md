# QA-Bericht: Onboarding-Runde 1 (Erstkontakt bis Welle 1)

- **Datum:** 2026-09-17
- **Version/Commit:** v0.0.37 (`a7c136c`)
- **Umgebung:** Chrome 153 (CDP-Bridge, sichtbar, Profil `~/.config/lifeseedlab/mcp-profile`), Dev-Server localhost:5173
- **Ablauf:** Krix-Intro (Notizen 1–3) → Shop-Kauf → Gewächshaus → Loadout → Endlos-Run → Welle 1 → Game Over

## Befunde

> **Repro-Stände nach verschärfter Repro-Disziplin (3×-Regel):** Q1 und Q2 sind
> **vorläufig (1/3)** — Erstbeobachtung ohne formale Zyklus-Wiederholung; Bestätigung
> steht aus (jeweils mit frischem Spielstand + Reload + Cache-Löschung). Q4/Q5 sind
> Last-Level-Effekte ohne Save-Präcondition und in **jedem** Load beobachtet (>3×,
> u. a. in den formalen Q6-Zyklen) — als bestätigt geführt.

### Q1 — Schwere: hoch (Balance/Onboarding) — Repro-Stand: **vorläufig 1/3** — Status: **Fix auf main, 2026-09-17** (grunt damage 4, Welle-1 = 3 Grunts; Gegenprobe Runde 2 positiv)
**Welle 1 tötet einen Erstspieler in ~15 Sekunden.** 20 Leben → 0 trotz dreier
Verteidiger (Spross, Wurzelmauer-Blocker, Keimling). Der 20,5-Zellen-Schlangenpfad
bietet einer Reichweite-3-Pflanze wenig Wirkzeit; Grunts (40 HP, 15 dmg/Schuss)
brauchen 3 Treffer ≈ 3 s pro Gegner bei ~0,6 Zellen/s Laufzeit.
**Erwartung:** Welle 1 mit Minimal-Bau überlebbar. Passt zu den offenen
Balance-Punkten (Kampfwerte/Brutstätte-Einstieg) im quality-spec.

### Q2 — Schwere: mittel (Interaktion) — Repro-Stand: **vorläufig 1/3** — Status: **Fix auf main, 2026-09-17** (releasePointerCapture + touchAction none; Touch-Nachtest durch QA offen)
**Drag-Platzierung wirkt nicht.** Getestet: press→move→release (2 Varianten,
Schritte/Verzögerungen variiert) — keine Platzierung, keine Reaktion. Nur reiner
Tap/Klick auf die Zelle platziert. Tray-Hint verspricht beides („ziehe den Geist
übers Feld — Tap platziert“). Deckt sich mit dem offenen Punkt
„Platzierungs-Zuverlässigkeit am Touch-Pfad“ (B16).

### Q3 — Schwere: mittel (UX-Entscheid prüfen) — Status: **offen** (Design-Entscheidung Eigentümer)
**Tutorial-Overlay blockiert die Menü-Kärtchen**, solange die passende Krix-Notiz
offen ist (Klick auf „Endlos-Modus“ läuft ins Overlay: `data-tut-overlay intercepts
pointer events`). „Überspringen“ verwirft die restlichen Notizen (3→10) komplett.
Prüfen: Ist Verwerfen gewollt, oder sollen geskippte Notizen später auffindbar sein?

### Q4 — Schwere: niedrig (Konsolenhygiene) — Repro-Stand: **3+/3 bestätigt** (tritt in jedem Load auf) — Status: **erledigt** (main, 2026-09-17: Border-Longhands in 5 Komponenten)
**React-Style-Warnung (7× in einer Session):** „Removing borderColor border …
don’t mix shorthand and non-shorthand properties“ — `borderColor` (longhand)
kollidiert mit `border` (shorthand) im Rerender. Wahrscheinlich Toast- oder
Tray-Komponente (Stilkonflikt tritt bei Krix/Toast-Einblendungen auf).

### Q5 — Schwere: trivia — Repro-Stand: **3+/3 bestätigt** (tritt in jedem Load auf) — Status: **erledigt** (main, 2026-09-17: public/favicon.svg)
`favicon.ico` 404 (zwei Requests pro Session).

## Positiv (funktioniert explizit gut)

- Krix-Onboarding ist **kontextabhängig**: Notiz springt automatisch weiter, wenn
  der Spieler die Aktion ausführt (Sprache → Start → Hub).
- Sprachwechsel DE/EN instant und vollständig (inkl. Krix-Texte).
- Shop-Logik korrekt: „Exotisch“ sauber deaktiviert bei 60 Nektar; nach Kauf sind
  alle Buttons korrekt gesperrt. Kauf → neue Sorte sofort in Sammlung (2/3 → 3/4,
  mit „Keim 1“-Etikett).
- **FieldToast mit Ablehnungsgrund** (B22): „Da läuft jemand drüber — hier ist kein
  Platz.“ bei Topf auf dem Gegnerpfad — exakt das spezifizierte Verhalten.
- Game-Over: sauberer Freeze, Platzierung hinter dem Overlay geblockt
  (Freeze-Vertrag hält, vgl. progression.spec).

---
**Status-Update 2026-09-17 (Agent, main):**
- **Q1:** grunt damage 10→4, Welle-1-Grunts fix 3 (`enemies.source.ts`) — Welle 1 ist
  mit Minimal-Bau überlebbar; die 5 Gate-Tests des Leak-Pfads laufen jetzt balance-fest
  über High-Wave-Resume statt Welle-1-Annahmen.
- **Q2:** Wurzelbefund: Tray-Karten erzeugten implizites Pointer-Capture (onPointerDown),
  Drag-Events erreichten den Canvas nie. Fix: `releasePointerCapture` + `touchAction: none`.
  Bitte in der nächsten QA-Runde am Touch-Gerät nachtesten.
- **Q4:** border/borderColor-Mix in Greenhouse, PlacementTray, BeetleLab, Codex, GameOverlays
  auf Longhands umgestellt — die Warnung ist weg.
- **Q5:** `public/favicon.svg` + `<link rel=icon>` — 404 behoben.
- **Q3:** offen — Skip-Verhalten der Krix-Notizen ist eine Design-Entscheidung des Eigentümers.
- Zusätzlich auf main: D1 (Maze rechnet Route sofort bei Platzierung) und D2 (Leih-Spross
  im Run platzierbar) — Befunde aus der eigenen Drift-Analyse, nicht aus diesem Bericht.
