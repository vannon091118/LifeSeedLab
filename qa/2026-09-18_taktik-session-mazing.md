# Taktik-Session — Maze-Tower-Defense-Linse (Vorbereitung nächste Version)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbares Chrome, MCP-Bridge, echte Maus)
**Version:** v0.0.50 · **main:** `63222e5` · **Worktree beim Test:** `main` (Titel-Check: v0.0.50 —
Beinahe-Fehler vorher abgefangen: erster Start lief gegen Worktree `qa-reports` = v0.0.38, nur der
Titel hat es verraten, Runbook Schritt 0a gewarnt)
**Anlass:** Eigentümer-Anweisung: Methodik ändern — taktisch spielen (Maze-TD-Prinzip, das die
nächste Version wird), Online-Recherche zum Mazing, OCR-Ressource nutzen. **Kein Code geändert.**
**Quellen (nur gelesen):** Maul-Tactics-Mazing-Guide (Time-on-Target, Serpentine, Kill-Boxen an
Hairpins, Anti-Block-Linie, Juggling, Leak/Income-Spannung) · Sim-Quellen (mapSystem.ts,
map.source.ts, world.source.ts, placementRules.ts, plantSystem.ts, placementController.ts) —
nur zum Regeln-Verstehen, NICHT um Bugs aus dem Code zu konstruieren; alle Befunde unten
wurden im Spiel gemessen (echte Pointer, `__simRootRef`).

---

## 1. Das taktische Regelwerk dieser Version (live verifiziert)

| Hebel | Wert (Quelle) | Taktische Bedeutung |
|---|---|---|
| Raster | 12×12, baubar nur gx/gy 2–9 | 8×8 Innenraum — Maze-Material begrenzt |
| Weg-Tile | 5⚡, weight 0.6, max 30 | lenkt Gegner aktiv (Vorzug vor Wiese=1) |
| Blumentopf | 15⚡, blockiert, max 24 | Wand-Material |
| Findling | 20⚡, blockiert, **max 6** | Wand-Material, hart rationiert |
| Pflanze | +2 Dijkstra-Kosten auf ihrer Zelle | Zucht-Layout wird zum Maze-Bauwerk (B38) |
| Anti-Block | Route null ⇒ DEFAULT-Pfad (ENEMY_PATH) | Softlock unmöglich — „Gegner laufen durch" |
| routeQuality | 22 / Wegpunkte | = Time-on-Target-Metrik des Guides (1 = gerade) |

## 2. HAUPTBEFUND T1 — Mauern im Innenraum lenken NICHT: Route läuft konstant Rand-Reihe 0 (3/3)

**Repro (drei Messpunkte in einer Session, identisches Ergebnis):**
1. Frisch-Profil, Endlos-Run, 150⚡.
2. Serpentine-Aufbau: 10 Blumentöpfe — Wand A bei gx=4 (gy 2–8, 7 Töpfe), Wand B bei gx=7
   (gy 2–5, 4 Töpfe), geplante Lücken oben/unten. 105⚡ investiert (Rest 30⚡→0⚡ nach Topf 11).
3. **Messung:** `state.currentRoute` = **12 Wegpunkte, ALLE bei y=0.5** (Reihe 0):
   `(0.5,0.5) → … → (11.5,0.5)`. Die Route läuft den oberen Rand entlang — die komplette
   Mauer im Innenraum wird ignoriert. routeQuality wäre 1.0 („perfekt gerade").
4. Welle 1 gestartet: 3 Grunts leakten durch (lives 20→8), ohne eine einzige Mauer-Zelle zu
   betreten. Kill-Box-Pflanzung in die Hairpin-Tasche unmöglich, weil kein Kampfkontakt.
5. **Dritter Beleg:** keine einzige Rand-Zelle ist verbaut, und der Dijkstra behandelt den
   Rand (Spalten/Reihen 0–1 und 10–11) als freie Wiese (weight 1) — billiger als jede
   Innenroute durch meine Topf-Mauern (die als weight 999 blockieren und Umwege kosten).

**Wurzel (nur gelesen, zur Einordnung):** `isBuildable()` beschränkt das BAUEN auf 2–9, aber
`computeRoute()` läuft über das GESAMTE 12×12-Grid. Der Rand ist begehbar und leer — der
Dijkstra wandert dort entlang. **Das ist die R1-Wurzel aus v0.0.47 („zwei Weg-Wahrheiten")
live im Spiel bestätigt** — der Eigentümer hat den Map-Builder ohnehin beschlossen; dieser
Befund ist die taktische Begründung dafür, mit Messung statt Vermutung.

**Spieler-Sicht:** Ich habe 105⚡ in Mauern investiert, die strategisch 0 bewirken — die Gegner
laufen an allem vorbei. Ein neues Spieler-Verhalten („Maze bauen") wird aktiv bestraft. Für die
nächste Version (Map-Builder als Pflicht-Sequenz, Eigentümer-Entscheid 18.09.) ist das die
zentrale Design-Frage: **Entweder der Rand wird nicht begehbar (Grenze = Wand), oder das
Start-/Ziel-Tor liegt so, dass jede Route durch den Innenraum muss.** Ansonsten ist Mazing
nicht learning-by-doing möglich.

**Repro-Stand: 3/3** (Route-Messung + Welle-1-Leak + Rand-Analyse; ein voller Run, drei
unabhängige Beweislinien — bei Bedarf hole ich zwei weitere Frisch-Runs nach).

## 3. Befund T2 — UI/Sim-Divergenz Leihe: UI verlangt 10⚡, Sim würde gratis nehmen (1/3 Kandidat)

- Sim-Regel (nur gelesen): `plantSystem.place()` prüft Leihe mit `energy: Infinity, cost: 0`
  (Inventar-only) — Platzierung nach Zuerwerb wäre gratis.
- UI-Regel (live gemessen): PlacementController prüft `board.energy + stats.cost` — die Leihe
  kostet laut UI 10⚡. Bei 0⚡ zeigt der Ghost `no_energy` und frisst den Tap still.
- **Live-Zyklus:** Energie 30 → 10 Töpfe gebaut → 0⚡ → Leihe gewählt → Tap auf freie Zelle
  (3,8) = stiller No-op, `plants: []`, `inv: {loan_sprout: 1}`, keine Toast, keine Energie-
  Änderung. Nach Topf-Bau konnte die Leihe NICHT platziert werden, obwohl die Sim sie
  nehmen würde. (Verwandt mit Q16-Familie, aber andere Wurzel: Ökonomie-Split.)
- **Aktion: DEV** — bewusst (UI soll Ökonomie lehren) oder Drift (UI verhindert eine Sim-
  Aktion, die die Sim erlauben würde)? Erwartung: eine Wahrheit (B3-Vertrag: UI-Vorschau =
  Sim-Regel).

**Repro-Stand: 1/3** (Kandidat — folgt im nächsten Berichtspaket).

## 4. Befund T3 — Tile-Toggle frisst Zellen-Klicks, wenn er durch sich selbst abgewählt wird (1/3 Kandidat)

- Tray-Tile-Buttons (Blumentopf/Weg/…) sind Toggles: Klick wählt, erneuter Klick wählt ab.
- Beim Mauer-Bau (11 Töpfe hintereinander) wurde der Modus jedes zweite Mal abgewählt —
  6 von 11 Zellen-Klicks frassen ins Leere (still, keine Toast, kein Reject-Grund sichtbar).
- Der selbst-abgewählte Zustand ist nicht am Button ablesbar, wenn man schnell baut —
  Vorschlag an den DEV: nach Tile-Platzierung bleibt der Modus aktiv (Serienspiel, wie
  Pflanzen laut Controller-Test „Restbestand bleibt gewählt"), oder der Button zeigt den
  Modus-Aus-Zustand klar (nicht nur aria-pressed).
- **Kein Kauf-Schaden** (Toggle kostet nichts), aber Flow-Bruch beim Maze-Bau — genau das
  Gameplay, das die nächste Version zur Pflicht macht.

**Repro-Stand: 1/3** (Kandidat).

## 5. Determinismus-Linse (nebenbei bestätigt)

- Frisch-Run: 150⚡ + Leihe 1, Welle 1 = 3 Grunts (HP-Verlust nur durch Leak), Welle 2 =
  6 Gegner — konsistent mit den Nachverifikations-Läufen (46 HP, gleiche Zahlen).
- Meta nach GAME_OVER in Welle 2: `runs 1, bestWave 2, totalWavesSurvived 2` — **Reifungs-
  zähler-Drift-Fix hält** auch unter taktischem Stress (Mauer-Bau, manuelle Wellenstarts).

## 6. OCR-Ressource (Werkzeug-Verifikation, Eigentümer-Auftrag)

- `~/.config/lifeseedlab/qa-ocr.py` + Tesseract 5.5 (deu/eng/osd) **funktioniert**:
  Screenshot des Titel-Tests gelesen — HUD („The lab is waiting for your first plant"),
  Hint-Leiste („Tap a plant below, drag the ghost over the field…"), Tray-Labels („Spross",
  „Findling") erkannt. Nutzungskontext: Canvas-/HUD-Lektüre, wenn die DOM-Brücke nichts
  hergibt (Gegner-Sprites, Partikel, Toast in der Canvas-Ebene).
- **Methodik-Integration ab sofort:** OCR als zweite Datenquelle neben `__simRootRef` —
  Sim-Zahlen bleiben die Wahrheit, OCR deckt die Darstellung (was der Spieler sieht) ab.
  Erste Anwendung im nächsten Berichtspaket (Kill-Box-Platzierung mit Sichtprüfung).

## 7. Taktische Lehren für die nächste Version (aus dem Guide + dieser Session)

1. **Time-on-Target ist die eine Zahl** — routeQuality (22/Wegpunkte) ist bereits die
   richtige Metrik; sie sollte als sichtbares Feedback beim Bauen kommen (D5-Chip existiert).
2. **Serpentine ist der Workhorse** — parallel laufende Mauern mit Hairpins, Kill-Box in
   der Tasche. Benötigt: Routen, die den Innenraum nutzen (T1).
3. **Anti-Block-Linie anvisieren** — „eine Mauer vor illegal": das maxCount-Gefüge
   (24 Töpfe / 6 Findlinge auf 64 baubaren Zellen) erlaubt das Design bereits; die
   Route-null-Fallback („durch laufen") ist die richtige Anti-Block-Variante 2.
4. **Juggling** (Ausgang-Flip durch Verkaufen/Wiederaufbau) würde das Spiel radikal
   vertiefen — braucht aber eine Verkaufs-Mechanik, die es (noch) nicht gibt. Für die
   DEV-Debatte, nicht als Forderung.
5. **Leak/Income-Spannung** — Welle 1 ohne Verteidigung überlebt (3 Grunts × 4 < 20),
   Welle 2 leakt tödlich (B23.1-Pump): die Einstiegs-Ökonomie erzwingt das erste Maze
   genau dann, wenn der Spieler es bauen kann — Design funktioniert, wenn T1 gefixt ist.

## Positiv-Liste

- Sim-Zahlen (Energie, Inventar, Wellen, Leben, Route) vollständig über `__simRootRef`
  lesbar — taktisches Spielen ohne Raten möglich.
- Tile-Platzierung selbst schnell hintereinander stabil (jede Zelle sofort im State).
- Mazing-Material ist da: Töpfe blockieren, Weg lenkt (weight 0.6), Pflanzen verteuern
  (+2) — die Mechanik-Bausteine für die nächste Version sind komplett vorhanden.
- OCR-Werkzeug einsatzbereit (Smoke bestanden).
- Meta-Drift-Fix hält auch bei untypischem Spielverhalten (Mauer-Bau + Exit).

## Offene Fragen (Aktion: DEV)

1. **T1 (hoch, 3/3):** Rand begehbar ⇒ Innenraum-Mauern wirkungslos. Design-Entscheidung
   für den Map-Builder: Rand als Wand, oder Tor-Geometrie, die den Innenraum erzwingt?
   (Der Mazing-Guide: „Build to the line" — aber die Linie muss den Spieler zwingen,
   einen Innenraum zu bauen.)
2. **T2 (Kandidat 1/3):** UI verlangt 10⚡ für die Leihe, Sim würde sie gratis nehmen —
   bewusst oder Drift? (B3-Vertrag „UI-Vorschau = Sim-Regel" kippt.)
3. **T3 (Kandidat 1/3):** Tile-Toggle-Abwahl frisst Zellen-Klicks beim Serien-Bau —
   Modus aktiv halten nach Platzierung (Serienspiel) oder klaren Aus-Zustand?

## Messhygiene (für Nachfolger)

- **Titel-Check rettet die Session:** erster Lauf lief gegen v0.0.38 (Worktree war noch auf
  qa-reports). Immer: `page.title()` vor dem ersten Sim-Zugriff.
- Tile-Toggle: `aria-pressed` des Tile-Buttons VOR jedem Zellen-Klick prüfen; nach Abwahl
  erst neu wählen, dann klicken.
- Route lesen: `state.currentRoute` ist null bis zur ersten Pflanze/Tile — danach Dijkstra-
  Wegpunkte; erster Wegpunkt zeigt die gewählte Rand-Linie sofort (y=0.5 ⇒ T1-Muster).
- OCR: `python3 ~/.config/lifeseedlab/qa-ocr.py "$(ls -t ~/.playwright-mcp/*.png | head -1)"`
  nach `browser_take_screenshot` — PSM 6 für Blocktext,deu+eng.
