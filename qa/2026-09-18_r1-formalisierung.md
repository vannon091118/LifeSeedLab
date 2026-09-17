# R1-Formalisierung — Zwei Weg-Wahrheiten im Brett (3/3 bestätigt, strukturell)

**Datum:** 2026-09-18 (Session ab 17.09. ca. 23:00 UTC) · **Gerät:** QA-Kiste (sichtbares Chrome 153, MCP-Bridge)
**Version:** v0.0.47 · **main:** `936afc7` · **Viewport:** 1280×860 · **Release-Fläche (kein `?dev=1`)**
**Methode:** 3 Zyklen à frisches Profil (localStorage + sessionStorage + Cache-Löschung, Reload),
Route aus der Sim (`root.map.computeRoute(state)`), Regelwerk-Scan via `placementRules.cellRejectReason`,
Echte-Maus-Platzierung mit `elementFromPoint`-Erreichbarkeitsprüfung und `aria-pressed`-Disziplin.
**Fußnote Methodik:** Beinahe-Fehler abgefangen — der Dev-Server serviert den Worktree; ein Lauf
lief gegen `v0.0.38` (Worktree `qa-reports`), gefangen am Fenstertitel. **Titel-/Versions-Check ist
damit Pflicht-Schritt 0 jeder Session** (ins Runbook übernommen).

---

## R1 — Endstand: 3/3 BESTÄTIGT, strukturell konstant (nicht sporadisch)

| Zyklus | Run / Seed | Route (Sim) | Kernbeobachtung |
|---|---|---|---|
| 1 | runId 1, `24477718` | Reihe 0 (Gegnerbahn `py=0.5`) | (2,0) **auf der Route** regel-**blockiert**; (6,0) **auf derselben Route** regel-**frei** platziert — Leihe auf (2,0) still abgelehnt |
| 2 | runId 1, `24477718` | Reihe 0 (`computeRoute`) | Leihe auf (0,0) **direkt auf Route** → feuert (`lastShot` 0→988); 6 Grunts **passieren sie**: kein Block, kein Angriff (hp 371 konstant); nur 1 Route-Pflanze → Welle 2 tötet den Run (lives 0) |
| 3 | **runId 2**, `13106137` | Reihe 0 (`computeRoute`) | **Anderer Seed → identische Route.** Leihe (0,0) + Spross (0,1) auf Route feuern beide; Welle 1: **20/20 Leben** |

### Antworten auf die Kernfragen

1. **Variiert die Route je Run/Seed? — NEIN.** Zwei verschiedene Run-Seeds (`24477718`,
   `13106137`) → **identische Route** (komplette Reihe 0). Ohne Spieler-Weg-Tiles ist die
   Route konstant: gerade Linie durch Reihe 0. Die „generierte Karte" ist ohne Spieler-Bau
   faktisch eine feste Standard-Strecke.
2. **Bleiben regel-konforme Zellen auf der aktiven Route? — JA, in jedem Zyklus identisch:**
   **14 Route-Zellen regel-frei** (0,0 · 0,1 · 1,0 · 3,0 · 4,0 · 6,0 · 7,0 · 7,1 · 8,0 · 9,0 ·
   9,1 · 10,0 · 10,1 · 11,0), **10 Route-Zellen regel-blockiert** (`on_path`: 1,1 · 2,0 · 2,1 ·
   3,1 · 4,1 · 5,0 · 5,1 · 6,1 · 8,1 · 11,1). Dieselbe Weg-Reihe ist teils baubar, teils gesperrt —
   ohne erkennbare Spieler-logische Grenze.
3. **Was passiert mit einer Pflanze auf der Route (d=0.0)?**
   - **Kein Block:** Gegner laufen durch/über sie (Kooordinaten-Überlappung, 6 Grunts beobachtet).
   - **Kein Gegenangriff:** Pflanze nimmt keinen Schaden (hp konstant 371).
   - **Punkt-leer-Feuer:** Die Route-Pflanze schießt auf Vorbeilaufende (Reichweite 3, d=0.0 —
     maximaler Zeitfenster-Schaden, ökonomisch „gratis").
   - **Visuell:** Überlappung Gegner⇄Pflanze zwingend (gleiche Zelle); Beleg-Screenshots
     `/tmp/r1-z3-midwave1.png` / `-midwave2.png` (mitten in Welle 1/2).

### Konsequenz (DEV-Frage, jetzt mit Struktur-Beleg)

Die Diskrepanz ist **kein Randfall**, sondern in **jedem frischen Run** präsent: Die
Platzierungs-Geometrie prüft gegen den statischen `ENEMY_PATH`-Fallback, Gegner und Renderer
nutzen die konstante Reihe-0-Route. Folgefragen (design-offen, Team-Kanal):
- Soll Bauen **auf** der Route erlaubt sein (Punkt-leer-Meta)? Wenn ja: Warum sind dann 10
  Route-Zellen gesperrt? Wenn nein: Regelquelle auf die echte Route stellen.
- Die 36 statisch gesperrten Zellen an der „alten" Mitte-Route sind in frischen Runs
  **nie bedroht** — frustrierende Bau-Sperrzonen ohne Funktion (Erstspieler-Sicht).

---

## EIGENTÜMER-ENTSCHEIDUNG (ausdrückliche Anweisung, 18.09.): Map-Builder-Menü

**Wortlaut des Eigentümers:** „Man braucht ein neues Map-Builder-Menü als verpflichtende
Sequenz vor dem endlosen Spiel." Die „dummen Fehler" dieser Klasse (siehe R1) soll der DEV
beheben; die Bauphase soll ein **echter, dedizierter Schritt** werden statt eines
3-Sekunden-Prep-Countdowns mitten im Bauversuch.

**Warum R1 genau das belegt:** Ohne Spieler-Bau existiert keine echte „Map" — die Route ist
konstant Reihe 0, die Sperrgeometrie widerspricht ihr, und der Spieler hat 3 s Zeit, während
bereits der Auto-Start tickt (Screenshot des Eigentümers: nur ein Hinweis-Text „Tap a plant
below, drag the ghost over the field…", kein Bau-Menü). Der Builder als Pflicht-Sequenz würde:
1. die Route erst durch Spieler-Weg-Tiles **sinnvoll** machen (Lenkung ist Kern-Design),
2. die Sperrgeometrie-Frage entschärfen (Regelwerk prüft dann gegen die vom Spieler gebaute Route),
3. dem Onboarding einen echten „Baue dein Labor"-Moment geben (statt Countdown-Druck).

**Offene Design-Fragen an den DEV (Aktion: DEV, Team-Kanal):**
- Umfang der Builder-Sequenz: nur Weg-Tiles? Auch Findling/Deko (aktuell im Run-Tray)?
- Sicherungs-Regeln: Mindestens eine gültige Route Spawn→Ausgang (Validation im Builder)?
- Was passiert mit `placementRules`-Quelle nach dem Umbau (statisch vs. `state.currentRoute`)?
- Prep-Countdown: entfällt zugunsten der Builder-Sequenz, oder bleibt für Nachbesserung pro Welle?

---

## Nebenbefunde (cheap-checks dieser Session)

- **N2 (Leih-Karte bei Bestand 0) — uneinheitlich beobachtet, bleibt Kandidat (0/3):**
  Heute zeigte der Tray NACH der Platzierung `loan_sprout×0 | loan_sprout+10⚡` (Karte bleibt
  mit Nachkauf). In der Verifikations-Session (17.09.) war sie **komplett weg**. Bedingung
  ungeklärt (gameover-Modal-Kontext? Auswahl-Zustand?) — nächster Pass klärt den Trigger.
- **N3 (Roh-ID als Label) — erneut bestätigt:** Tray zeigt `loan_sprout×0`/`+10⚡` statt eines
  sprechenden Namens (F4-Familie: Labels aus Source, deutsch/kanonisch). Kandidat, 0/3 formal,
  aber über 2 Sessions stabil sichtbar.
- **Prep-Auto-Start während der ersten Platzierung:** Der 3-s-Countdown startet die Welle, während
  der Erstspieler noch selectiert/platziert („Start Wave"-Button kippt dabei korrekt in die
  Anzeige). Kein Bug (Pause existiert), aber zusammen mit R1 die Begründung für die Builder-Sequenz.

## Umgebungs-Fußnoten

- Chrome (CDP 9222) stürzte 2× in dieser Session → Neustart nach Runbook, beide Male sofort
  wieder grün. Kein Spiel-Befund, aber Sitzungen sollten den Titel-Check nach jedem Relaunch fahren.
- Dev-Server serviert Worktree: Branch-Disziplin (main vor Spielsessions) bleibt Pflicht;
  Titel-Check ist der billige Diskriminator.
