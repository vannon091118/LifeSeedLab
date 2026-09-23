# QA-Berichte — LifeSeedLab

> **Dieser Branch (`qa-reports`) ist ein Übermittlungskanal, kein Arbeitszweig und kein Archiv.**
> Er trägt QA-Berichte aus Spielsessions und das Abhol-Protokoll. HIER NUR QA —
> die QA-Regel steht am Anfang der `AGENTS.md` auf `main`.

---

## ⚠️ ABHOL-PROTOKOLL (Auftrag an den aktiv arbeitenden Agenten)

**Bevor du einen Task startest — ohne dass dich jemand darum bittet:**

```bash
git fetch origin qa-reports
git log HEAD..origin/qa-reports --oneline -- qa/   # neue Berichte seit deinem Stand?
```

Liegt ein neuer Bericht unter `qa/`:

1. **Lesen** — jeder Bericht gilt als Eingabe für den anstehenden Task.
2. **Status setzen** — im Bericht den Status des jeweiligen Befunds auf
   `in-arbeit` / `erledigt` / `widerlegt` ändern (kleiner Commit auf `qa-reports`,
   Betreff `docs(qa): status <bericht> <befund>`).
3. **Erst dann** mit dem eigentlichen Task beginnen.

---

## 🔁 KONSOLIDIERUNG (Abschluss eines Berichts — der normale Ablauf)

Ein Bericht ist **Arbeitspapier, keine Historie**. Sobald seine Befunde abgearbeitet sind,
wird er überführt und von hier **entfernt** — dieselbe Sache darf nicht an zwei Orten leben:

| Wohin | Was |
|---|---|
| `docs/process/devlog/` (auf `main`) | ein Eintrag je Bericht: Datum, Version/Commit, Befunde, Umsetzung mit Beleg, was offen blieb (Krix' Stimme, gleiche Anatomie, nie gleiches Layout) |
| `docs/process/ROADMAP.md` §3 (auf `main`) | jeder **offen gebliebene** Punkt, mit fortlaufender P-Nummer, Beleg und Owner |
| `docs/quality/contracts/<domäne>.md` (auf `main`) | die **Regel** hinter einem erledigten Befund, damit sie nicht wieder verschwindet |

Danach: Datei hier löschen (`git rm qa/<bericht>.md`) und die Löschung committen —
Betreff `docs(qa): <bericht> in den Devlog ueberfuehrt <main-sha>`.
Begründung: Der Devlog ist selbsttragend (er nennt Version, Commit und Messwerte), die
Roadmap hält die Arbeit, der Contract die Regel. Was hier bleibt, ist der **Kanal**.

Werkzeug dafür (Zweig-Wechsel verboten, Punkt 0b im Runbook):

```bash
git worktree add --detach /tmp/qa-consolidation origin/qa-reports
# Dateien entfernen/ergänzen, dann:
git -C /tmp/qa-consolidation add -A
git -C /tmp/qa-consolidation commit --no-verify -m "docs(qa): ..."   # kein Shinon auf diesem Branch
git -C /tmp/qa-consolidation push origin HEAD:qa-reports
git worktree remove /tmp/qa-consolidation
```

---

## Aktive Berichte

- `2026-09-23_nachverifikation-v0.0.96.md` — T1/T2/T3 erledigt (R2-Neubau wirkt), W1/W2 offen (persistente Welt), Q5 in-arbeit.
- `2026-09-23_taktik-mazing-v0.0.96.md` — Mazing wirkt: +10 Tiles Maze-Gewinn, 1 Kill-Box-Leihe haelt bis Welle 7; B1/B3 Design-Fragen.
- `2026-09-23_oekonomie-w1-besitzmodell.md` — W1 erledigt: kein Gratis-Loop, Besitz-Modell schliesst exakt (Kauf=Besitz, Bau=Verbrauch, Verkauf=Rueckgewinn).
- `2026-09-23_kipppunkt-welle10.md` — B2 erledigt: Kipppunkt Welle 10 (HP-Sprung 94->375), Leihe allein traegt bis 9; N1 offen (Tank-Leak-Kosten).

## Status-Begriffe

- `offen` — neu, ungelesen oder unbearbeitet
- `in-arbeit` — ein Agent hat den Befund übernommen
- `erledigt` — Fix ist auf `main` gelandet (Commit-Hash im Bericht vermerken)
- `widerlegt` — Befund war nicht reproduzierbar (Begründung im Bericht)
- `als Design-Frage übergeben` — Bewertungshoheit liegt beim Eigentümer/DEV

## Meldewege

Berichte entstehen aus beobachteten Spielsessions (Mensch beobachtet, Agent spielt).
Neue Berichte landen als `qa/YYYY-MM-DD_<titel>.md` direkt auf diesem Branch — immer mit:
Kontext (Version/Commit, Browser, Profil), Befunden mit Schwere, Repro-Schritten (3/3-Regel)
und einer Positiv-Liste (was explizit funktioniert hat).

**Eigentümer-Punkte bekommen eine eigene Befund-Nummer** mit eigenem Repro und eigener
Zeile — niemals als „Nebenbefund" in einem Sammelbericht.

Die Chronologie der Sessions 17./18.09.2026 (Q1–Q19, F1–F6, R1, T1–T3, N2–N4) liegt
vollständig in `docs/process/devlog/` auf `main` — dieser Kanal ist seither leer, weil
alles überführt ist.
