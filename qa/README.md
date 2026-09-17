# QA-Berichte — LifeSeedLab

> **Dieser Branch (`qa-reports`) ist ein Übermittlungskanal, kein Arbeitszweig.**
> Er trägt ausschließlich QA-Berichte der Spielsessions (gespielt im sichtbaren
> Chrome via Playwright-MCP-Bridge) und das Abhol-Protokoll. HIER NUR QA —
> siehe die QA-Regel am Anfang der `AGENTS.md` auf diesem Branch.

---

## ⚠️ ABHOL-PROTOKOLL (Auftrag an den aktiv arbeitenden Agenten)

**Bevor du einen Task startest — ohne dass dich jemand darum bittet:**

```bash
git fetch origin qa-reports
git log HEAD..origin/qa-reports --oneline -- qa/   # neue Berichte seit deinem Stand?
```

Gibt es neue Berichte unter `qa/`:

1. **Lesen** — jeder Bericht gilt als Eingabe für den anstehenden Task.
2. **Status setzen** — im Bericht den Status des jeweiligen Befunds auf
   `in-arbeit` / `erledigt` / `widerlegt` ändern (kleiner Commit auf `qa-reports`,
   Betreff `docs(qa): status <bericht> <befund>`).
3. **Erst dann** mit dem eigentlichen Task beginnen.

**Verankerung:** ✅ bestätigt (17.09.2026) — die QA-Abhol-Pflicht steht in der
`AGENTS.md` auf `main` („QA-Abholung vor Task-Start (PFLICHT)“), Commit `70c93a8`.
Der offene Auftrag ist damit erledigt und wird nicht mehr mitgereist.

---

## Bericht-Index (aktuelles Paket)

| Datum | Bericht | Befunde | Status |
|---|---|---|---|
| 2026-09-17 | [Spielfluss-Audit (v0.0.38)](2026-09-17_spielfluss-audit.md) | F1/F2/F4 in-arbeit (DEV-Antworten im Bericht), F3 erledigt + QA-nachgeprüft (main 936afc7), Q3 erledigt (Design) | in-arbeit |
| 2026-09-17 | [Verifikation v0.0.47](2026-09-17_verifikation-v0.0.47.md) | Q13 widerlegt (Messartefakte), Q1/Q2/Q3/Q4/Q5 erledigt bestätigt, R1 → **3/3 in Folgebericht**, N1–N3 Kandidaten | in-arbeit (DEV: R1-Bewertung übernommen, F1/F2 laufen) |
| 2026-09-18 | [R1-Formalisierung (v0.0.47)](2026-09-18_r1-formalisierung.md) | **R1 3/3 bestätigt, strukturell** (Route konstant Reihe 0, 14 frei/10 blockiert auf derselben Route, kein Block/Angriff, Punkt-leer-Feuer) · **Eigentümer-Entscheid: Map-Builder-Menü als Pflicht-Sequenz** (DEV-Fragen im Bericht) · N2 uneinheitlich, N3 bestätigt, N4 neu (Hinweis-Blase verdeckt Tray) | offen |
| 2026-09-18 | [Wirksamkeits-Check (v0.0.49)](2026-09-18_wirksamkeits-check.md) | **N4 (Eigentümer-#1) = 3/3, NICHT behoben** (Leiste unverändert über Tray, kein Commit) → Priorität HOCH · F1/F2 live verifiziert wirksam · Matrix aller Befunde · Prozess-Korrektur: Eigentümer-Punkte = eigener Befund | offen |
| 2026-09-18 | [F5 — F2-Regression (v0.0.49)](2026-09-17_f5-f2-regression.md) | **F2 wird zur regression zurückgezogen (3/3):** Blasen-RAHMEN fängt Cue-Klicks (2529 px² Verdeckung, nur Karten-Ecken frei) — Fix `6bbf286` verfehlt eigenen Vertrag, Unit-Grün deckt Fall nicht · F1 bleibt wirksam · B38 unit-verifiziert (3/3) · Testlücke + Fix-Weg benannt | offen |
| 2026-09-17 | [Status-Abgleich v0.0.42 (70c93a8)](2026-09-17_status-v0.0.42.md) | Q12/Q6/F3 erledigt, Q13/Q14 neu (Kandidaten), Q11 3/3 | in-arbeit |

## Archiv (abgeschlossene/alte Berichte)

Berichte mit Q-Nummern liegen unter `qa/archiv/` und bleiben Referenz:

| Datum | Bericht | Befunde | Status |
|---|---|---|---|
| 2026-09-17 | [Onboarding-Runde 1 (v0.0.37)](./archiv/2026-09-17_onboarding-runde1.md) | Q1–Q5 | offen |
| 2026-09-17 | [v0.0.38 Greenhouse-Crash (ae64493)](./archiv/2026-09-17_v0.0.38-greenhouse-crash.md) | Q6 (kritisch, 4/3) | erledigt (main: healEntryLoop) |
| 2026-09-17 | [Runde 2 — Weg-Lenkung (Erfolg)](./archiv/2026-09-17_runde2-weg-lenkung.md) | Q7 (vorläufig), Q8 (Kandidat 0/3) | offen |
| 2026-09-17 | [Mobile 390×844 — DoD-Prüfung](./archiv/2026-09-17_mobile-390x844.md) | Q9 (3/3), Q10 (Fußnote), Q11 (0/3) | offen |
| 2026-09-17 | [Q12 — Leih-Spross erreicht Tray nicht](./archiv/2026-09-17_q12-leihspross-tray.md) | Q12 (hoch, 3/3) | erledigt (main: Run-Loadout trägt Leih-ID — Deckung mit F3/D2) |

## Status-Begriffe

- `offen` — neu, ungelesen oder unbearbeitet
- `in-arbeit` — ein Agent hat den Befund übernommen
- `erledigt` — Fix ist auf `main` gelandet (Commit-Hash im Bericht vermerken)
- `widerlegt` — Befund war nicht reproduzierbar (Begründung im Bericht)

## Meldewege

Berichte entstehen aus beobachteten Spielsessions (Mensch beobachtet, Agent spielt).
Neue Berichte landen als `qa/YYYY-MM-DD_<titel>.md` direkt auf diesem Branch —
immer mit: Kontext (Version/Commit, Browser, Profil), Befunden mit Schwere,
Repro-Schritten und einer Positiv-Liste (was explizit funktioniert hat).

