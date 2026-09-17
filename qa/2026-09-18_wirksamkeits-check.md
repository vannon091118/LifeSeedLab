# Wirksamkeits-Check — Wirken die Fixes beim Spieler? (v0.0.49, `6bbf286`)

**Datum:** 2026-09-18 · **Gerät:** QA-Kiste (sichtbares Chrome, MCP-Bridge) · **Viewport:** 1280×860
**Anlass:** Eigentümer-Frage (wörtlich): *„Check, ob alle QA-Runden und Fixes wirklich zielführend
sind — die Leiste unten hat sich 0 verändert, das war mein absoluter #1-Punkt heute."*
**Methode:** Abholprotokoll (3 neue main-Commits gelesen), Fix-Quellen gegen die gemeldeten
Befunde gelegt, dann Live-Messung im echten Spiel (Frisch-Profil, Release-Fläche, echte Maus,
`elementFromPoint`-Disziplin).

---

## 1. Der Eigentümer-#1: N4-Leiste hat sich WIRKLICH 0 verändert

**Live-Messung v0.0.49 (Frisch-Profil, Run-Screen, vor erster Platzierung):**

| Größe | Wert |
|---|---|
| Hinweis-Leiste („Tap a plant below, drag the ghost…") | x=309, **y=580–642**, 618×62 px |
| Tray (Pflanzenauswahl) | **top=582**–704 |
| **Überlappung** | **JA — die Leiste liegt auf der oberen Kartenhälfte** |
| Karten-Mitte („Spross") | klickbar (Leiste ist `pointer-events:none`) — aber die obere Hälfte der Karten ist **visuell verdeckt** |

**Fazit: Bestätigt — die Leiste ist seit der Meldung (18.09., früher) NICHT angefasst worden.**
Quellen-Beleg: `gameViewStyles.ts:32` — `firstRunHint: { … bottom: 84, zIndex: 3 … }` hängt
exakt über dem Tray; kein Commit seit `936afc7` berührt `firstRunHint`/`paperNote`/`game.hint`.
Der letzte sichtbare Zustand dieser Fläche stammt aus der P3QA-05/B36-Ära („steht nur bis zur
ersten Platzierung") — die *Logik* wurde verbessert, die *Position* nie.

**Prozess-Fehler, ehrlich benannt:** Der Eigentümer meldete diese Leiste als **#1-Punkt des
Tages** — und ich habe sie als **„N4, Nebenbefund, 2/3"** in den R1-Bericht eingebettet, statt
sie als eigenen, priorisierten Befund zu führen. Die Staffelung „Hauptbefund vs. Nebenbefund"
war mein Urteil, nicht das des Eigentümers. **Konsequenz (ab sofort):** Was der Eigentümer
explizit benennt, bekommt eine eigene Befund-Nummer, eigenen Repro-Zyklus und einen eigenen
Status im Index — es wird nicht in Sammelberichten begraben. (Verankert im Runbook, Punkt 5.)

## 2. Wirksamkeits-Matrix — alle gemeldeten Befunde gegen main `6bbf286` (v0.0.49)

| Befund | DEV-Claim | Live-Verifikation heute | Wirksam? |
|---|---|---|---|
| **N4 Leiste verdeckt Tray** (Eigentümer-#1) | — **kein Commit** | Leiste unverändert über Tray (Messung oben) | ❌ **NICHT BEHOBEN** |
| **F1** Krix: kein Vorwärts-Signal | Pfeil-Hinweis im Cue-Modus | Notiz 4 zeigt **„→ Tap the blinking target"** sichtbar unter der Notiz | ✅ wirksam |
| **F2** Blase blockiert Cue-Ziel | Blase kollabiert + pointer-durchlässig | Notiz 4: Blase (209 px) liegt **über dem Tray** (bottom 512 < 582) und die Ziel-Karte `data-tut="card"` (`loan_sprout×1`) ist **frei klickbar** (`elementFromPoint` trifft die Karte) | ✅ wirksam |
| **F3** Tutorial-Deadlock (Q12) | Leihe erreicht Tray | Notiz 4 hat ihr Blink-Ziel (`loan_sprout×1` im Tray, gestern E2E platziert) | ✅ wirksam (E2E aus Vortag + heute Karte sichtbar) |
| **B38** Route-Cost Leihe | loan_sprout kostet identisch | (Unit-Abdeckung DEV; Gameplay-Verifikation folgt im Builder-Kontext) | ◐ unverifiziert im Spiel |
| **Q1** Welle 1 Balance | grunt 10→4, 3 Grunts | Vortag: Welle 1 mit 1 Spross 20/20 überlebt | ✅ wirksam |
| **Q2** Drag-Platzierung | Drag-Pfad | Vortag: Drag down→move→up platziert | ✅ wirksam |
| **Q3/Q4/Q5** Konsole | favicon, border | Vortag: 0 Fehler/0 Warnungen komplette Session | ✅ wirksam |
| **Q6** Greenhouse-Crash | healEntryLoop | (Alt-Profil-Nachtest steht noch aus) | ◐ unverifiziert |
| **R1** Zwei Weg-Wahrheiten | DEV: Bewertung läuft (in-arbeit) | — | ⏳ offen (Map-Builder-Entscheid des Eigentümers ist die Richtung) |
| **F4** Tray deutsch bei EN | i18n-Keys geplant (in-arbeit) | Tray weiter deutsch | ⏳ offen |
| **Q9** Mobile-Tray 911px | — | — | ⏳ offen |

**Bilanz:** Die **Tutorial-/Tutorial-Nachbar-Fixes (F1/F2/F3) sind nachweislich beim Spieler
angekommen.** Die **Layout-Verdeckungs-Familie (N4) ist komplett unbearbeitet** — und genau
dort lag der Eigentümer-#1.

## 3. N4 formal aufwerten (Statuswechsel durch Eigentümer-Anweisung)

- N4 wird aus dem Nebenbefund-Status zum **eigenständigen Befund mit Priorität HOCH** erhoben
  (Eigentümer-#1), Repro 2/3 → **3/3 heute** (Messung oben = dritter unabhängiger Zyklus:
  frisches Profil + Reload, identische Verdeckung).
- **Fix-Vorschlag (unverbindlich, für den DEV):** Leiste über den Tray andocken
  (`bottom` oberhalb der Tray-Kante, z. B. `bottom: 170` statt 84) ODER als schmale Ein-Zeilen-
  Version über der Tray-Überschrift rendern — die Textlänge (618 px Breite) zwingt die
  aktuelle Zwei-Zeilen-Höhe, die genau die Kartenreihe frisst.
- **Koppelfrage an den DEV (Aktion: DEV):** Soll die Leiste mit dem geplanten Map-Builder
  (Eigentümer-Entscheid vom 18.09.) ohnehin umgebaut werden? Dann N4 im Builder-Paket
  mitheilen — aber nur mit festem Termin, nicht als unbestimmte Vertagung.

## 4. Abholprotokoll: Neues auf main (gelesen, eingeordnet)

- `8db80b4` + `e490942` — B38: PLANT_ROUTE_COST-Balance-Datensatz + Leihe-Paritätstest.
- `6bbf286` — F1/F2 (Signal + durchlässige Blase): **wirksam verifiziert** (s. Matrix).
- Kein Commit berührt N4/`firstRunHint` — die Verdeckung wurde weder geplant noch ausgeliefert.

## 5. Runbook-Ergänzung (Prozess-Korrektur)

Punkt 5 (Bericht & Push) um die Eigentümer-Prioritätsregel ergänzt: **Was der Eigentümer
explizit als Punkt benennt, wird als eigener Befund mit eigener Nummer geführt** (Repro,
Status, Index-Zeile) — nicht als Nebenbefund in Sammelberichten.
