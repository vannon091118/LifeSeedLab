# Verifikations-Nachweis — F1/F2 verhalten sich NICHT korrekt (F2-Regression)

**Datum:** 2026-09-18 (Session 00:15–00:55 UTC) · **Gerät:** QA-Kiste
**Version:** v0.0.49 · **main:** `6bbf286` · **Worktree beim Test:** `main` (Titel-Check bestanden)
**Anlass:** Verhaltens-Verifikations-Auftrag des Eigentümers („nicht nur Rendering — Verhalten
behaupten heißt Verhalten zeigen"). Preview-Tab als unabhängiger Repro (1280×860).

**Rolle dieser Meldung:** Mein gestriger Wirksamkeits-Check hatte F1/F2 als „✅ wirksam" geführt —
**diese Aussage wird hier zurückgezogen.** DerStamp basierte auf einer Einzelpunkt-Messung
(Kartenmitte), die zufällig neben der Blase lag. Nach voller Zonenmessung gilt F2 als
**REGRESSION: der F1/F2-Fix (`6bbf286`) verfehlt sein eigenes Versprechen.**

---

## Befund F5 — F2-Regression: Blasen-RAHMEN fängt weiterhin die Cue-Klicks (3/3)

**Source-Wurzel (nur gelesen):** `SpeechBubble.tsx` — der F2-Fix macht nur den **Textkörper**
durchlässig (`bodyGhost: pointerEvents:'none'`, Zeile 160). Aber `styles.frame` (Zeile 94) setzt
**`pointerEvents: 'auto'` auf die GESAMTE Blase** (340 px Breite) — Header, Pfeil-Hinweis
(`cueHint: pointerEvents:'none'` — ok), Footer mit **Skip** und der Rahmen selbst fangen jeden
Klick, der die Blasen-Fläche trifft. Ein „kollabierter" Cue-Schritt ist trotzdem eine
~340×200-Verdeckungszone mit `pe:auto`.

**Live-Zonenmessung (3 unabhängige Frisch-Durchläufe, identisches Bild):**

| Messung | Wert |
|---|---|
| Kollabierte Blase | 340×199 px, `frame pointerEvents: auto` |
| Cue-Ziel Notiz 4 (`data-tut="card"`, loan_sprout×1) | 91×66 px |
| **Überlappung Blase ⇄ Karte** | **2529 px² (~42 % der Kartenfläche)** |
| Treffer-Zonen der Karte | Mitte → **Blase (Krix-Header)** · oben-links → **Skip-Button der Blase** · unten-links → **Karte frei** · unten-rechts → Nachbar-Karte (Blumentopf, weil Blase die Karte überdeckt) |
| Echter Klick auf die Karte (Mitte) | landet auf `DIV.tut-bubble` — **Karte nicht wählbar** (`aria-pressed` bleibt false) |
| Notiz 3 (Cue „endless") | Blase verdeckt die Endlos-Karte ebenfalls (Überlappung gemessen); nur Element-Klicks an freien Ecken kommen durch |

**Warum es trotzdem „funktionieren kann":** Unten-links der Karte bleibt frei — ein Spieler, der
exakt dort tippt, wählt die Karte. Das ist der Grund, warum gestrige Mittelpunkt-Messungen
zufällig grün waren. **Aus Spielersicht:** das blinkende Ziel ist zu 42 % von einer Fläche
bedeckt, die den Klick frisst — „das Spiel ignoriert mich".

**Repro:** 3/3 (drei Frisch-Durchläufe: Sprache → Start → Endlos → Notiz-4-Zonen; plus
Notiz-3-Verdeckung im ersten Lauf). Pfad und Messwerte oben.

**Erwartung (DEV):** `cueMode` muss die **ganze Blase** durchlässig machen — nicht nur den
Textkörper. Konkret: `styles.frame` im cueMode `pointerEvents: 'none'` und nur die wirklich
interaktiven Kinder (Skip-Button, ggf. Expand) wieder auf `auto`. Alternativ: Blase im Cue-Modus
positionell vom Ziel wegschieben. Vertrag-Test ergänzen: „im cueMode ist KEIN Punkt der
Cue-Ziel-Fläche durch ein Blasen-Element verdeckt" (Zonen-Scan wie hier gemessen).

## Befund F6 — Klick-Ambiguität durch Verdeckung (Folge von F5, 1/3 Kandidat)

Wenn die Blase Teile zweier Tray-Karten überdeckt (Beobachtung: unten-rechts von loan_sprout
liefert „Blumentopf"), kann ein Spieler, der die blinkende Karte treffen will, versehentlich den
Nachkauf des Nachbar-Typs auslösen (Blumentopf = 15⚡). Einzelmessung, noch nicht 3× — als
Kandidat markiert, wird durch F5-Fix obsolet oder muss neu bewertet werden.

## Was ich zusätzlich geprüft habe (Verhalten, nicht Rendering)

- **Typecheck:** `tsc -b --noEmit` → 0 Fehler.
- **B38-Verhalten (unit, echte Sim):** `maze_loan.test.ts` → **3/3 grün** (Leihe taxiert
  identisch in PLANT_ROUTE_COST; Root-Konstruktion wie App.tsx).
- **F1/F2-Vertragstests (unit):** `components_tutorial.test.ts` → **26/26 grün** — die Tests
  decken den Rahmen-PE-Fall NICHT ab (sie prüfen Kollaps + bodyGhost, nicht die Treffer-Zonen
  des Ziels). Deshalb die Regression unit-seitig unsichtbar. Testlücke im DEV-Fix benannt.
- **Preview-Konsole:** 0 Fehler/0 Warnungen (nur Vite/React-DevTools-Hinweise).
- **Vite-Module:** alle Sim-Module laden sauber (304er-Cache, keine Fehler).
- **Mechanik-Skript** (`node /tmp/qa-mechanik.mjs`, Original-Sources): R1-Zellenbild nachgeprüft
  (statische Fallback-Geometrie: 10 freie / 2 blockierte Route-Zellen bei d≤0.75 — konsistent
  mit R1; die 14/10 aus dem Spiel-Scan nutzen Zell-Untermengen der Wegbahn, kein Widerspruch,
  aber der Scan-Korridor ist enger als gedacht → Fußnote im R1-Bericht wert), Welle-1-Ökonomie
  plausibel (3 Kills in 550-Tick-Lauf), B38-Test existiert, F4-Labels deutsch in Source,
  **A5-Correction:** Tray rendert Leihe generisch über `plantIds` (GameView:221
  `…Object.keys(PLANTS_SOURCE), …loadout`) — kein hartes „loan" im Tray-Code; Q12/F3 bleiben
  korrekt verifiziert (Karte kam im Live-Test aus dem Loadout), nur meine Skript-Heuristik war
  zu grob.

## Status-Korrekturen im Index (Team-Kanal)

- F2: `erledigt` → **regression (F5, 3/3)** — DEV-Fix nötig (frame-PE im cueMode).
- F1: bleibt `erledigt` (Pfeil-Hinweis verhält sich korrekt).
- Mein gestriger „✅ wirksam"-Eintrag für F2 wird als Messfehler dokumentiert (Einzelpunkt-Stichprobe).

**An den DEV (Aktion: DEV):** F5 ist ein Ein-Zeilen-Klassen-Fix, aber bitte mit Zonen-Vertragstest
absichern — sonst schlägt die nächste Blasen-Position wieder zu (siehe F2-Geschichte: 1/3 → 3/3).

---

## Nachtrag (gleiche Session, 4. Zyklus + F6-Zyklus 1 + R1-Zahlen-Abgleich)

**F5 = 4/4:** Vierter unabhängiger Zyklus (Reload, Notiz 4) — identisches Bild: frame `auto`,
2529 px² Verdeckung, Zonen Mitte/oben-links/unten-rechts blockiert, nur unten-links frei.
**Die Regression besteht in v0.0.49 unverändert.**

**F6 korrigiert UND validiert (Zyklus 1/3):** Die erste Beschreibung („versehentlicher
Nachkauf“) war falsch — das echte Verhalten: Klick auf die blinkende Karten-Zone (unten-rechts,
verdeckt) wählt **die Nachbar-Karte aus** (Blumentopf `pressed=true`, Ziel-Karte `pressed=false`,
Energie unverändert — Auswahl ist gratis, Kosten kämen erst beim Platzieren). Verwechslungs-
gefahr real und messbar. 2 Zyklen offen bis Formalisierung.

**R1-Zahlen-Abgleich (Fußnote aus dem ersten Absatz präzisiert):** Headless-Nachrechnung
mit der Original-Geometrie aus `world.source.ts` (geparst, nicht gehardcoded):
- **Eckpunkt-Definition** (= Spiel-Scan): **exakt 14 frei / 10 blockiert** — identische Zellen
  wie die Live-Scans von v0.0.47 und v0.0.49. **R1-Zahlen BESTÄTIGT.**
- **Zentrum-d≤0.75-Definition** (= mein grobes Skript, das die „Abweichung“ meldete):
  10/2 — die Reihe-1-Randzellen zählen hier nicht zur Wegbahn.
- Fazit: Definitions-Frage, kein Messfehler; die R1-Kernaussage (frei UND blockiert auf
  derselben aktiven Route) gilt in beiden Definitionen.
