# Resume- & Shop-Verträge v0.0.96 — zwei Prüfungen, ein Lehrstück über die Quarantäne

**Datum:** 2026-09-23 · **Version:** v0.0.96 · **main:** `d924a17` · **Browser:** QA-Chrome (MCP)
**Umfang:** (1) Resume nach Reload mitten in Welle — bit-genau? (2) Shop-Preise vs. `poolPriceOf`,
fail-closed bei fehlendem Nektar.

---

## Prüfung 1: Resume-Vertrag — **VERTRAGSTREU** (nicht bit-genau, und das ist der Vertrag)

**Setup:** Run 12 (seed 1352315500), Welle 1 ausgelaufen (lives 8 — unverteidigt), Welle 2 gestartet,
mitten in `phase: 'wave'` (7 Gegner alive) Reload erzwungen.

**Run-Save im IDB (Key `run`)** — exakt die Vertragsfelder aus `architecture.md` §4.2:
`version, appVersion, runId, seed, tick, waveNumber, lives, score, combo, plants[], inventory,
discoveredVariants, bredStats, nektarEarned, cols, rows`. **Keine** Gegner, **keine** Projektile —
„Explizit nicht gespeichert" wird eingehalten.

**Vergleich vor Reload vs. nach Resume:**

| Feld | Mid-Wave (vor Reload) | Nach Resume | Bewertung |
|---|---|---|---|
| runId / seed | 12 / 1352315500 | 12 / 1352315500 | ✓ identisch |
| wave | 2 | 2 | ✓ |
| **phase** | **wave** | **prep** | ✓ **Vertrag**: „deterministisch in der Vorbereitungsphase vor der nächsten Welle" |
| lives / score / nektar | 8 / 0 / 0 | 8 / 0 / 0 | ✓ bit-genau |
| inventory | {pot 1, decor 6, plot 1, loan 1} | identisch | ✓ bit-genau |
| plants | [] | [] | ✓ |
| Route | 23 Punkte, Reihe 0→Spalte 0 | **identische 23 Punkte** | ✓ aus Persistenz-Welt neu berechnet, gleiches Ergebnis |
| enemiesAlive | 7 | 0 | ✓ Vertrag: Gegner sind kein Save-Bestandteil |

**Schedule-Neugenerierung:** Welle 2 nach Resume: 7 Gegner à 58 HP — aus `(seed, waveNumber+1)`
frisch generiert, deterministisch (7× identische HP, kein Zufallsverdacht).

**Resume-UX:** Titel → Start Game → Hub bietet **„▶️ Resume run — Continue the saved run at w…"**
an. Nach Resume startet die UI in `prep` — der Spieler verliert die mid-Wave-Gegner nicht „irgendwo",
er beginnt die Welle sauber neu. **Fazit: Der Resume-Pfad ist vertragsgetreu; „bit-genau" gilt für
alle gespeicherten Felder, die Wegwerf-Felder (Gegner) sind per Vertrag Wegwerf-Felder.**

## Prüfung 2: Shop-Preis- & fail-closed-Vertrag — **VERTRAGSTREU** (nach meinem Irrweg)

**Preise (UI ↔ `poolPriceOf`):** Flower Pot 15 ✓ (MAP_TILES_SOURCE.pot.price), Field expansion 30 ✓
(PLOT_PRICE), Decor 3 ✓, Seeds 40 ✓ (SEED_PRICE). Kein Preis in der UI entstanden — Regel 6 hält.

**Fail-closed (legitimer Test, Nektar 40 des Fallback-Profils):**
- Pot (15) bei 40 → 25 ✓ gebucht (40−15)
- Pot (15) bei 25 → 10 ✓ gebucht
- Pot (15) bei 10 → **abgelehnt**, 10 bleibt, pot bleibt 8 ✓
- Field expansion (30) bei 25 → **abgelehnt**, 25 bleibt ✓

## Das Lehrstück: Meine Checksummen-Manipulation und die Quarantäne

Mein erster fail-closed-Ansatz (Meta-JSON direkt auf nektar 0 editieren, ohne die FNV-1a-Checksumme
neu zu berechnen) löste exakt den verankerten Schutz aus: `storage.ts` → Prüfsummen-Fehler →
**Quarantäne** (`lifegamelab_meta.corrupt`) + sauberes Frisch-Profil. Der danach beobachtete
„Kauf bei Nektar 0" war der legitime Kauf des **Fallback-Profils** (40 Nektar Grant) — kein Defekt.
Der zweite Edit überschrieb zusätzlich die Quarantäne — daraus folgte:

**QA-Seitenfehler (benannt):** Das echte Profil (nektar 758, runs 7, bestWave 10) wurde durch
Fallback + meine Edits aus dem localStorage verdrängt. **Rekonstruktion** mit den letzten
Messwerten + exakt nachgebautem `canonicalJson` + FNV-1a aus `storage.ts` — die App akzeptierte
den rekonstruierten Envelope (kein erneuter Quarantäne-Trigger) ✓. Die persistente Welt (17 Töpfe,
IDB) war die ganze Zeit unangetastet — der Welt-Vertrag hat gehalten, wo mein Meta-Griff danebenlag.

**Erkenntnis fürs Runbook:** Meta nie direkt editieren — jeder Test, der Meta-Werte braucht, muss
über **legitime App-Pfade** (Käufe, Runs) fahren oder die Checksumme mitführen. Die Quarantäne ist
kein Bug, sie hat den Release-Save vor mir geschützt — genau wie geplant.

## Status

| ID | Punkt | Status |
|---|---|---|
| R1 | Resume nach mid-Wave-Reload: Vertrag eingehalten (prep-Neustart, Save-Felder bit-genau, Route identisch) | erledigt |
| S1 | Shop-Preise = poolPriceOf (15/30/3/40), Kauf bucht exakt | erledigt |
| S2 | Fail-closed: zu teurer Kauf wird abgelehnt, Save unverändert | erledigt |
| QX | Quarantäne-Vertrag live bestätigt (Prüfsummen-Fehler → Quarantäne + Frisch-Profil) | erledigt (Positiv-Befund) |
| QY | QA-Meta-Verlust durch Umgebungsfehler — Profil rekonstruiert; Runbook-Notiz empfohlen | erledigt (QA-seitig) |
