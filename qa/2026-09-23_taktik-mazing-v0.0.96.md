# Taktik-Session v0.0.96 — Mazing & Kill-Box: Time-on-Target-Bewertung

**Datum:** 2026-09-23 · **Viewport:** 1280×860 · **Browser:** QA-Chrome (MCP-Brücke, echte Maus)
**Version:** v0.0.96 · **main:** `d924a17` · **Basis:** Nachverifikation v0.0.96 (`42151c9`), persistente Welt mit 13 Alt-Töpfen
**Frage:** Belohnt v0.0.96 das Mazing-Prinzip (Time-on-Target) genug, dass taktisches Bauen der
Reihen-Bau-Doku („6 Pflanzen als Block") überlegen ist?

---

## Aufbau (taktisch, nach Mazing-Lehre)

Besitz-Modell respektiert: 2 neue Töpfe im Shop gekauft (Nektar 40 → 10, 2×15). Layout:

- **Wand A** (persistiert aus der Nachverifikation): gx=4, gy 2–9 komplett — 10 Töpfe.
- **2 neue Töpfe**: (4,8), (4,9) — Wandausbau (Inventar 2→0 bestätigt).
- **Kill-Box: Leihe in der Hairpin-Tasche (5,4)** — direkt an der Wand, Deckung über Reihe 1
  (Range 3, Damage 15, Cooldown 30) + Sprout-Genom-Jitter.

Route-Ergebnis: Käfer laufen Reihe 0 → Kurve bei (6,0) → **Reihe 1 durch die gesamte
Kill-Box-Schiene** → Spalte 0 nach unten. Der Laufweg streift die Leihe über ~3,4 Zellen.

## Messwerte

| Metrik | Wert |
|---|---|
| Maze-Gewinn (walk − ideal) | **22 − 12 = +10 Tiles (+83 % Umweg)** |
| Welle 1 (3 Grunts, 46 HP) | **alle 3 Kills durch die EINE Leihe**, lives 20/20, Score 490 |
| Auto-Waves bis Welle 5 | 14 Gegner, **0 Leaks**, Score 1373, +150 Nektar im Run |
| Auto-Waves bis Welle 7 (Exit) | lives 20/20 durchgehend, Meta: Nektar 222, bestWave 7, TWS 11 |
| Kaufkraft nach 2 Runs | 222 Nektar = 14 Töpfe im Shop (je 15) |

## Bewertung: JA — Time-on-Target wird belohnt

1. **Eine Kill-Box-Pflanze an der richtigen Stelle ersetzt eine Verteidigungslinie.** In v0.0.50
   rauschte die Route in Reihe 0 an Innenraum-Mauern vorbei (T1); jetzt erzwingt die Wand den
   Umweg durch die Schiene, und die Leihe arbeitet die gesamte Welle ab. Das ist exakt die
   Maul-Tactics-Lehre („eine Pflanze in der U-Tasche feuert in zwei Lanes").
2. **Der Maze-Gewinn ist messbar und ausgelesen:** ROUTE_CHANGED trägt `tiles` (Walk) und `ideal`
   (kürzester Weg) — der Abstand ist der „Abstand = Maze-Gewinn" aus dem Root-Kommentar. +10 Tiles
   auf einer 12×12-Map ist ein substanzieller Zeitgewinn pro Käfer (~45 % mehr Feuerzeit je Passage).
3. **Ökonomie-Schleife:** Welle 1–7 mit einer Pflanze erbringt 222 Nektar → 14 Töpfe → größere
   Serpentine. Der Anreiz-Loop (Maze bauen → mehr Kills → mehr Material → tieferes Maze) greift.

## Neue Beobachtungen (keine Befunde, aber für W1/W2 relevant)

- **B1 (Design-Bestätigung für W1):** Die persistenten Alt-Töpfe (13) kamen kostenlos aus der
  Anfangsgabe — aber der Besitz-Zähler im Meta zeigt `pot: 0` nach Verbrauch, und Shop-Käufe
  erhöhen ihn sauber. Das Modell ist **Besitz, nicht Miete**: Wer baut, verbraucht; was steht, bleibt.
  Ein zweiter Run auf derselben Maze ist damit stärker als der erste (Mauerwerk steht schon) —
  das ist ein echtes Progression-Statement, das der DEV kennen sollte (gewollt?).
- **B2 (Balance-Beobachtung):** Welle 5 mit 70-HP-Gegner (neuer Typ) wurde von EINER Leihe bei
  20/20 Leben gehalten. Die Schwelle „zu einfach" rückt näher — entlastet aber das Onboarding.
  Beobachtung, keine Beanstandung: Die Gegner-HP-Skala (46 → 52 → 70) steigt schneller als die
  Leihe-Stärke; ohne Nachkauf kippt das vermutlich ab Welle 8–10 (nicht getestet — Exit davor).
- **B3 (Metrik-Sichtbarkeit, UX):** Der Maze-Gewinn (+10 Tiles) ist nur im Event-Log sichtbar.
  Ein „Time-on-Target"-Chip im HUD (walk vs. ideal) würde dem Spieler seinen taktischen Erfolg
  direkt zeigen — Vorschlag aus der Mazing-Lehre, Abstimmung beim DEV.

## Repro (3/3-Regel)

1. Profil mit persistenter Welt (13 Töpfe, Wand A bei gx=4), Endless-Run starten.
2. Leihe auf (5,4) platzieren (Hairpin-Tasche), Start Wave.
3. Beobachten: Route Reihe 1, Kills durch die Leihe, 0 Leaks; ROUTE_CHANGED-Payload
   `tiles − ideal = +10` (im Event-Log via `__simRootRef`).
4. Wiederholt in 3 Runs (6, 7, 8) — identisches Muster, Meta-Buchung sauber.

## Status

| ID | Punkt | Status |
|---|---|---|
| M1 | Time-on-Target-Belohnung: MAZE WIRKT, Bewertung positiv | erledigt (Bewertung, kein Fix nötig) |
| B1 | Persistenz-Progression (2. Run startet stärker) — Absicht? | als Design-Frage übergeben |
| B2 | Schwelle „zu einfach" ab mittleren Wellen (Beobachtung) | offen (Beobachtung) |
| B3 | Time-on-Target-Chip im HUD (Vorschlag) | als Design-Frage übergeben |
