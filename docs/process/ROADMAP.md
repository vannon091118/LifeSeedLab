# 🗺️ ROADMAP — LifeSeedLab Meilensteine, Findings & Aufgaben

> Verbindliche Aufgaben- und Meilenstein-Planung.
> Rechtsverbindliche Systemregeln: [`docs/architecture/architecture-contract.md`](../architecture/architecture-contract.md).
> Qualitäts-Register: [`docs/quality/quality-spec.md`](../quality/quality-spec.md) · Arbeitsliste je Domäne: `docs/quality/contracts/`.
> Agenten-Arbeitsvertrag: [`AGENTS.md`](../../AGENTS.md).

---

## 1. Aktueller Projektstatus

- **Code-Stand (`main`):** Phasen A–F vollständig implementiert und test-locked. Phase G (Multiplayer/Backend) bewusst aufgeschoben.
- **Verifizierungs-Baseline** — gemessen am **20.09.2026** im Arbeitsbaum (Stand `v0.0.72`); jede Zahl ist ein Messwert dieses Laufs, keine fortgeschriebene:
  - TypeScript inkrementell: **0 Fehler** (`node node_modules/typescript/bin/tsc -b --noEmit`) — die zuvor blockierenden, fremden untracked Experimente (`src/lib`, `src/mcpServer`, 70 TS-Fehler, null Importe, bezogen sich auf das gestrichene Energie-Modell) sind in die Quarantäne `experiments/pending/` verschoben (git-ignoriert, lesbar, Entscheidung des Eigentümers steht aus).
  - Test-Suite: **570 Tests in 61 Testdateien grün** (`node scripts/test-lane.mjs --full`)
  - Tooling-Suite: **38 Tests in 8 Dateien grün** (`--config tools/vitest.config.ts`)
  - E2E-Suite: **30/30 Tests grün** (`tests/`, Chromium 390×844 Portrait, Progression, Mobile-DoD) — die zuvor rote untracked Scratch-Spec liegt ebenfalls in der Quarantäne.
  - Vite-Build: **Produktions-Build fehlerfrei** (24,1 s, `dist/` ist ignoriert)
- **Qualitäts-Gate (Shinon):**
  - Gate-Modus: `enforcement=strict`; **Gate OFFEN: 0 Fehler, 0 Warnungen** (Lauf 20.09.2026, nach der Quarantäne). `finish --all` ist damit technisch wieder frei.
  - Test-Lane: Ausführung relevanter Tests (`vitest related`) im Commit-Pfad ≤ 10 s; letzter Lauf **6,8 s** bei 26 berührten Dateien — im Budget.
  - Git-Abschluss: Ausschließliche Ausführung über `node tools/shinon/cli.ts finish --all`
- **Spielerlebnis & Onboarding:**
  - **Krix-Tutorial (B21):** Vollständiges Strichmännchen-Onboarding über 3 Screens (Start → Hub → Feld), jetzt als 10 Prompt/Reaktion-Paare; P-21 (Textmenge) ist behoben, die Ereignis- und Karten-Overl Locks sind unit- und E2E-gebunden.
  - **Spieler-Feedback (B22–B25):** Aufbauphase vor erster Welle, optische Ablehnungsgründe (`FieldToast`), Haltbarkeitsanzeige am Feld, einheitlicher Loadout-Zähler, honest Codex.

---

## 2. Konsolidiertes Findings- & Befunde-Inventar

Alle historischen Befunde aus Code-Audits (jetzt domänenweise in `docs/quality/contracts/`) und QA-Test-Sessions (`qa-reports`) sind konsolidiert — **aber je Sache an genau einem Ort**:

- **Offen** → §3 „Bekannte Probleme" (P-Nummer, Beleg, Owner).
- **Beauftragt** → §4 (Meilenstein; die Audit-IDs bleiben im Aufgabentext stehen).
- **Behoben** → Domänen-Contract (`docs/quality/contracts/`) plus Devlog-Chronologie; der QA-Bericht selbst wird nach der Überführung aus `qa/` entfernt.

Die frühere Liste **„2.2 Aktive Befunde" wurde am 20.09.2026 aufgelöst** — sie war eine zweite Liste derselben Sachen, ohne P-Nummern. Ihre fünf Einträge haben jetzt je genau einen Ort: **T3** → **P-12**; **T2** → überholt (Devlog 18: das Energie-Konto existiert nicht mehr, es gibt keinen zweiten Zahltisch); **N4** → behoben (Devlog 17: 3/3 auf Desktop und Mobile; der Rest an derselben Stelle sind **P-2**, **P-5**, **P-10**, **P-13**); **B16.2–B16.5** und **B16.9** → §4 STUFE 1; **B14.7** → §4 STUFE 2.

### 2.1 Herkunft der Audit-IDs (Übersetzung, KEIN Status-Ersatz)

Die belastbare Status-Wahrheit je Fundstelle ist das Register
[`docs/quality/quality-spec.md`](../quality/quality-spec.md) → `docs/quality/contracts/` (dort steht
jeder Befund mit `REPARIERT`/`OFFEN` und Beleg). Die folgende Liste ist nur die Übersetzung der
alten ID-**Paare** in ihr Ergebnis, damit Verweise in älteren Commits, Devlogs und Berichten
auch in einem Jahr noch auflösen. Sie wird nicht fortgeschrieben: neue Befunde gehen nach §3,
neue Aufträge nach §4.

- **A13 / B14 (Identitäts- & Lifecycle-Lücken):** Monotoner Brut-Zähler `MetaSave.broodGeneration` (v5), zentrales Reife-Gate `isCrossReady`, atomares `keepCross`, kanonische FNV-1a Prüfsumme.
- **A14 / B16.1 (Versteckte Map-Route):** Dynamische Routen-Berechnung wird nun korrekt visualisiert.
- **A16 (Mojibake-Encoding):** UTF-8 Zeichencodierung im Codex bereinigt; Encoding-Gate in `src/encoding.test.ts`.
- **A17 (Halb übersetzter Codex):** Alle Literale in `translations.ts` überführt.
- **A18 (Fail-Open Geschwister):** `claimBrood`, `keepCross` und Inventar-Kappung fail-closed abgesichert.
- **A19 / B17 (Meta-Wahrheit in React-State):** `beginRun()` reserviert direkt auf persistiertem Stand; `healRipeness` stellt Invarianten bei jedem Laden her.
- **B15 (Zucht-Schleife):** Reifung an Wellenfortschritt gekoppelt (`WAVE_STARTED → +1`); deterministischer Gacha-Wurf.
- **R1 / R2 (Zwei Weg-Wahrheiten):** Widerspruch zwischen statischem und dynamischem Pfad aufgelöst; R2-Welt-Neubau umgesetzt.
- **F1–F6 (Spielfluss & Interaktion):** Nachbar-Auswahl, Button-States und UI/Sim-Divergenzen bereinigt.

---

## 3. Bekannte Probleme (verifiziert am Code, 19.–20.09.2026)

Aufgenommen ist nur, was am heutigen Stand **im Code belegt** offen ist — jede Zeile nennt
Beleg und Owner. Was die Berichte gemeldet haben und inzwischen behoben ist, steht in den
Domänen-Contracts (`docs/quality/contracts/`) und in der Chronologie des Devlogs
(`docs/process/devlog/` — die QA-Berichte selbst werden nach der Überführung gelöscht,
damit dieselbe Sache nicht an zwei Orten lebt).
Entschiedene Punkte wandern nach unten in die Spur-Abschnitte (Nummern bleiben stabil).

| # | Problem | Beleg am Code | Owner |
|---|---|---|---|
| P-2 | **Mobile Hochformat im Run — BEHOBEN (20.09.2026, `tests/mobile.spec.ts`).** Die rechte Knopf-Gruppe der Top-Bar stand ohne `flexWrap` in einer Zeile; gemessen bei 390×844: Reihe 407 px, „Exit Run“ 362–419 ⇒ 29 px außerhalb. Jetzt umbricht `topRight` rechtsbündig (Reihe 366 px, kein Knopf außerhalb; Desktop unverändert, die Zeile passt dort). DoD „Mobile geprüft“ ist damit ein tragender E2E-Test statt einer Erinnerung. | `components/gameViewStyles.ts` (`topRight`), `tests/mobile.spec.ts`, Devlog 20 | `components/` |
| P-3 | **Duell-Brett verbraucht Hub-Aufmerksamkeit.** Die Karte ist gleich groß wie die spielbaren, liefert aber nur „Bald verfügbar". | `i18n/texts_shell.ts` `menu.pvp`/`menu.pvpDesc` | `components/` + `i18n/` |
| P-4 | **Technische Identifikatoren in Normalansichten.** Die Codex-Karte zeigt `genome_hash`/`entry_hash` direkt im Spielerfluss; der externe Playtest wünscht sie in einer Detailansicht. | `components/Codex.tsx` | `components/` |
| P-5 | **BEHOBEN + VERIFIZIERT (23.09.2026): Krix-Blase auf 390×844 und Hub.** Release-E2E (`tests/krix_bubble.spec.ts`, `?tutorial=1` ohne DevGate) prüft den Papierhintergrund, den sicheren Layoutstatus und 0 Überlappungen mit Hub-/Tray-Karten; Preview zusätzlich bei Desktop und 390×844. `bubbleLayout.ts` + `data-tut-avoid` verhindern die Position mechanisch. | `components/tutorial/`, `src/components/tutorial/bubbleLayout.ts`, `tests/krix_bubble.spec.ts` | `components/` |
| P-8 | **`reward` und `scoreValue` sind in der Source für ALLE fünf Gegnertypen zahlenidentisch** (grunt 10/10 · fast 15/15 · tank 30/30 · swarm 5/5 · boss 150/150). Beide werden gelesen (Nektar-Anteil bzw. Score), die Trennung ist also echt — aber solange die Werte gleich sind, ist jeder Balance-Eingriff an einem Feld eine halbe Wahrheit. Offen: bewusst differenzieren oder ein Feld benennen. | `config/enemies.source.ts`, `simulation/scoreSystem.ts` | `config/` |
| P-9 | **Inzucht-Vielfalt hängt allein an der Mutation — GESICHTS-PUNKT BEHOBEN (20.09.2026), BALANCE-FRAGE OFFEN.** Der Spieltest-Eindruck „die Käfer sind sich massiv ähnlich" ist gemessen und an der Wurzel behoben; **alle Zahlen (48 Bruten, Farbabstände, Pixelmaße, gepinnte Untergrenzen, Mutationsprüfung) stehen in Devlog 21** — hier steht nur der Stand: kein Kandidatentripel mit drei gleichen Farben mehr, die Kandidaten unterscheiden sich sichtbar, und die **Gründer tragen wieder ihre dokumentierten Source-Farben** (vorher trugen alle drei dieselbe). Belege: `beetleVisibility.test.ts`, Devlog 21, Regel B31 in `contracts/genome`. **Offen bleibt zweierlei**, beides in Devlog 21 beziffert: (a) ein Bild-Merkmal, das die Brut nie unterscheidet (die Fühlerzahl ist ein fester Achsen-Schwellwert), und (b) die dünne Untergrenze des ähnlichsten Kandidatenpaares — eine Garantie INNERHALB der Brut bräuchte eine SICHT-Bedingung in der Brut-Suche (Kandidat B der Entscheidung, kostet Suchbudget, nicht gebaut). Unverändert offen ist die Balance-Frage selbst: die Mutations-Chance ist fix (`BREEDING.mutationChance`), der Neuheitsdruck skaliert nur Drift/Dominanz — bei genetisch gleichen Eltern erhält die Rekombination die Kräfte EXAKT, und ein Dominanz-Kippen bewegt die Käfer-Werte gar nicht. Die Brut fängt das mit 12 statt 6 Versuchen ab (gemessen: vorher 11 von 72 Bruten nur zwei Profile, jetzt 0 von 72; Messmenge: 3 Gründer, alle geordneten Paarungen × 8 Brut-Indizes, „vorher" mit `4d50cc6^` nachgerechnet) — der Kern selbst bleibt eng. Offen als BALANCE-Entscheidung, weil sie die Pflanzenzucht mitbewegt: Druck an die Mutations-Chance koppeln oder Pool/Content erweitern. | `config/phenotype.source.ts` `BREEDING`, `genome/breeding.ts` | `config/` |
| P-10 | **Tray ohne Scroll-Hinweis (mobil) — NACHGEMESSEN 20.09.2026: kein Überlauf.** Heute: `scrollWidth 342 = clientWidth 342`, alle Karten sichtbar, kein Hinweis nötig. Der Q9-Befund war konfigurationsabhängig (Kartenzahl × Kartenbreite) — beim nächsten Content-Zuwachs im Streifen kann er zurückkehren; deshalb bleibt die Zeile mit heutigem Messwert stehen, statt als erledigt zu verschwinden. | `components/PlacementTray.tsx` (`sectionRow`), Devlog 04/20 | `components/` |
| P-11 | **Brutvorschau rendert ohne genug Nektar.** Die drei Kandidaten erscheinen, sobald zwei Eltern gewählt sind — der Kontostand beeinflusst nur die Knopf-Optik. Entweder ist das ein Teaser (dann fehlt die Kennzeichnung) oder ein Pfad, der die Wirtschaftsprüfung umgeht. Designfrage aus Q11. | `components/BeetleLab.tsx` (`preview`, `handleBreed`), Devlog 04 | `components/` + `i18n/` |
| P-12 | **Tile-Werkzeug schaltet sich selbst ab (T3).** Die Werkzeug-Knöpfe sind Umschalter; beim Serien-Bau wählt der zweite Klick den Modus ab, und der Zustand ist an der Karte nicht schnell genug ablesbar. Kein Kaufschaden, aber ein Bruch mitten im Bauen. Kandidat 1/3 aus der Taktik-Session. | `components/placementController.ts` (`selectTile`), Devlog 18 | `components/` |
| P-13 | **GEMESSEN (23.09.2026, Restnachverifikation an der heutigen Fläche):** Leih-Karte UND alle Tray-Karten sind an der P-25-Regiefläche frei sichtbar/antippbar, keine Überdeckung durch Leiste, ✕ oder Blase (`tests/layout_regie.spec.ts` P-13-Fall + `tests/krix_bubble.spec.ts`). Die alten ~10-px-Überhänge sind mit dem Tray-Umbau gegenstandslos; der Vertrag ist als E2E-Regression gebunden. | Devlog 17, `components/PlacementTray.tsx`, `tests/layout_regie.spec.ts` | `components/` |
| P-14 | **Leere Route direkt nach dem Fortsetzen — WIDERLEGT am heutigen HEAD, Invariante gepinnt.** Die Zeile beschrieb `applyResume` + Ableitung erst im ersten Tick; tatsächlich leitet der Root-Konstruktor die erste Route selbst ab (`recomputeRoute(this.state)` nach `applyResume`, `root.ts`), das leere Brett existiert nicht. Beleg: `simulation/qa_p14_resume_route.test.ts` — direkt nach Resume-Konstruktion ist `currentRoute` nicht null und nicht leer. Fällt die Invariante je zurück, fällt der Test und der Punkt ist wieder offen. | `simulation/root.ts` (Konstruktor), `simulation/qa_p14_resume_route.test.ts`, Devlog 10/13/20 | `simulation/` |
| P-17 | **Zwei Zugangsdaten liegen im Klartext in der veröffentlichten Git-Historie.** Der Initial-Commit `f02614c` enthält `.env.local` mit `VERCEL_TOKEN` und `AI_GATEWAY_API_KEY`; die Datei wurde in `d8e1883` aus dem Tracking genommen, der Commit bleibt aber Vorfahre von `origin/main` (geprüft: `git merge-base --is-ancestor`). Kein Code liest die beiden Variablen (`git grep` leer) — es sind Werkzeug-Schlüssel, keine Laufzeit-Schlüssel. **ENTSCHEIDUNG des Eigentümers (23.09.2026): nur widerrufen und neu ausstellen, KEINE History-Umschreibung.** Begruendung: ein Rewrite entfernt den Wert nur aus `origin/main` — in jedem Fork, jedem Mirror und jedem Cache bleibt er, alle bestehenden Klone brechen, und das Ergebnis sieht sauberer aus, ohne sauberer zu sein. Ein widerrufener Token ist dagegen ueberall wertlos. **Offen bleibt ein reiner Handgriffsschritt des Eigentümers:** beide Token beim Anbieter widerrufen, neu ausstellen, die neuen Werte ausschliesslich in die lokale, ignorierte `.env.local` eintragen. Der Punkt ist erst erledigt, wenn dieser Schritt ausgefuehrt und bestaetigt ist — der Codebestand ist bereits sauber (kein Treffer im aktuellen Stand). | `f02614c:.env.local`, `.gitignore` Z. 12–14 | **Eigentümer** (extern, kein Code-Fix) |
| P-15 | **Wiedereinstieg in die Krix-Notizen.** Die Entscheidung von Q3 gilt (Überspringen verwirft bewusst, kein erneutes Aufdrängen) — der damals zugesagte Weg, die Notizen später auf Wunsch nachzulesen, wurde nie gebaut. Offen als Wunsch, nicht als Bug. | Devlog 01/06, `components/tutorial/` | `components/` |
| P-18 | **Balance-Klippe ab Welle 4 (Spieltest v0.0.71).** Aus der Source nachgerechnet statt geraten: `gruntCount = 4 + floor(n·1.5 + rnd·3)`, ab Welle 3 zusätzlich `fast = 2 + floor(n·0.8)` ⇒ Welle 4 bringt 10–13 Grunts **und** 5 Fast; ein Spross macht 15 Schaden bei 30 Ticks Cooldown, ein Grunt hat 40 HP (3 Treffer). Der Bericht spielte drei Läufe (beste Welle 8, Top-Score 3052) und nennt die Klippe ab Welle 4. Das ist eine BALANCE-Frage, kein Bug: Wellen-Kurve, Spross-Kadenz oder Startbudget. Vor jedem Eingriff P-19 mitentscheiden („der Preis" ist heute doppelt belegt). | `config/enemies.source.ts` (`generateWaveSchedule`), `config/plants.source.ts`, Devlog 19 | `config/` |
| P-19 | **Eine Pflanze zu bekommen hat ZWEI Zahlen.** `PLANTS_SOURCE.sprout.cost = 50` ist kein Preis: gelesen wird das Feld nur von `rarityForCost` (Wachstumszeit/Haltbarkeit); der einzige Preis für „ein Samen" ist `SEED_PRICE = 40`, und `STARTING_NEKTAR = SEED_PRICE` heißt genau ein Kauf zum Start. Der Bericht liest die 50 als Samenpreis („ohne Samen (50 Nektar) ist der Start zäh") — solange beide Zahlen existieren, ist jede Balance-Aussage über „den Preis" eine halbe Wahrheit. Entscheidung: Feld benennen (Rarität) oder Shop-Preis daraus ableiten. | `config/plants.source.ts` (`cost`), `simulation/plantSystem.ts` (`rarityForCost`), `config/economy.source.ts` (`SEED_PRICE`) | `config/` |
| P-20 | **Dimm-Verdacht des Spieltests (0/3, ungemessen).** Bericht: „Rendering dimmt ein, wenn der Tab länger ohne Mauskontakt ist — ein Reload behebt es." Im Code existiert genau EIN Dimmer: das Suspend-Overlay (`rgba(245,239,220,0.75)`, `inset: 0`), ausgelöst von `visibilitychange → hidden`. Nicht reproduziert und auf dieser Maschine nicht messbar (kein QA-Browser); Repro-Zyklus festlegen (Tab verstecken/zurückholen, `document.visibilityState`, Overlay, Sim-Pause, HUD-Zeile „Pause") und erst dann als behoben oder widerlegt führen. | `components/GameOverlays.tsx` (`resumeOverlay`), `render/gameRuntime.ts` (`onVisibility`), Devlog 19 | `render/` + `components/` |
| P-21 | **BEHOBEN (23.09.2026): Tutorial-Textmenge.** An der neuen Source gemessen: 20 Prompt/Reaktion-Texte, 20 Ein-Zeilen-Notizen, 1512 Zeichen DE (Ø 76, Maximum 93), 1351 EN (Ø 68, Maximum 87). Jeder Dialog ist einem Screen zugeordnet; eine Reaktion erscheint nur nach dem jeweiligen Ereignis. | `i18n/tutorial.ts`, `components/tutorial/script.ts`, `components_tutorial.test.ts`, Preview 390×844 + Desktop | `i18n/` + `components/` |
| P-23 | **Die Weg-Probe kostet einen Dijkstra (gemessen).** Die Integritätsregel ist korrekt und wird jetzt VORAB gefragt — die Rechnung dahinter (`computeRoute`) ist für die Frage aber zu teuer: 0,80 ms (12×12), 3,28 ms (24×24), 26,77 ms (64×64) pro erstmaliger Wegzelle. Eine Kostenklemme (Antwort-Cache auf `mapRev`) fängt nur die Wiederholung ab (0,0016 ms); beim Überstreichen einer gewachsenen Welt mit gewähltem Werkzeug bleibt ein Dijkstra je neuem Feld. Sauber wäre, die Regeln **Existenz** eines Weges als Breitensuche zu rechnen (O(V+E) statt O(V²)) — dieselbe Wahrheit, schnellere Rechnung; das ist der Map-Kern und bewegt jeden Bau, deshalb eigener Task mit eigener Messreihe. | `simulation/mapSystem.ts` (`wouldClosePath`, `PROBE_CACHE_MAX`), Devlog 19, Messung 20.09.2026 (200 Wiederholungen, leere Welt) | `simulation/` |
| P-24 | **Der ✕-Knopf beim Bauen verdeckt die Spawn-Ecke (Desktop) — MOBIL WIDERLEGT.** Desktop-Messung 20.09.: Rechteck (87×44, Position 382/149 bei 1280×800) enthält die Zellzentren von **(10,0) und (11,0)** — (11,0) ist die SPAWN-Zelle; solange ein Werkzeug gewählt ist, ist dort nichts zu setzen. Mobile-Gegenmessung (390×844, Devlog 20): Rechteck bei 281/177, **0 Zellzentren** darunter — das Brett skaliert anders als die Knopf-Positionen. Offen bleibt der Desktop-Fall. | `components/GameView.tsx` (`cancelBtn`), `components/gameViewStyles.ts`, Messung 20.09.2026 (beide Viewports) | `components/` |
| P-25 | **Die Tray überdeckt mobil die Ausgang-Ecke (0,11).** Neu gemessen bei 390×844 (Devlog 20): Brett-Unterkante ~696 px, Tray-Oberkante ~652 px — die unterste Brettreihe liegt hinter dem Tray-DOM, die Ausgang-Ecke ist nicht anklickbar und ihr Geist nicht sichtbar, solange die Tray offen ist. Layout-Regie (Brett-Skalierung vs. festes Tray-Overlay), kein Einzeiler; reproduzierbar via `tests/mobile.spec.ts` (der Geist-Test wählt deshalb sichtbare Zellen). | `components/PlacementTray.tsx` (`tray: position absolute`), `components/gameViewStyles.ts`, Messung 20.09.2026 | `components/` |
| P-22 | ~~Fremde untracked Dateien reißen zwei Prüfungen.~~ **GELÖST (20.09.2026, Konfliktlösung):** beide Blocker sind in die git-ignorierte Quarantäne `experiments/pending/` verschoben — (a) die rote Explorer-Scratch-Spec (jetzt `agent-explorer.spec.ts`), (b) das unvollendete Agenten-Experiment `src/lib`+`src/mcpServer` (70 TS-Fehler, null Importe im Spielcode, bezog sich auf das gestrichene Energie-Modell). Danach: tsc 0 Fehler, E2E 30/30, Gate OFFEN. **Verbleibende Entscheidung beim Eigentümer:** die Experimente fortführen (auf das heutige Modell umschreiben), archivieren oder löschen — der Inhalt ist unangetastet lesbar, nichts wurde verworfen. | `experiments/pending/` (git-ignoriert, Devlog 20), tsc + E2E-Lauf 20.09.2026 | **Eigentümer** (Fortführung/Archivierung der Experimente) |
| P-27 | **`PLANT_GROWN` und `PLANT_WITHERED` schicken Animationen, die niemand zeichnet.** Der Observer emittiert `PlayAnimation{anim:'grow'}` (Reife) und `{anim:'death'}` (Welken), `FeedbackLayer.animOf` liefert sie, `renderer.drawPlant` kennt aber nur `attack`, `placement` und `recoil` — zwei der fünf deklarierten Animationen sind stille Kommandos (dieselbe Klasse wie der damals fehlende `recoil`). Rest-Sichtbarkeit gibt es über die Partikel (`glow_rise`/`wither_dust`), der Moment der Entity fehlt. Gefunden bei der Verifikation der B5.1-Scheibe (21.09.2026). | Messung 21.09.2026: `grep "anim ===" src/render/renderer.ts` ⇒ 3 Treffer, `observers/visualObserver.ts` emittiert 5 Anim-Namen | `render/` |
| P-28 | **`muzzle_puff` ist ein totes Profil.** Der Vertrag (B5) verlangt bei `PROJECTILE_FIRED` einen Mündungspuff; das Profil existiert in `observers/particles.ts`, wird aber von keiner Zeile emittiert (der Schuss zeigt heute nur die Angriffs-Animation der Pflanze). Entweder 1 Zeile im Observer oder Profil streichen — beides ist eine Entscheidung, keine Messung. | Messung 21.09.2026: `grep -rn muzzle_puff src/` ⇒ nur die Definition | `observers/` |
| P-29 | **Wellen-Bonus ist eine Belohnung ohne Senke — und ohne Ursprung.** `scoreSystem.grantWaveReward` emittiert `REWARD_GRANTED {reward}`, bucht aber **nichts** (weder Nektar noch Score; gepinnt in `gateB.test.ts`). Mit der neuen B5.1-Reise (Payload-Ort) fliegt der Wellen-Bonus bewusst NICHT, weil es keinen Ort gibt: `px/py = null`. Damit ist der Wellen-Bonus faktisch ein FX-Token — entweder bekommt er eine echte Gutschrift (und einen Ort) oder der Event-Anteil fällt. | `simulation/scoreSystem.ts` (`grantWaveReward`), `simulation/gateB.test.ts`, Messung 21.09.2026 | `simulation/` + `config/` |
| P-30 | **Die Hub-/Menü-Tabs tragen Emojis als Endgrafik** (🌱 Gewächshaus, 🛒 Shop, 🪲 Brutkammer, 📖 Codex) — B0 verbietet Emojis als finale Kunst ausdrücklich, und der Screen-Identity-Anspruch („jeder Screen aus seinem Inhalt erkennbar") ist damit an den stärksten Wiedererkennungszeichen offen. Sichtprüfung 21.09.2026 im laufenden Screen (DOM-Snapshot der Tab-Leiste), nicht aus dem Code geraten. Ersatz braucht SVG-Glyphen derselben Ink-Sprache — eigener UI-Auftrag, nicht in dieser Scheibe. | `components/MainMenu.tsx`/`NavIndicators.tsx` (Tab-Labels), `i18n/texts_shell.ts` | `components/` + `i18n/` |
| P-31 | **Die Zahl am Kill und der Sprung des Zählers widersprechen sich.** Der Kill-Text zeigt `+${payload.reward}` (`observers/visualObserver.ts`), der Nektar-Zähler wächst um `max(1, floor(reward/5))` (`simulation/scoreSystem.ts`) — Content: `grunt reward 10` ⇒ Text **+10**, Zähler **+2**; Boss 150 ⇒ **+150** vs. **+30**. Vor der B5.1-Reise war das unsichtbar (es gab keinen Zähler); seit die Reise sichtbar auf den Zähler zeigt, addiert der Spieler zwei Zahlen, die nicht zusammenpassen. Ehrliche Auflösung: die *gebuchte* Menge (Delta) gehört ins Payload und an die Stelle des Textes — die Formel darf NICHT im Observer nachgebaut werden. Betrifft `ENEMY_DIED`/`REWARD_GRANTED`-Payload + B5-Matrix-Zeile, deshalb nicht in dieser Scheibe entschieden. | `config/enemies.source.ts` (reward/scoreValue), `simulation/scoreSystem.ts`, `observers/visualObserver.ts`, Rechnung 21.09.2026 | `simulation/` + `observers/` + `config/` |
| P-32 | **WIDERLEGT (23.09.2026, Probe in dieser Version): Der Verifizierungspfad meldete Grün auf einem alten Kompilat (`fsModuleCache`).** Drei Proben gegen die installierte Version (vitest 5.0.x, `isolate:false` + `fsModuleCache:true` wie im Gate): (1) Dependency-Edit `1→2`, Test pinnt den Wert — Lauf danach frisch ROT→GRÜN; (2) Testfile-Edit (neuer Test zugefügt) — Lauf danach zeigt 2 statt 1 Tests; (3) Gegenprobe `--no-cache` identisch. Die Content-Invalidierung funktioniert in der installierten Version in beiden beschriebenen Mechanismen (edierte Dep, editierter Testfile). Der Befund vom 21.09.2026 wird in der installierten Version nicht reproduziert. **Ursprüngliche Beobachtung (Spur):** Nach Edits an `src/render/layers/feedback.ts` führte `vitest run src/observers/observers.test.ts` weiter das VORHERIGE Modul aus: der neue Test fehlte (12 statt 13 Tests) und schlug, sichtbar gemacht, mit `expected 39.09090909090909 to be 40` fehl — also exakt der alte Term `1 - life/maxLife`, obwohl der Dateiinhalt nachweislich neu war (Vite/Browser lieferten denselben Stand korrekt). Erst `rm -rf node_modules/.vitest-cache` ergab 13/13 und die volle Suite **668** statt 667 Tests. Die Annahme im `vitest.config.ts` („der Cache schlägt über Hashes fehl, nicht über Zeitstempel") trifft hier nicht zu. Risiko: Gate und Hook-Commit können auf nicht-aktuellem Code grün melden — der schlimmste Fall für „Fertig heißt bewiesen". | Beobachtung 21.09.2026 (dreimal reproduziert), Widerlegungs-Probe 23.09.2026 (drei Läufe, s. Beschreibung), `vitest.config.ts` (`test.fsModuleCache`) | `process/` (Config + Gate) |
| P-33 | **Die Belohnungsreise kappt still bei 8 Flügen.** `FeedbackLayer.exec` verwirft bei Überlauf den ÄLTESTEN Flug per `shift()` (`if (this.flights.length > 8) this.flights.shift()`) — bei Kill-Sturm (×4-Takt + Ketten-Kills, 8 Gegner in einem Frame) verschwindet eine Reise mitten in der Luft, ohne Ankunft am Zähler; dieselbe Kappung gilt für Ankünfte (4) und Zahlen (24). Zwei saubere Wege: Flüge eines kurzen Fensters zu EINEM Paket bündeln (weniger Flüge, ehrliche Summe) oder beim Verwerfen eine Ankunft buchen (die Buchung ist ja passiert). | `render/layers/feedback.ts` (`exec`/`update`), Messung 21.09.2026 | `render/` |
| P-34 | **Der Einschlag eines Schusses ist in der Effektfarbe nicht sichtbar.** Mit der neuen Canvas-Sonde gemessen (28 Frames, zwei Läufe): im Fenster um den gemeldeten Einschlagpunkt liegt in JEDEM Frame **kein** Pixel des Effekts (`#a3e635` bei `EFFECT_PIERCE → VECTOR_TOX`) innerhalb ±24 — und die ~100 blassgrünen Pixel, die dort dauerhaft stehen, sind der GEGNER (sie ändern sich gegenüber dem Vorher-Bild nicht). Zwei Ursachen im Owner: `DAMAGE_DEALT` zieht seinen `impact_ring` in Papierfarbe `#d9c9a3` (Papier auf Papier), und `spawn_spore` ist mit `size: [0.04, 0.09]` Zellen bei `alphaCurve: 'fadeInOut'` zu klein und zu blass, um sich vom Untergrund zu lösen. Sichtbar ist allein die Schadenszahl (Tinte, 18×15 px Glyphe am Punkt — die Sonde pinnt genau sie). Entscheidung nötig, nicht in dieser Scheibe getroffen: Effekt in der Palette-Modifier-Farbe zeichnen, Größe/Alphakurve anheben oder die Profile streichen. | Messung 21.09.2026 (`tests/visual_probe.spec.ts`, Tinte 50–60 Pixel im Einschlags-Frame), `observers/visualObserver.ts` (Zeile `impact_ring`), `observers/particles.ts` (`spawn_spore`) | `observers/` + `render/` |
| P-35 | **Die E2E-Lane meldet unter paralleler Last Zeitüberschreitungen, die isoliert verschwinden.** Im gleichen Lauf sind zweimal VERSCHIEDENE, je 20–120 s bemessene Specs in DOM-Zugriffe gelaufen (`mechanics.spec.ts` „DevGate finite"/„Exit Run sauber", `progression.spec.ts` „Reifungs-Leiter": `getByRole('start game')` kam nie) — isoliert nachgefahren sind alle drei grün (6/6, 1/1). Beleg für die Last: zwei parallele node-Prozesse mit 758 s und 169 s CPU (~300 MB) zum Zeitpunkt des Laufs; dieselbe Beobachtung nennt `test-lane` („unter Last ist das kein Befund"). Risiko: ein rotes E2E-Band lässt sich dann nicht mehr von einem echten Defekt unterscheiden — die kurzen Specs brauchen entweder längere Budgets oder eine Last-Vorbedingung (z. B. Abbruch, wenn im Worktree eine zweite Playwright-Instanz läuft). | Messung 21.09.2026 (drei Lane-Läufe, drei verschiedene Last-Zeugen), `playwright.config.ts` (`timeout: 20_000` je Spec) | `process/` (E2E-Config) |
| P-26 | **Drei von vier Pflanzen tun nichts — also ließ ich die Gegner fressen: GELÖST (20.09.2026).** Black-Box-Bericht v0.0.71 (Beste Welle 5): Mauer `EFFECT_REFLECT` und Myzel `EFFECT_HEAL` als `visual-only`-Tags in `effectSupport.ts` — 300 HP nie berührt, Heil-Aura nur im `prep` ohne Wunden. Jetzt hält die Mauer auf: **Tank und Boss bleiben stehen und fressen** (`stopsToEat` je Archetyp, `ENEMY_BITE = {damage:10, cooldownTicks:30, reach:1.05, share:0.2}` in `config/enemies.source.ts` — Tank ab Welle 6, Boss ab Welle 10; Grunt/Fast/Swarm ziehen vorbei). Geometrie-Eigentümer `biteTarget` (`enemySystem.ts`), Pflanzen-Writer `receiveBite` (`plantSystem.ts`, `PLANT_WITHERED`, Reflex = resolved Schaden), `healTick` im Kampf (`root.ts`). **Alle Zahlen gemessen, EINE Quelle:** Seed `555010`, Mauer (5,1), 1200 Ticks → Welle 1: 300→300 (0 Bisse, 0 stehende Ticks), Welle 6: 300→0 in **30 Bissen**, **472 stehende Ticks (39 %)**, Tod bei ~1168, Tank 285 HP (150×1.9) — alle Details, Sonde und Grenzen: **Devlog 22** (`docs/process/devlog/2026-09-20_22_pflanzen-und-bericht.md`). Belege: `src/simulation/plant_defense.test.ts` (8 Pins). Zum Audit-Hinweis „erst ab Welle 10": bewusst Tank 6 / Boss 10 (Entscheidung des Eigentümers, 20.09.2026 — frühe Grunt-Fresser machten Welle 2 unspielbar). | `config/enemies.source.ts`, `simulation/enemySystem.ts`, `simulation/plantSystem.ts`, `simulation/root.ts`, `simulation/plant_defense.test.ts`, Devlog 22 | `simulation/` + `config/` |

### Am 19.09.2026 entschieden und umgesetzt (Nummern bleiben stabil)

Diese drei standen hier als offen und sind jetzt Code + belegt — die Zeile bleibt als Spur stehen,
damit die Nummern nicht wandern und alte Verweise gültig bleiben:

- **P-1 Blumentopf** → **Booster** (Entscheidung „Farbe ⇒ Effekt, Zelle bestimmt Farbe"):
  `config/pot.source.ts` (vier Farben, vier Achsen), `simulation/potBoost.ts` (Zell-Ableitung),
  `plantSystem.plantStatsAt` (EINE Wahrheit für Sim, Renderer und Vorschau). Beleg:
  `potBoost.test.ts` (5 Tests, Mutation geprüft), Preview-Screenshot (vier Farben auf der Karte).
- **P-6 WEG-GÜTE** → **LAUFWEG in Feldern** (Entscheidung „Laufweg in Feldern zeigen"):
  `simulation/routeMetrics.ts` ersetzt `routeQuality.ts`; Chip „LAUFWEG 22 · min 22",
  `ROUTE_CHANGED` trägt `tiles`/`ideal`. Belege: `maze_plants.test.ts` (25 vs. 15 = 10 Felder
  Gewinn), `hudSnapshot.test.ts`, Live-Chip im Preview.
### Am 20.09.2026 entschieden und umgesetzt

- **P-26 Drei von vier Pflanzen tun nichts (P-26, 20.09.2026):** Entscheidung „Tank und Boss fressen" — 8 Pins (`plant_defense.test.ts`), Tank ab Welle 6 / Boss ab Welle 10, Content-Fahne + `ENEMY_BITE`, `healTick` im Kampf, Mauer-Haltung über `biteTarget`. Alle Zahlen: Devlog 22 (einzige Quelle: 300→0 in 30 Bissen, 472 stehende Ticks, Welle 1 bleibt 300).
- **P-16 Platzierbarkeit der eigenen Sammlung** → **behoben** (`5f14dbc`): Bestandssaves trugen
  für ihren Bestand keinen `bredStats`-Eintrag, wodurch die Vorschau jede Zelle mit `unknown`
  und die Sim mit `no_inventory` ablehnte (Tray zeigte ×1, gesetzt wurde nichts). Jetzt heilt
  `deriveRunStats` die Run-Stats beim Start aus dem Genom (dieselbe Ableitung wie bei der
  Registrierung). Beleg: `src/meta/run_stats.test.ts` (7 Gates, Mutation geprüft), Live-Preview
  mit echtem Profil. Regel: `docs/quality/contracts/meta.md` B1.1.
- **Q10 Mobile/Dev-Blende** (aus Devlog 04) → **behoben** (`5f14dbc`): Das Dev-Overlay lag über
  der Tray und schluckte Karten- und Brett-Taps; es ist jetzt Lesefläche (`pointer-events: none`),
  nur der FX-Knopf bleibt bedienbar. Beleg: Karten-Klick trifft mit Overlay den Handler,
  FX toggelt weiter. Regel: `docs/quality/contracts/ui.md` (B7.6).

- **P-7 `resources.experience`** → **Feld gestrichen** (Entscheidung „Feld streichen"): kein
  zweiter Kontostand im Run; Writer, Source-Konstanten, Resume-Kopie und die Tests, die ihn
  pinnten, sind weg. Dabei fielen zwei tote `resources.energy`-Zuweisungen in den Maze-Tests auf
  (Rest des Energiesystems). Belege: `gateB.test.ts` pinnt jetzt, dass ein Kill KEINEN zweiten
  Kontostand erzeugt; `hash.ts` trägt keine `resources`-Falle mehr.

---

## 4. Konsolidierte Meilensteine in logischer Reihenfolge

Die Umsetzung erfolgt strikt sequenziell nach dem Arbeitsrhythmus: **Aufgabe → Test → Gate → Commit**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LOGISCHE REIHENFOLGE                            │
│                                                                        │
│  [STUFE 1: Sofort]  ──▶  [STUFE 2: Performance] ──▶  [STUFE 3: Endgame]│
│  - Mazing-Stabilität     - HUD-Snapshot Budget       - Brutstätten-    │
│  - Mobile-Layout         - Touch-Latenz (390x844)      Balancing       │
│  - B16 Genom-Modell      - Savegame-Skalierung       - Boss-Wellen     │
│  - Kampfwerte-Anzeige    - B12/B13 Gates               & Progression   │
│                                                              │         │
│                                                              ▼         │
│                                                     [STUFE 4: Ausblick]│
│                                                     - Convex Backend   │
│                                                     - Supabase Sync    │
└────────────────────────────────────────────────────────────────────────┘
```

### 🟢 STUFE 1: Sofort / Mechanik- & UX-Stabilisierung
Fokus: Beseitigung aller offenen QA-Befunde und Schärfung des Genom-Gameplays.

1. **Mobile-Layout 390×844 (N4 ist abgeschlossen, Devlog 17: 3/3 Desktop und Mobile):**
   - Der Rest an derselben Stelle, jetzt in §3 geführt: `flexWrap` der Run-Top-Bar (**P-2**), Blasen-Verankerung bei 390×844 (**P-5**), Scroll-Hinweis der Kartenreihe (**P-10**), Blasen-Größe und Leih-Karte (~10 px, **P-13**).
2. **Mazing & Weg-Lenkung (T2 überholt, T3 = P-12):**
   - T2 fiel mit dem Energie-Konto weg (Devlog 18); T3 ist der Tile-Schalter (**P-12**).
   - Die Regeln stehen und sind belegt: keine Platzierung schließt den letzten Weg — dieselbe Integritätsregel wird jetzt **vorab** befragt statt erst beim Loslassen (Regel + Belege: `docs/quality/contracts/simulation.md`, QA-Abgleich 20.09.2026), und die Route wird über `ROUTE_CHANGED` gemeldet (`bus/events.ts`, Verbraucher `components/fieldNotice.ts`). Offen ist nur noch der **Preis** der Vorab-Probe (**P-23**, eigene Messreihe, weil sie jeden Bau berührt).
3. **B16 Genom-Modell & Vererbungs-Tiefe (B16.2–B16.5):**
   - Genom-Allel-Matrix erweitern (nicht nur geschlossene 15 Gene).
   - Kampfwerte, Reichweitenkreise und Schadensarten im Feld-Inspektor klar visualisieren.
4. **B16.9 E2E-Harness Geometrie:**
   - `tests/helpers/harness.ts` liest Zellenkoordinaten dynamisch aus dem Canvas-Viewport.

### 🟡 STUFE 2: Mid-Term / Performance & Mobile-Optimierung
Fokus: Messen statt hoffen — strikte Einhaltung der B12/B13 Spezifikationen.

5. **B14.7 Snapshot-Budget (HUD-10-Hz-Klon):**
   - `hudSnapshot.ts` optimieren: Nur geänderte Felder übertragen (Dirty-Flagging oder flache Projektion), um GC-Druck zu minimieren.
   - Messziel: Sim-Tick ≤ 2 ms, Frame-Render ≤ 16 ms auf mobilen Endgeräten.
6. **Mobile Touch-Optimierung (390×844 Portrait):**
   - Touch-Latenz beim Drag-and-Drop / Tap-to-Place evaluieren.
   - Mindest-Touch-Target-Größe von 44×44 px für alle interaktiven HUD-Elemente garantieren.
7. **Bibliotheks-Wachstum & Save-Skalierung:**
   - Messung des Lade- und Serialisierungsaufwands bei Sammlungen mit > 100 gezüchteten Pflanzen und Käfern.
   - Bestätigung, dass die 2ⁿ-Kostenkurve im Gacha-System Speicherüberläufe zuverlässig verhindert.
8. **Finalisierung der B12/B13 Gates:**
   - Vollständige Validierung der DoD-Checkliste für den stabilen Release-Kandidaten.

### 🟠 STUFE 3: Endgame, Balance & Content-Ausbau
Fokus: Spieltiefe, Langzeitmotivation und harmonische Verzahnung von Zucht und Abwehr.

9. **Brutstätten-Balancing (Käfer / Brood):**
   - Synergien zwischen Pflanzen (Shooter, Wall, Slow) und Käfer-Begleitern (Nahkampf, Chitin-Rüstung, Aas-Verwertung) ausbalancieren.
   - Kostenkurve für Nektar und Bruteier im Shop kalibrieren.
10. **Endless-Wave Progression & Boss-Phasen:**
    - Bosse alle 10 Wellen mit einzigartigen Fähigkeiten (Schild-Auren, Sporen-Resistenz, Erdschlag).
    - Tag/Nacht-Einfluss vertiefen (Nachtaktive Pflanzen schießen schneller, Pilze leuchten).
11. **Codex-Vollendung:**
    - Visuelle Stammbaum-Darstellung im Codex (`src/components/Codex.tsx`).

### 🔵 STUFE 4: Ausblick & Vernetzung (Phase G)
Fokus: Asynchrones Teilen und Community-Features (bewusst nachgelagert).

12. **Build-Sharing via Convex:**
    - Schematisierung des Export-Formats: `{ rootSeed, genomePair, commandLogHash, variantKey, version }`.
    - Kein Gameplay-Einfluss; Anbindung über `bus/remote`-Adapter.
13. **Discovery-Chain Supabase-Spiegel:**
    - Synchronisation des lokalen Codex mit `supabase/migrations/001_discoveries.sql`.
    - Weltweites Leaderboard für seltene Mutationen.

---

## 5. Dokumentations-Architektur (Wo steht was?)

| Bereich | Primäres Dokument |
|---|---|
| **Verbindliche Regeln & Gate** | [`AGENTS.md`](../../AGENTS.md) |
| **Rechtsverbindlicher Vertrag** | [`docs/architecture/architecture-contract.md`](../architecture/architecture-contract.md) |
| **Systemarchitektur & Contracts** | [`docs/architecture/architecture.md`](../architecture/architecture.md) |
| **Qualitäts-Register & Domänen-Contracts** | [`docs/quality/quality-spec.md`](../quality/quality-spec.md) → `docs/quality/contracts/` |
| **Roadmap, Findings & Meilensteine**| [`docs/process/ROADMAP.md`](ROADMAP.md) |
| **Art Direction & Assets** | [`docs/architecture/papier-trifft-cgi.md`](../architecture/papier-trifft-cgi.md) |
| **Tooling & Shinon-CLI** | [`docs/setup/script-readme.md`](../setup/script-readme.md) |
