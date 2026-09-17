# Verifikation v0.0.47 (`936afc7`) — Q13-Entscheid, Q1/Q2-Nachtest, Route-Diskrepanz

**Datum:** 2026-09-17 · **Gerät:** QA-Kiste (sichtbares Chrome 153 via MCP-Bridge)
**Version:** v0.0.47 · **main:** `936afc7` · **Viewport:** 1280×860 (Release-Fläche, kein `?dev=1`)
**Methode:** Frisch-Profil-Zyklen (localStorage + sessionStorage + Caches geleert, Reload), echte
Maus-Gesten (pointerdown-Karten, Drag down→move→up), Vor/Nach-Messung gegen `__simRootRef`,
Zellen-Erreichbarkeit via `elementFromPoint === canvas` (Harness-Muster).

---

## 1. Q13 — WIDERLEGT (0/3 nach sauberer Messung; frühere 3/3 waren Messartefakte)

**Ehrliche Buchführung:** Die Q13-Meldung aus der v0.0.42-Session („Leih-Karte reagiert still“)
hielt der 3×-Regel **nicht stand**. Ich habe sie erneut gefahren — mit korrigierter Messtechnik —
und sie **widerlegt**:

| Messfehler damals | Wirkung | Korrektur heute |
|---|---|---|
| Zellen-Taps auf Felder, die vom HUD/Modal verdeckt waren | Klick ging lautlos ins Leere (`elementFromPoint !== canvas`) | Zellen-Erreichbarkeit vor jedem Tap geprüft |
| Auswahl per JS-`click()` gesetzt (Karten sind `onPointerDown`) | Auswahl nie aktiv, Zellen-Tap ohne Modus | Echte Maus auf die Karte, `aria-pressed` verifiziert |
| „Toggle“-Zweitklick hob die Auswahl auf | Still sind 2 Taps = abgewählt | Auswahl-Zustand vor jedem Tap gelesen |
| gameover-Modal verdeckt Tray | „stiller Freeze“ war korrektes Modal-Verhalten | Modal als Ursache identifiziert (kein eigener Befund) |

**Sauberer Ablauf heute (3× bestanden, Details je Zyklus):**
- Zyklus A: Leihe wählen (pressed=true) → Zelle (0,0) → `loan_sprout@0,0`, Inventar konsumiert ✓
- Zyklus B (Diskriminator): frisches Profil, Spross nachgekauft (150→50⚡), Drag → `sprout@0,0` ✓
- Zyklus C: Leihe (3,3) + Spross-**Drag** (4,4) in einem atomaren Lauf → beide platziert ✓

**Diskriminator-Ergebnis:** Regulärer Spross und Leihe verhalten sich **identisch** — kein
leih-spezifischer Defekt, keine Platzierungs-Regression. Q13 = Messartefakt-Kind.
**Konsequenz:** D2/Q12-Status bleibt **erledigt** — und ist jetzt **E2E-belegt** (Karte erscheint,
wählt, platziert, konsumiert Inventar, Notiz 4 hat ihr Blink-Ziel).

## 2. Q1 — bestätigt geheilt (nach eigener Messexkulpation)

**Erste Messung heute (20→8 Leben) war MEIN Fehler:** Ich platzierte nach der alten Weg-Karte
(y=3.5 etc.) — die echte Route läuft aber **woanders** (s. Befund R1). Pflanzen standen außerhalb
der Reichweite (`lastShot: 0`, 0 Kills, 3 Grunts × 4 Schaden = exakt −12).
**Zweite Messung, strategisch korrekt:** Sproß auf (6,0) — direkt an der echten Route →
**Welle 1 überlebt mit 20/20 Leben, alle 3 Grunts getötet** (Energie nach Welle: 122).
Der grunt-Buff (10→4 Schaden) + Welle-1-Reduktion (3 Grunts) trägt im echten Spiel.

## 3. Q2 (Drag-Platzierung) — bestätigt geheilt

Drag-Geste (down → move mit Ghost → up) platziert zuverlässig (`sprout@4,4` und `sprout@6,0`
über Drag bestätigt). Auswahl via Klick, Platzierung via Drag — beide Pfade live verifiziert.

## 4. Konsolenhygiene (Q3/Q4/Q5) — erledigt bestätigt

Komplette Session (Frisch-Profil, 2 Runs, 2 Game-Overs, Tutorial, Tray-Interaktionen):
**0 Fehler, 0 Warnungen** — border-Warnung (Q5) und favicon (Q3) sind weg, keine neuen Einträge.

## 5. NEUER BEFUND R1 — Zwei Weg-Wahrheiten im Brett (hoch, 1/3 formal)

**Beobachtung:** Die Platzierungs-Geometrie (`placementRules.cellRejectReason`) prüft gegen den
**statischen `ENEMY_PATH`** aus `world.source.ts` (Wegpunkt-Kette durch die Feld-Mitte), während
die Gegner die **dynamische Route** laufen (`state.currentRoute`, von mapSystem generiert, im
heutigen Run: komplette **Reihe 0**). Der Renderer zeichnet die dynamische Route (Terrain-Bake an
`state.currentRoute`) — **Regelwerk und Sichtbild sind getrennt.**

**Konsequenzen im Spiel:**
- Reihe 0 ist regel-konform frei, aber **auf der aktiven Route**: Scan heute: 108 freie Zellen,
  **24 in Sprout-Reichweite der Route, teils mit d=0.0 AUF dem Weg** (u. a. 0,0 / 1,0 / 3,0 / 4,0 …).
- Pflanzen AUF der Route blockieren nichts (Gegner laufen durch/über sie hindurch — kein
  Kontakt-Effekt, kein Block beobachtet) — aber sie können von Gegnern **angegriffen** werden?
  (ungeprüft, Folgefrage)
- Umgekehrt: Der statische `ENEMY_PATH` (über Feld-Mitte) sperrt 36 Zellen, die die Gegner
  **nie** berühren — frustrierende „Warum kann ich hier nicht bauen?“-Zonen.
- Quasi-Blocken bleibt möglich: 24 Zellen in Reichweite-3-Pyramide an der Route, d=0-Zellen
  erlauben Punkt-leer-Schüsse (design-offen, DEV-Frage).

**Repro:** 1/3 — Session-Scan + Welle-1-Lauf heute; **nicht** 3×-formal, meldungshalber als
Struktur-Befund mit Source-Beleg (zwei Wahrheiten im Code lesbar), nicht als intermitter Bug.
DEV-Frage: Bewusst (Korridor-Spiel) oder Drift (D1-Refactor hat die Regel-Lesequelle verabsäumt)?

## 6. Team-Kanal: F1–F4-Q, Q3 gelesen — Antwort auf F3-Forderung

DEV-Status-Commit `041eeed` gelesen. F3 verlangte explizit den Frisch-Profil-Nachtest —
**erledigt** (s. Abschnitt 1 + 2: Karte erscheint, E2E-Platzierung OK, Welle 1 mit Leih-Spross
allein? — nein: Welle 1 überlebte mit gekauftem Spross; Leih-only-Variante folgt als offener
Punkt, da mein (3,3)-Standort laut alter Weg-Karte gewählt war und still scheiterte — jetzt als
R1-Opfer verstanden). F1/F2/F4 (in-arbeit) liegen aus QA-Sicht unauffällig; F4-Tray-Labels
bleiben deutsch (bekannt, F4-Item läuft).

## 7. Nebenbeobachtungen (Kandidaten, 0/3)

- **N1:** Nach ley-Kauf im gameover: Tray friert (Modal korrekt), aber der Nachkauf-Klick
  verschlingt keinen Toast — Verhalten konsistent mit Modal-Deckung, kein eigener Befund.
- **N2:** Leih-Karte verschwindet bei Bestand 0 komplett aus dem Tray (Basistypen bleiben mit
  ×0 + Nachkauf) — UX-Inkonsistenz, Kandidat.
- **N3:** `loan_sprout`-Karte zeigt Roh-ID statt sprechendes Label (F4-Familie, Kandidat).

---

**Offene Punkte fürs nächste Paket:** R1 auf 3× formalisieren (Route je Run-Seed variieren?),
Leih-only-Welle-1-Nachtest, N2/N3 bewerten, F1/F2-Nachtests sobald DEV liefert.
