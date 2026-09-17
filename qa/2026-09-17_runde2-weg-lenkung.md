# QA-Bericht: Runde 2 — Weg-Lenkung & Schusslinien-Taktik (Erfolgsmessung)

- **Datum:** 2026-09-17
- **Version/Commit:** v0.0.38 (`ae64493`), Dev-Server localhost:5173, `?dev=1` (Sim-Lesebrücke)
- **Umgebung:** wie Runde 1 (Chrome 153, CDP-Bridge, Profil `~/.config/lifeseedlab/mcp-profile`, Alt-Save v0.0.37 mit Sammlung 3/4)
- **Ziel:** Welle 1 überleben mit Taktik (Gegenprobe zu Q1 aus Runde 1)

## Setup (aus der Source abgeleitet, im Spiel verifiziert)

- **Weg-Korridor Zeile 5:** (2,5)(3,5)(4,5)(6,5)(7,5)(8,5) + Lücke (5,5) — Lücke bleibt,
  weil Töpfe auf Weg-Tiles abgelehnt werden („Da läuft jemand drüber“) und die
  PLACEMENT_PATH_MARGIN (1,2 Zellen zum DEFAULT-Pfad) die Lücke zementiert.
- **Schützen:** Spross (Reichweite 3, 15 dmg, 1 Schuss/s) auf Topf (4,4), Keim (seed_0)
  auf Topf (7,4) — beide decken Korridor UND Lücke (5,5).
- Energie-Bilanz exakt: 150 → 110 (8 Weg-Tiles × 5) → 80 (2 Töpfe × 15) → Sim bestätigt.

## Ergebnis (Sim-Messreihe, 5-s-Intervalle)

```
t+0s:  2 Gegner, Leben 20, Energie 80,  Score 0
t+5s:  2 Gegner, Leben 20, Energie 121, Score 44.9
t+10s: 0 Gegner, Leben 20, Energie 175, Score 77.4   → Phase prep (Welle vorbei)
```

**Welle 1 in < 10 s beendet, 20/20 Leben, +95 Energie, Score 77.4.**
Gegenstück Runde 1 (Q1): Game Over in ~15 s, Score 0, 20 Leben → 0.

## Befunde aus dieser Session

### Q7 — Schwere: hoch (Balance/Tutorial-Lücke) — Repro-Stand: **vorläufig 1/3**
**Welle 1 ist ohne Lenk-Wissen tödlich, mit Weg-Lenkung trivial.** Der Unterschied
Sieg/Totalverlust hängt allein davon ab, ob der Spieler versteht, dass (a) Weg-Tiles
die Gegner-Route umlenken (Gewicht 0,6 vs. 1,0) und (b) Schützen die Route flankieren
müssen (Reichweite 3 orthogonal). Das Tutorial (Krix 1–10) vermittelt beides nicht;
es zeigt Sprache → Start → Hub → Feld, aber keine Platzierungs-Taktik.
**Vorschlag:** Krix-Notiz im Feld ergänzen („Weg zählt doppelt — die Läufer nehmen
ihn gern. Stell dich daneben, nicht drauf.“) oder erstes Aufbauziel im Prep-Hint.

### Q8 — Schwere: mittel (Interaktion, Kandidat) — Repro-Stand: **vorläufig 0/3, erst prüfen**
**Reihenfolge-abhängige Platzierbarkeit von Weg-Tiles?** Identische Klick-Sequenz
[(2,5)…(9,5),(5,4),(5,6)] zweimal gefahren: Lauf A (ohne DevGate) platzierte alle 9
(Energie 105), Lauf B (mit DevGate) nur 8 (Energie 110) — (9,5) bzw. eine Umweg-Zelle
blieb still aus. Hypothese: Die Margin-Prüfung läuft gegen die **sich ändernde** Route
(nach jedem gesetzten Tile neu), wodurch die Reihenfolge die Legalität verschiebt —
aus Spielersicht nicht nachvollziehbar. **Wird erst nach 3 formalen Zyklen
(Repro-Disziplin) als Befund geführt.** Alternative Erklärung: Overlay-Interzeption im
DevGate-Lauf (Klicks landeten nicht) — ebenfalls in den Zyklen auszuschließen.

## Positiv (funktioniert explizit gut)

- **Weg-Lenkung ist mächtig und fair:** Gewicht 0,6 zieht die Route spürbar an;
  Dijkstra+PLANT_ROUTE_COST wirken wie spezifiziert (Maze-Bauwerk spürbar).
- **PLACEMENT_PATH_MARGIN schützt die Default-Route** (Lücke (5,5) erzwingt den
  Chokepoint — Softlock-Mauer unmöglich, wie im Source dokumentiert).
- **Sim-Lesebrücke (`?dev=1`, `__simRootRef`)** liefert vollständigen State
  (currentRoute, mapTiles, resources, inventory) — hervorragend für QA/Diagnose.
- **FieldToast mit Grund** erneut präzise bei jeder Ablehnung.
- Energie-Buchhaltung exakt nach Source-Preisen (45 + 30 + 0 verbrauchte Loadout-Pflanzen).

## Cross-Referenz

- **Q1 (Runde 1) wird präzisiert:** „Welle 1 tötet Erstspieler“ → „Welle 1 ist ohne
  Lenk-Wissen tödlich (Q7)“ — Runde 2 widerlegt die pauschale Fassung.

---
*Status-Änderungen bitte direkt in dieser Datei (und im Index in `qa/README.md`) vermerken.*
