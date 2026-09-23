# Kipppunkt-Session v0.0.96 — Wie weit trägt eine Kill-Box-Leihe allein?

**Datum:** 2026-09-23 · **Version:** v0.0.96 · **main:** `d924a17` · **Browser:** QA-Chrome (MCP)
**Setup:** Run 11 auf der fertigen 17-Topf-Maze (Wand A gx=4 komplett + Ausbau), EINE Leihe in der
Kill-Box (5,4), sonst keine Verteidigung, Auto-Waves an, kein Eingriff bis lives 0.

**Frage (B2 aus der Taktik-Session):** Ab welcher Welle reicht die Leihe allein nicht mehr?
Wie steil ist die Gegner-Skala danach?

---

## Ergebnis: Kipppunkt = Welle 10 (Tank-Sprung 94→375 HP)

| Welle | maxHp | lives | Anmerkung |
|---|---|---|---|
| 1 | 46 | 20 | 3 Grunts — Leihe killt alle |
| 5 | 70 | 20 | 14 Gegner, 0 Leaks (aus Taktik-Session) |
| 9 | 94 | 20 | 12 Gegner, Score 3387 — Leihe hält weiter |
| 10 | **375** | **20 → 0** | **Tank-Sprung ×4** — Leihe allein bricht, GAME OVER |

- **Meta nach dem Lauf:** Nektar 758, bestWave 10, TWS 21, runs 7 — Run-Ende-Buchung sauber
  (SCORE 7805 im Overlay, Nektar-Zugang aus Wellen/Kills).
- **Overlay-Vertrag:** „GAME OVER — Wave 10 • Score 7805 … Version v0.0.96" mit `New Run` /
  `Back to Menu` — vollständig, kein DevGate-Leak.
- **Kein Zombiespiel:** Nach GAME OVER keine fortlaufenden Wellen mehr (früherer A19-Kandidat
  „Zombie-Sim hinter dem Overlay" ist mit dem GameView-Remount-Vertrag abgestellt — Auto-Waves
  liefen nach lives 0 nicht weiter).

## Bewertung (B2)

1. **Die Schwelle „zu einfach" ist entfernt:** Die Welle-10-Skala (46 → 375 maxHp über 10 Wellen,
   Faktor ~8) überholt eine unveränderte Leihe deutlich. Der Kipppunkt liegt spät genug für das
   Onboarding, früh genug, dass Investition nötig wird.
2. **Der Kipp ist hart, nicht fliessend:** Welle 9 noch perfekt (20/20), Welle 10 Totalverlust —
   die HP-Skala springt bei 10 auf ×4. Für die Maze-Taktik heißt das: Nachkauf (Kill-Box 2.0,
   Pot-Boosts) muss bis Welle 10 attraktiv sein. 758 Nektar reichen für ~10 Töpfe — die
   Ökonomie gibt den Werkzeugkasten rechtzeitig her.
3. **Maze + Ökonomie greifen ineinander:** Der Lauf bestätigt den Anreiz-Loop — ohne Investition
   endet Endless bei 10, mit Pot-Boosts/Kauf-Pflanzen verschiebt sich der Kipppunkt. Das ist die
   gewollte Progressions-Achse (B1-Besitz: die Maze trägt über Runs, die Verteidigung muss
   nachgerüstet werden).

## Nebenbefunde

- **N1 (Beobachtung, 1/3):** Der lives-Drop 20→0 innerhalb einer Welle deutet auf Mehrfach-Leaks
  pro Käfer (`damage`-Gewichtung) — vermutlich Tank (375 HP) mit hohem `damage`. Nicht einzeln
  verifiziert; falls Tanks >1 Leben kosten, wäre das für den Spieler undurchsichtig ohne HUD-Hinweis.
- Konsolenhygiene: keine neuen Fehler während des Laufs (nur bekannte Q5-React-Warnung).

## Status

| ID | Punkt | Status |
|---|---|---|
| B2 | Balance-Schwelle: Kipppunkt Welle 10, HP-Sprung ×4 — Balance-Druck bestätigt, „zu einfach" widerlegt | erledigt (Messung) |
| N1 | Tank-Leak-Kosten (Mehr-Leben-pro-Durchbruch?) — HUD-Sichtbarkeit | offen (Beobachtung, kein Owner im Task 23.09. Navigation) |
