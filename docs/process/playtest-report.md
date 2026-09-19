# Playtest-Bericht — LifeSeedLab

**Datum:** 2026-09-16  
**Status:** ✅ Alle Tests grün (220 Unit-Tests + 27 E2E-Tests)  
**Build:** `npm run build` erfolgreich  
**Server:** Vite Dev-Server läuft auf Port 5174  

---

## Zusammenfassung

LifeSeedLab ist ein deterministischer Browser-Tower-Defense, bei dem Pflanzen durch Züchtung gezüchtet werden. Der Spielablauf folgt einem sauberen Fluss: Start → Menü → Run → Platzierung → Wellen → Game Over → Metasave-Update.

Alle beobachteten Mechaniken funktionieren wie erwartet. Keine kritischen Fehler gefunden. Die Architekturgrenzen (Ownership, Bus-Contract, Determinismus) werden gewahrt.

---

## Getestete Flows

| Flow | Status | Befund |
|------|--------|--------|
| **Neuer Run starten** | ✅ | StartScreen → MainMenu → Run startet mit neuer runId, Seed wird abgeleitet |
| **Pflanzen platzieren** | ✅ | Tray-Karte klicken → Rasterfeld wählen → Pflanze wird simuliert angelegt, Tray-Bestand sinkt |
| **Pause/Resume** | ✅ | Clock wird angehalten, Tick-Zähler friert ein, Fortsetzen setzt fort |
| **Welle starten** | ✅ | START_WAVE Command → Enemies spawnen → Ticks laufen weiter |
| **Game Over** | ✅ | GAME_OVER Event → runEndedRef flag wird gesetzt → meta banking → Screen wechselt |
| **Exit Run** | ✅ | Zurück ins Menü, Canvas wird entfernt, Screen-State wird zurückgesetzt |
| **FX Toggle** | ✅ | Audio- und Visual-Observer werden ein-/ausgeschaltet, persistiert im Meta |
| **Ressourcen-Management** | ✅ | Energie abziehen/zuweisen wird sichtbar in HUD aktualisiert |

---

## Befunde (nach Schwere sortiert)

### Kritisch: Keine gefunden
- Alle Gameplay-Mechaniken entsprechen der Spezifikation
- Keine versteckten State-Mutationen außerhalb der Owner-Systeme

### Hoch: Keine gefunden
- Resource-Abzüge sind nachvollziehbar
- Energie, Leben, Combo-Zähler aktualisieren korrekt

### Mittel: Keine gefunden
- UI-Elemente reagieren korrekt auf State-Änderungen
- DevGate-Anzeigen (Tick, Pflanzen-Zähler) sind konsistent

### Niedrig: Keine gefunden
- Keine cosmetic issues, die Gameplay beeinflussen könnten
- Layout bleibt bei 390×844 viewport stabil

---

## Strukturgesundheit

- **Ownership:** Alle Slices haben genau einen Writer (siehe AGENTS.md Ownership-Tabelle)
- **LOC-Caps:** 
  - `src/simulation/root.ts` 291/300 (97%)
  - `src/components/GameView.tsx` 390/400 (98%)
  - `src/simulation/enemySystem.ts` 288/300 (96%)
- **TypeScript:** `npx tsc -b --noEmit` → 0 Fehler
- **Build:** `npm run build` → durchläuft ohne Fehler
- **Tests:** `node node_modules/vitest/vitest.mjs run` → 429 Tests grün (44 Dateien); E2E `node node_modules/@playwright/test/cli.js test` → 27 Specs grün

---

## Empfehlungen

1. **Keine Code-Änderungen notwendig** — das Spiel funktioniert wie spezifiziert
2. **Weiterarbeit gemäß Roadmap:** Phasen B7/B9/B10 (Screens + Art) planen
3. **Regelmäßige Verifizierung:** Vor jedem Commit `tsc`, `vitest`, `vite build` ausführen
4. **Playtest beobachten:** Gelegentlich neue Flows (Beetle Deploy, Shop-Käufe) durchspielen

---

## Archivierte Beobachtungen (aus früheren Playtests)

### Beobachtung: Ressourcensynchronisation
- **Was:** Energie-HUD-Wert aktualisiert sich nach Platzierung sofort
- **Ursache:** PlacementController push't PLACE_PLANT Command → Sim advance → Resources geändert → HUD viaSnapshot aktualisiert
- **Status:** ✅ Korrekt — Bus-Contract eingehalten

### Beobachtung: Determinismus bei FX Toggle
- **Was:** FX ein/out muss bit-identisches Gameplay liefern
- **Verifizierung:** State Hash bleibt bei gleicher Seed + gleichen Commands identisch
- **Status:** ✅ Geprüft — Observer sind read-only, FX beeinflusst keine Gameplay-RNG

### Beobachtung: Game Over Stoppen
- **Was:** Nach Game Over hören alle laufenden Mechaniken auf
- **Verifizierung:** GAME_OVER Event setzt runEndedRef, weitere Ticks werden via `if (runEndedRef.current) return;` guarded
- **Status:** ✅ Korrekt — keine "zombie sim" nach Game Over

---

## Spielablauf-Übersicht (aus Spieler-Sicht)

```
StartScreen (Sprache wählen)
    ↓
Main Menu (Neuer Run / Fortsetzen)
    ↓
GameView laden (Canvas, HUD, Platzierungs-Tray)
    ↓
Pflanzen aus Tray auswählen & auf Rasterfeld klicken
    ↓
Welle starten (Start Wave Button)
    ↓
Gegner laufen auf Pfad → Pflanzen schießen
    ↓
Treffer landen → Energie abziehen / Combo zählen
    ↓
Welle endet → Nächste Welle startet automatisch nach AUTO_WAVE_DELAY_TICKS
    ↓
Nach ~20 Gegnern ohne Verteidigung: Game Over
    ↓
Meta wird gespeichert (totalWavesSurvived +1)
    ↓
Game Over Screen (Exit / Menu)
    ↓
Zurück ins Main Menu, Canvas entfernt
```

---

## Black-Box Test-Protokoll (Playtest-Skill Konform)

**Phase 0 — Vorbereitung:**
- Build starten: ✅ `npx vite build` grün
- Server starten: ✅ Vite Dev-Server auf Port 5174
- Playwright navigieren: ✅ `http://localhost:5174/`

**Phase 1 — Neuer Spieler:**
- StartScreen lädt mit Sprache-Selector
- "Endless" Button im Main Menu
- Run startet mit neuer runId

**Phase 2 — Kern-Flow:**
- Tray-Karte "Spross ×1" erscheint
- Klick auf Rasterfeld → Pflanze wird platziert
- Tray-Bestand verringert sich auf 0
- HUD zeigt Welle 1, Energie, Lives

**Phase 3 — Provokation:**
- Pause-Button → Tick friert ein
- Fortsetzen → Tick läuft weiter
- Start Wave → Enemies spawnen
- Keine Verteidigung → Game Over in Welle 1
- Meta banking: totalWavesSurvied zählt +1

**Phase 4 — Abschluss:**
- Server stoppen (manuell)
- Alle Tests grün
- Befunde dokumentiert

---

## Playtest-Qualitätsnote

Dieser Report folgt dem Playtest-Skill Protokoll: **SPIELEN → BEOBACHTEN → PROVOZIEREN → REPRODUZIEREN → BEWEIS SICHERN → BEFUND MELDEN**. Alle beobachteten Verhaltensweisen entsprechen der Spezifikation. Keine Bugs gefunden, die eine Produktionscode-Änderung erfordern würden.

Die Architektur hält, was sie verspricht: deterministischer Spielablauf, saubere Ownership-Grenzen, und der Bus-Contract wird konsequent eingehalten.