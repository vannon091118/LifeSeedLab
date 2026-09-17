# Q12 — Leih-Spross erreicht das Spielfeld nicht (v0.0.38, ae64493)

**Datum:** 2026-09-17 · **Gerät:** QA-Gerät, sichtbares Chrome 153 via MCP-Bridge
**Version:** v0.0.38 · **Commit:** `ae64493` (main) · **Fläche:** Release (ohne `?dev=1`)
**Methode:** Warteschleifen-Batch (i18n, Persistenz, Frischzustand) → Fund im Frisch-Profil,
dann 3 formale Repro-Zyklen nach Protokoll.

---

## Q12 — Einstiegs-Loop: Leih-Spross erscheint nie im Tray (3/3) · Schwere: hoch

### Befund

Ein frisches Profil startet den Run mit **leerem Inventar und leerem Loadout**. Die im
selben Commit gebaute Leih-Pflanze (`loan_sprout`, „Leihgabe" von Krix) ist laut Source in
`meta.variantCounts` gebucht, taucht aber **strukturell nie** in der Platzierungsleiste auf:

- Tray zeigt nur Basistypen + Nachkauf: `Spross×0, Spross+100⚡, Wurzelmauer×0, +80⚡,
  Myzel×0, +120⚡, Blumentopf 15⚡, Weg 5⚡, Findling 20⚡, Deko 3⚡`
- Sim im Run: `inventory: {}`, `loadout: []`, Energie 150, Leben 20
- Kein Eintrag „Leihgabe"/`loan` im Tray (3/3 Zyklen, Release-Fläche)

### Strukturanalyse (nur lesend, für den DEV)

1. `beginRun()` (src/meta/run.ts:40-45) schreibt bei leerem Besitz
   `variantCounts[LOAN_PLANT_ID] = 1` — Meta-Seite korrekt, unit-getestet
   (`entry_loop.test.ts`: `variantCounts[LOAN_PLANT_ID] === 1`).
2. `App.tsx:111-113` hängt `deriveLoanPlant(runId)` an die `savedVariants` des Runs —
   die Variante-Definition ist dem Run bekannt.
3. **Bruchstelle:** Das Run-Loadout kommt aus `meta.loadout` (App.tsx:118) — die Leihe
   landet aber nur in `variantCounts`, **nicht** im Loadout. Und `PlacementTray` leitet
   seine Karten aus dem Loadout/Inventar ab und rendert zusätzlich feste Basistypen —
   eine Variant mit eigener ID (`loan_sprout`) hat schlicht keinen Tray-Slot.
4. Folge: Der Frisch-Spieler kann die Leihgabe nicht auswählen/platzieren. Einziger
   Pflanzenweg im Run ist der **Nachkauf** (Spross 100⚡) — das Startkapital-Design
   („genau 1 Samen = 40 Nektar im Shop") wird so umgangen.

### Repro (3/3, Protokoll: frischer Spielstand + Reload pro Zyklus)

Zyklus = `localStorage.clear()` → Reload → „Spiel starten" → „Endlos-Modus" → Tray + Sim lesen.

| Zyklus | Tray enthält Leihgabe | inventory | loadout |
|---|---|---|---|
| 1 | nein | `{}` | `[]` |
| 2 | nein | `{}` | `[]` |
| 3 | nein | `{}` | `[]` |

### Wirkung

- **Kernfeature des Einstiegs-Loops (v0.0.38) für Frisch-Spieler wirkungslos** — die
  Krix-Erzählung verspricht die Leihgabe, das Feld bleibt leer.
- Workaround existiert (Nachkauf 100⚡), daher „hoch", nicht „kritisch": kein Crash,
  kein Fortschrittsverlust.
- **Gleicher Blind Spot wie Q6:** Unit-Tests prüfen die Meta-Logik (`variantCounts`),
  der Render-Pfad (Loadout → Tray) ist ungetestet. Empfehlung an den DEV: Test, der
  `beginRun` → Run-Mount → Tray-plantIds durchprüft.

---

## Session-Positiv-Liste (Warteschleifen-Batch, alle im echten Fenster verifiziert)

- **i18n-Parität DE/EN:** 15/15 Hub-Karten in beiden Sprachen identisch; Duell-Brett
  (EN „PvP Board") korrekt disabled in beiden Sprachen; Umschalten Start↔Hub verlustfrei.
- **Persistenz-Resilienz:** Reload mitten in laufender Welle 1 → Fortsetzen-Karte korrekt
  („bei Welle 1"), Sim restauriert (Welle 1, prep, 150⚡, 20♥, 0 Pflanzen).
- **Frischzustand-Ökonomie korrekt:** Nektar 40 (= `SEED_SHOP_BASE_PRICE`), Sammlung 0/3,
  keine Fortsetzen-Karte, Bestwelle/Läufe zurückgesetzt.
- **Q9 Zyklus 2/3 formal bestätigt** (frisch + Reload): Tray 911px in 342px — nach
  Zyklus 3 ist Q9 ein voller Befund.
- **DevGate-Diskriminierung dokumentiert (Nachtrag zu Q10):** Unter `?dev=1` erscheint
  das Krix-Intro auf Frisch-Profilen nicht, auf der Release-Fläche doch
  („Field note 1/1") — E2E-Tests, die Onboarding prüfen, müssen deshalb ohne `?dev=1`
  oder mit damit gerechnetem Zustand fahren. Offene Frage an den DEV: Ist der
  DevGate-Sprung des Onboardings beabsichtigt?

## Notizen

- Krix-Tutorial auf Frisch-Profil zeigt **1/1** (nicht 1/10 wie im Alt-Profil) —
  Beobachtung ohne Bewertung, als Frage an den DEV übergeben (evtl. gekürzte
  Frisch-Variante des Tutorials v3).
- Das QA-Profil wurde durch die Repro-Zyklen absichtlich geleert (eigene Testkiste,
  Spieler-Save des Eigentümers unberührt).
