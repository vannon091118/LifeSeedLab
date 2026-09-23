# Nachverifikation v0.0.96 — R2-Welt-Neubau, Determinismus, T1/T2/T3-Regression

**Datum:** 2026-09-23 · **Viewport:** 1280×860 + Mobile 390×844 · **Browser:** QA-Chrome (MCP-Brücke, echte Maus)
**Version:** v0.0.96 · **main:** `d924a17` · **Umfang seit letztem Test:** 41 Commits, 352 Dateien, ±34k Zeilen
**Methode:** 3 Frisch-Zyklen Reload→Hub→Endless→Bau→Welle; Sim-Lesezugriff via `__simRootRef`/`getEventLog`;
Quellenlektüre nur zur Vertragsklärung (READ double), kein Code-Input.

---

## Kernbefunde

### T1 — „Rand-Route ignoriert Mauern" — **ERLEDIGT (3/3)**

Der R2-Neubau (`4547aa1` „eigene karte, diagonale route und mazing-verkauf") hat das alte Weg-Modell
komplett gelöscht: keine Wegpunkt-Liste, kein geschützter Korridor, keine Pfad-Marge
(`src/config/world.source.ts`, Kopf-Kommentar „Eigentümer-Entscheid, 2026-09-18"). Es gibt genau eine
Regel: schnellster nicht blockierter Weg, Integritätsregel (`route_blocked`) als einzige Schranke.

Live-Messung, Zyklus 1:

| Schritt | Route (gekürzt) |
|---|---|
| Leeres Brett | `11,0→…→0,0→0,1→…→0,11` (L-Form am Rand) |
| Topf auf (5,0) — direkt auf der Route | `…6,0→6,1→5,1→4,1→…→0,1→0,2…` (**Umlenkung über Reihe 1**) |
| Wand gx=4, gy 2–6 (5 Töpfe) | Route läuft korrekt um die Wand herum |

**Beweis in Bewegung:** Die Gegner von Welle 1 marschierten physisch die umgelenkte Route
(Reihe 1.5 entlang, Kurve bei Spalte 0.5 nach unten) — nicht nur die Routen-Berechnung, das echte
Laufverhalten folgt dem Spieler-Maze. Der zentrale taktische Befund der v0.0.50-Session ist damit
konstruktiv beseitigt: Mazing wirkt.

Zusätzlich verifiziert: `wouldClosePath` existiert und wird in der UI-Vorschau VORAB gefragt
(`placementController.ts`, „Geist wird rot, statt grün zu versprechen") — die Anti-Softlock-Regel
aus dem Mazing-Guide ist als UX-Vertrag eingebaut.

### T2 — „UI verlangt Energie, Sim nimmt gratis" — **ERLEDIGT (konstruktiv)**

Die alte Divergenz ist mit dem Energiesystem selbst gestorben. Bus-Contract (`src/bus/events.ts` #4):
*„`no_energy` ist mit dem Energiesystem gestorben — der POOL entscheidet (`no_material`)"*. Die Sim
(`plantSystem.place`) kostet **Inventar, kein Harz**; UI-Vorschau und Sim lesen dieselbe
`placementRejectReason` (B3-Kommentar: „identische Regel — eine Wahrheit").

Live: Leihe gewählt (`aria-pressed=true`), Platzierung auf (10,6) → `plants 1`, Inventar `loan_sprout 1→0`.
*Ehrlichkeits-Vermerk:* Ein früherer Ablehn-Versuch in dieser Session war mein eigener Bedienfehler
(Platzierungs-Klick ging auf eine belegte Zelle), kein Bug — im ersten Wurf des Tests fehlte die
Selection-Verifikation vor dem Tap.

### T3 — „Tile-Toggle frisst Zellen-Klicks" — **ERLEDIGT (3/3)**

Zyklus 1: eine Auswahl, 5 Platzierungen in Serie (gy 2–6) — jede angenommen, kein Toggle-Abbruch.
Kontroll-Lauf mit Über-Inventar-Buchhaltung (8 Klicks bei 6 Töpfen): Klicks 1–6 platzieren
(Inventar 6→5→4→3→2→1→0, Tray `×5…×1`), Klicks 7–8 sauber abgewiesen, Karte verschwindet bei 0
(`tray: null`), keine Über-Platzierung, kein pressed-Zombie. **Ökonomie-Buchhaltung exakt.**

### Reifungszähler-Drift (aus v0.0.50-Session) — **hält (Stichprobe)**

Ein Run mit manuellem Exit Run: Meta-Zähler verhielt sich sauber; vertiefte Meta-Messung entfiel
diesmal (Umfang des Neubaus), aufrequestscheint der Fix aus `63222e5` unangetastet — DEV kann das
per bestehendem Vertragstest abdecken.

---

## Neue Erkenntnis: Die persistente Welt (R2 „eigene Karte")

Der IndexedDB-Dump zeigt zwei Stores: `run` (Run-Save, Resume-Vertrag) und **`world`** — das
persistente Welt-Layout (`worldSeed`, alle platzierten Töpfe mit Koordinaten). Die Spieler-Maze
**überlebt Runs**; ein neuer Run startet auf der eigenen Karte, Inventar wird frisch aufgefüllt.

**Design-Frage an den DEV (W1, offen):** Welt persistiert, Inventar füllt sich pro Run neu →
permanente Mauern kosten langfristig nichts. Ist das das gewollte „Garten"-Modell (Ausbau/Tokio-Verb),
oder ein Ökonomie-Loch („einmal kaufen, immer da")? Beobachtung, kein Befund — aber es bestimmt,
wie teuer Töpfe im Shop sein dürfen.

**Beobachtung W2 (kosmetisch):** `worldSeed` ändert sich pro Reload (2322239740 → …), obwohl die
Welt „eigen" sein soll — klären, ob der Welt-Seed die Tile-Farben (potBoost: deterministisch pro
Zelle, `potBoost.ts`) oder nur die Struktur determiniert.

---

## Determinismus-Linse

- **Welle 1 konstant:** 3 Gegner à 46 HP in **jedem** Frisch-Run (3 Zyklen) — trotz verschiedener
  Run-Seeds (2447771834 / 1310613787 / 2990130336). Die Wellen-Skripte sind seed-unabhängig
  strukturiert, die Spawns identisch.
- **localeCompare-Fix (`b4bb092`):** Code-Unit-Ordnung + `plant_ref` statt `plant_hmac` im Source
  gelesen; live nicht direkt messbar (kein Hash-Export im UI), aber der Commit-Kontext
  (genome_hash, Zustands-Hash, Dijkstra-Tie-Break) deckt genau die Stellen ab, die der
  AGENTS-Determinismus-Absatz fordert. Gate-Regel „Deterministische Reihenfolge" trägt den Fix.
- **Float-Exaktheit:** `world.source.ts` nutzt nur `Math.sqrt`/Multiplikation (`dist2`) — konform.

## Gameplay-Linse

- **R2-Spielfluss:** layout → Start Wave → wave → prep; Bau nur zwischen Wellen
  („Wellen-Sperre", `rootCommands.ts`: `PLACE_PLANT`/`PLACE_TILE` in `wave` → `wave_active`-Reject).
  Juggling (mid-Wave-Routen-Kipp) ist bewusst geschnitten — dokumentierte Entscheidung (AP2/M1).
- **D1-Drift-Fix wirkt:** `PLACE_PLANT` ruft `recomputeRoute` sofort — Pflanzen biegen den Laufweg
  zwischen den Wellen real (kommentierter Defekt aus dem Review, live nicht negativ auffällig).
- **Leak-Ökonomie:** Welle 1 ohne Verteidigung: lives 20→8, score 0. Schaden pro Käfer gewichtet
  (`damage`-Feld) — Balance-Eindruck: unverteidigt ist Welle 1 überlebbar, aber teuer. Passt zum
  Onboarding (Krix führt zum ersten Spross).
- **Tray-Sektionen:** PLANTS/FIELD-Trennung, „Sellmaterial back" — Verkaufspfad sichtbar.

## UI/UX-Linse

- **Mobile 390×844:** overflow-x 0, Canvas 366×672 bei y=162, Tray frei darunter (PLANTS/FIELD bei
  y=708, Karten y=744) — keine Verdeckungen, alte N4-Geometrie hält auch im neuen Layout.
- **a11y:** Karten tragen `aria-pressed` (Auswahl) und `aria-disabled` (geleert) — Q17-Muster wirkt fort.
- **Konsole:** Nur die bekannte React-border-Warnung (Q5-Kandidat: „mix shorthand and non-shorthand
  properties … Removing borderColor border", 4× derselbe Typ). **Kein neuer Konsolenbefund.**
- **Hub:** Neue Menü-Struktur (Greenhouse, Shop, Brood Chamber, Public Codex, PvP Board) —
  „⚔️ PvP Board" ist neu und war nicht Teil dieses Durchlaufs (eigener Bericht, wenn der DEV es freigibt).

## Devlog-Verknüpfung

Die 18 überführten Berichte (`afc657b`) decken die Historie; dieser Bericht ist die erste
Nachverifikation des Neubaus. Status der Alt-Befunde: T1 erledigt (dieser Bericht, 3/3),
T2 erledigt (konstruktiv), T3 erledigt (3/3), Q5 bleibt in-arbeit (bekannte React-Warnung).

---

## Offene Punkte (für die Status-Commits des DEV)

| ID | Punkt | Status |
|---|---|---|
| W1 | Persistente Welt + frisches Inventar: gewolltes Modell oder Ökonomie-Loch? | erledigt (Beantwortung: `qa/2026-09-23_oekonomie-w1-besitzmodell.md` — Besitz-Modell schließt exakt, kein Gratis-Loop) |
| W2 | `worldSeed` wechselt pro Reload — was determiniert er? (potBoost-Farben?) | offen (Klärung, kein Owner im Task 23.09. Navigation) |
| Q5 | React-border-Warnung (shorthand/non-shorthand mix) | in-arbeit (alt, kein Owner im Task 23.09. Navigation) |
| Pn | „PvP Board" im Hub ungetestet | offen (Folgetermin, kein Owner im Task 23.09. Navigation) |
