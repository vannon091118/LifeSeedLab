# Runbook: QA-Trigger — automatisierter Prüfablauf (QA-Gerät)

**Geltung:** Dieses Gerät (QA-Kiste). Jeder Agent, der hier arbeitet, führt diesen Ablauf
**aus, sobald der Eigentümer „QA" sagt** (oder um eine Spielsession/einen Bericht bittet) —
ohne weitere Anweisung, von der Vorbereitung bis zum Push. Die Regeln in der `AGENTS.md`
(HIER NUR QA, Repro-Pflicht 3×, Warteschleifen-Regel) gelten unverändert; dieses Runbook
ist die Schritt-für-Schritt-Ausführung.

Wenn ein Pfad/Port hier abweicht, gilt die aktuelle Maschine — **verifizieren, nicht raten**
(Schritt 0 prüft alles).

**PFLICHT-SCHRITT 0a — Versions-/Titel-Check (nach jedem Chrome-Relaunch UND Session-Start):**
Der Dev-Server serviert den **Worktree**. Fenster-/Seiten-Titel muss die erwartete Version zeigen
(gespiegelt aus `package.json` auf `main`). Zeigt der Titel z. B. eine alte Version (v0.0.38,
obwohl main bei v0.0.47): Worktree steht auf `qa-reports` → `git switch main` und Reload.
Beinahe-Fehler vom 18.09.: Testlauf gegen alte Worktree-Version — nur der Titel hat es verraten.

---

## Schritt 0 — Umgebung hochziehen (falls nicht läuft)

Alles per Terminal, **niemals im Projektverzeichnis bauen oder ändern** (nur lesen!):

```bash
# 1. Dev-Server (falls Port 5173 tot ist):
cd /home/vannon/Schreibtisch/LifeSeedLab
ss -tln | grep -q ':5173' || { npm install --no-audit --no-fund >/dev/null 2>&1; \
  setsid nohup npm run dev >/tmp/lifeseedlab-dev.log 2>&1 & sleep 4; }
# Prüfung: ss -tln | grep ':5173'

# 2. Sichtbares Chrome mit CDP (falls Prozess 9222 fehlt — DISPLAY greift so):
pgrep -f 'remote-debugging-port=9222' >/dev/null || \
  setsid nohup env DISPLAY=:0 \
    XAUTHORITY="$(ls /run/user/1000/.mutter-Xwaylandauth.* | head -1)" \
    /home/vannon/opt/chrome-local/opt/google/chrome/chrome \
    --remote-debugging-port=9222 \
    --user-data-dir=/home/vannon/.config/lifeseedlab/mcp-profile \
    --no-first-run --no-default-browser-check \
    'http://localhost:5173' >/tmp/qa-chrome.log 2>&1 &
# Prüfung: pgrep -f 'remote-debugging-port=9222'

# 3. MCP-Bridge: Der Client verbindet den Server 'playwright-lifeseedlab' selbst
#    (Config: ~/.config/lifeseedlab/playwright-mcp.json, cdpEndpoint http://127.0.0.1:9222).
#    Werkzeuge erreichen über search_mcp_tools/call_mcp_tool (Server: playwright-lifeseedlab).
#    Falls eine MCP-Aktion an der alten Config hängt: Nutzer einmal server aus/an
#    schalten lassen, dann weiter.
```

## Schritt 1 — Vor jedem Task (Abhol-Protokoll, auch auf diesem Gerät)

```bash
git fetch origin qa-reports && git log HEAD..origin/qa-reports --oneline -- qa/
```

Neue Berichte → lesen, bevor man dieselben Aspekte erneut testet. Neue `main`-Commits?
→ Fixes der offenen Befunde (Q6, Q12 …) zuerst gegen den Repro-Zyklus nachspielen.

## Schritt 2 — Warteschleifen-Entscheidung (immer)

Keine neuen `main`-Commits ⇒ **kein Stillstand:** Sofort ungetestete Aspekte rotieren
(ungetestete Screens, Mobile 390×844, Persistenz, Boss-Wellen, Konsolenhygiene,
i18n-Parität). Toolcalls zu 100 % ausreizen. Bereits dokumentierte Befunde nicht
wiederholen — außer als formale Repro-Zyklen, die einen Kandidaten auf 3/3 heben.

## Schritt 3 — Spielen & Messen (Kernregeln)

- **Spieltests im sichtbaren Browser** (MCP-Bridge), menschliches Tempo — keine
  Schnelldurchlauf-Skripte. Bedienung: `browser_navigate`, Snapshot lesen, klicken.
- **Canvas/Tray/Krix-Interaktion:** Buttons der Tray wählen per echtem `pointerdown`
  (`onPointerDown`-Pipeline, kein click!). Platzieren = schlichter Tap auf die Zelle.
- **`?dev=1` nur mit Vorsicht:** DevGate-Overlay liegt auf Mobile ÜBER der Tray (Q10) —
  per injiziertem Stylesheet ausblenden. Ohne `?dev=1` ist die Release-Fläche gemeint;
  Krix-Intro erscheint dort auf Frisch-Profilen (unter `?dev=1` nicht).
- **Sim-Werte direkt lesen, nicht aus der UI raten:** `window.__simRootRef` →
  `state.resources.energy` (nicht `state.energy`!), `state.inventory`, `state.plants`,
  `state.mapTiles` (Objekt mit `"x,y"`-Schlüsseln), `state.lives`, `state.wave.number`.
- **Tray-Umfang voll aufnehmen**, bevor man „fehlt" schreibt (der Tray ist scrollbar,
  Karten können außerhalb des Sichtfelds liegen — Q12-Diskriminierung nutzte die
  vollständige Buttonliste).
- Konsolenhygiene nach jedem neuen Screen: `browser_console_messages` (level error).
  Bekannt und NICHT neu melden: Q5-React-border-Warnung, favicon-404.

## Schritt 4 — Repro-Disziplin (keine Phantom-Bugs)

Ein Befund zählt erst ab **3/3**: Jeder Zyklus = frischer Spielstand
(`localStorage.clear()` im Tab) + Reload + Cache-Löschung, auf der Fläche, die der
Spieler sieht (Release ohne `?dev=1`), außer die Präcondition ist selbst ein
Nicht-Frisch-Zustand → Zyklus im Bericht definieren und deterministisch restaurieren.
Kandidaten stehen mit `0/3` im Bericht; Zwischenstände ehrlich als `n/3`.

## Schritt 5 — Bericht & Push (Abschluss jeder QA-Session)

1. `qa/YYYY-MM-DD_<titel>.md`: Kontext (Version **v0.0.38**-Muster = Fenstertitel, Commit
   von `main`, Umgebung), Befunde mit Schwere + Repro-Stand, **Positiv-Liste** (was
   explizit funktioniert), Fragen an den DEV klar getrennt von Bugs.
2. **TEAM-KANAL (Pflicht, AGENTS.md Punkt 2):** Alles, was Design-Bewertung braucht
   (Spielfluss-Brüche, Drift-Verdachte, „war das so geplant?“) steht unter
   `Offene Fragen (Aktion: DEV)` mit konkreter Antwortbitte. Der DEV antwortet per
   Status-Commit; wir verifizieren und setzen den Endstatus. **Niemals einseitig als Bug
   melden oder stillschweigend fallen lassen** — der Bericht bleibt offen, bis die Frage
   beantwortet ist.
3. Index-Zeile in `qa/README.md` nachziehen (Status: offen).
4. Changelog-Eintrag oben unter „Unreleased" (Regel 0; Umlaute transliterieren).
5. Commit `docs(qa): …` (Betreff ≤ 72 Zeichen, keine Maschinen-Footer) + `git push`
   auf `qa-reports`. Push-Wahrheit: `git ls-remote origin qa-reports`.
6. **Alt-Daten:** Abgeschlossene Berichte wandern nach `qa/archiv/` (Index verweist
   dorthin); `qa/` im Wurzelverzeichnis hält nur das aktuelle Paket.

## Abkürzungen für Folgeagenten

| Wollen | Machen |
|---|---|
| Spielwert prüfen | `call_mcp_tool` → `browser_run_code_unsafe` → `page.evaluate` auf `__simRootRef` |
| Tray-Karte wählen | `dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',isPrimary:true}))` auf dem Button |
| Zelle treffen | Canvas-Rect lesen; Zelle (c,r) ≈ x = rect.x + rect.w·c/12, y = rect.y + rect.h·r/12 (Bauzone Spalte 2–9) |
| Frisch-Profil | `localStorage.clear()` → Reload (nur im QA-Chrome-Profil, nie im Alltagsbrowser!) |
| Formale Zyklus-Postsendung | 3× Schritt „Frisch-Profil" + Messung, dann Bericht mit Tabelle |
| Konsolenfehler | `browser_console_messages { level: 'error' }` |
| Mobile-DoD | `page.setViewportSize({width:390,height:844})` + Reload + Overflow-Messung |

## Tabus (unverändert)

Kein Code im Projekt ändern · kein `main`-Merge · keine Tests/Suite laufen lassen ·
kein Shinon (existiert hier nicht) · Spielstand des Eigentümers unberührt lassen —
alles läuft im Profil `~/.config/lifeseedlab/mcp-profile`.
