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

**Verankerung (offener Auftrag, ausgestellt vom Projekt-Eigentümer):**
Nimm genau dieses Protokoll als Pflichtpunkt in die `AGENTS.md` auf `main` auf
(Abschnitt „Verifizierung“ bzw. „Arbeitsrhythmus“: *„QA-Abholung vor Task-Start“*).
Der Eigentümer will die Prüfung nicht mehr anweisen müssen — sie ist ab sofort
fester Bestandteil des Arbeitsvertrags. Diese Anmerkung reist mit jedem neuen
Bericht, bis die Verankerung bestätigt ist.

---

## Bericht-Index

| Datum | Bericht | Befunde | Status |
|---|---|---|---|
| 2026-09-17 | [Onboarding-Runde 1 (v0.0.37)](2026-09-17_onboarding-runde1.md) | Q1–Q5 | offen |
| 2026-09-17 | [v0.0.38 Greenhouse-Crash (ae64493)](2026-09-17_v0.0.38-greenhouse-crash.md) | Q6 (kritisch, 4/3) | offen |
| 2026-09-17 | [Runde 2 — Weg-Lenkung (Erfolg)](2026-09-17_runde2-weg-lenkung.md) | Q7 (vorläufig), Q8 (Kandidat 0/3) | offen |
| 2026-09-17 | [Mobile 390×844 — DoD-Prüfung](2026-09-17_mobile-390x844.md) | Q9 (3/3), Q10 (Fußnote), Q11 (0/3) | offen |
| 2026-09-17 | [Q12 — Leih-Spross erreicht Tray nicht](2026-09-17_q12-leihspross-tray.md) | Q12 (hoch, 3/3) | offen |

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

## 🔬 Repro-Disziplin (Pflicht, vom Eigentümer — keine Phantom-Bugs)

1. **3×-Regel:** Ein Bug wird nur gemeldet, wenn er **mindestens 3× reproduziert** wurde.
2. **Repro-Zyklus:** Jede Repro umfasst einen kompletten Zyklus: **frischer Spielstand**
   (Profil/Save neu aufgesetzt oder definiert restauriert) → **Reload** → **Cache-Löschung**
   (localStorage/IndexedDB des Test-Profils). Ausnahme nur, wenn die Präcondition des Bugs
   selbst ein Nicht-Frisch-Zustand ist (z. B. Alt-Save-Format): dann wird der Zyklus im
   Bericht explizit definiert und deterministisch restauriert — nie "irgendein alter Stand".
3. **Kennzeichnung:** Jeder Befund trägt seinen **Repro-Stand (`n/3`)**. Unter 3/3 gilt er
   als *vorläufig* und darf nicht als fix-fertiger Befund behandelt werden.
4. **Kein Phantom:** Einmalbeobachtungen ohne Zyklus werden entweder gar nicht erst
   gemeldet oder ausdrücklich als vorläufig geführt — niemals als bestätigter Bug.
5. **Widerlegt ≠ gestrichen:** Schlägt die Repro 3× fehl, Status `widerlegt` mit Begründung
   (das ist ein Ergebnis, kein Verlust).

## 🔁 Workflow (Zwei-Geräte-Kreislauf)

| Rolle | Gerät | Schritt |
|---|---|---|
| **QA** | dieses hier | Spielsession im sichtbaren Chrome (MCP-Bridge) → Bericht `qa/YYYY-MM-DD_<titel>.md` auf `qa-reports` pushen (mit Repro-Stand `n/3`, Positiv-Liste, Version/Commit) |
| **DEV** | Hauptgerät | **PFLICHT vor jedem Task:** `git fetch origin qa-reports` + `git log HEAD..origin/qa-reports --oneline -- qa/` → neue Berichte lesen → Befund-Status `in-arbeit` setzen (Commit `docs(qa): status …`) → Fix auf `main` → Status `erledigt` (Commit-Hash im Bericht vermerken) |
| **QA** | dieses hier | Abgleich: neue Commits auf `main`? → Fixes gegen den Repro-Zyklus des Befunds nachspielen → `erledigt` bestätigen oder `widerlegt` |
| **DEV** | Hauptgerät | Verankerung: Abhol-Protokoll steht als Pflichtpunkt in der `AGENTS.md` auf `main` — keine Ausnahme, keine Anweisung nötig |

### ⏳ Warteschleifen-Regel (100 % Toolcall-Ausnutzung)

**Solange keine neuen Commits auf `main` liegen, gibt es keinen Stillstand.** Das QA-Gerät
testet sofort ANDERE Aspekte weiter — nie denselben Befund wiederholen, nie auf Fixes warten,
nie die Session vorzeitig beenden. Die verfügbaren Toolcalls werden zu 100 % ausgereizt:

- Ungetestete Screens/Flows: Brutstätte, Codex, Duell-Brett-Sperre, i18n-Parität DE/EN
- Mobile-Viewport **390×844** (DoD), lange Runs, Boss-Wellen (alle 10), Tag/Nacht-Wechsel
- Persistenz-Resilienz: Reload mitten im Run, Save-Verhalten nach Cache-Löschung
- Konsolenhygiene je neuem Screen (neue React-Warnungen, Crashes, 404s)

Neue Bugs landen als Kandidat `Q<n>` mit Repro-Stand `0/3` im nächsten Bericht — erst
drei formale Zyklen machen daraus einen gemeldeten Befund (Repro-Disziplin oben).
