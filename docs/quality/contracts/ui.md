# Contract: Oberfläche — Router, Screens, Komponenten, i18n-Fläche

**Owner (genau einer):** `src/App.tsx` (Router) + `src/components/*` + `src/i18n/*`
**Writer:** React-State ausschließlich hier; Gameplay wird nie aus der UI geschrieben (nur Commands)
**Readers:** Spieler
**LOC-Caps:** 400 (UI-Komponenten) · 200 (i18n)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Regel 1: Spielertexte zweisprachig (DE/EN) über die i18n-Schicht — kein Literal in der Komponente. DevGate-Leaks sind hier ein Defekt, kein Detail.

---

## A5. `src/components/GameView.tsx` — WRONG presentation concerns + INCOMPLETE UX

- DEFECT (dev leaks on player screen): Seed badge, `FX ON/OFF` button, `[D]` button, hash/tick/event counters/particle counts, raw phase string, monospace debug card. Spec: **DevGate** (B8) — none of this in release surface.
- DEFECT: tray inventory read as `rootRef.current?.getSnapshot().inventory[id]` inside JSX render — indirect state read; only updates because HUD sets state at 10 Hz. Fix: tray inventory is part of throttled HUD state snapshot.
- DEFECT: **`recordRunEnd()` exists in meta.ts and is never called** — nektar earned in a run is never banked, `bestWave`/`runs` never update. Meta progression loop is dead. GameOver overlay (B7) owns banking exactly once.
- DEFECT: `handleReset` defined, referenced by nothing (dead).
- INCOMPLETE: `saveRun` fires every 10 s + on unmount, but `loadRun` is never called — **no resume**. Resume contract (B2): restore plants/economy/waveNumber in `prep`; **clear enemies/projectiles** (deterministic re-simulation would require event-log replay, which is out of scope; a wave restart is the honest contract).
- INCOMPLETE: no pause on `visibilitychange` (point 18: Pause bei App-Wechsel, Resume ohne Zustandsverlust).
- INCOMPLETE: placement is `onClick` + `onMouseMove` stub — no ghost preview, no cancel, mobile-hostile. Pointer-events placement (B3): `pointerdown` → move ghost → `pointerup` place; invalid cell = shake ghost + red tint.
- DEFECT: command handler executes only `SpawnParticleBurst` + `CameraShake`. `SpawnFloatingNumber`, `ScreenFlash`, `ShowMangaText`, `PlayAnimation` are drained and **dropped**. 4 of 7 visual commands have no execution path. FeedbackLayer (B5) executes all seven.
- DEFECT: burst colors hard-coded in the UI layer (`profile === 'impact_ring' ? '#fde68a' …`) — presentation color decided outside observers. Color moves into observer payloads (B5).
- DEFECT: no Game Over overlay at all — phase turns `gameover`, screen keeps running silently.
- DEFECT (mobile): single flex column with 5 top-right buttons + 4-item tray — unusable at 390×844. Layout per B9.

## A10. UI screens — PLACEHOLDER (points 11–14, 26–29 of the critique)

- `StartScreen`: emoji logo 🧬, CSS radial glows, HTML button — must become animated title scene (B7).
- `MainMenu`: `createBaseVariantsSafe` duplicate; emoji icons; flat color swatch `preview` instead of rendered plant thumbnails.
- `BreedingLab`: native `<select>` pickers; no breeding moment; hardcoded German string "zu wenig Nektar" bypassing i18n; `variantCountOf` recomputes `.filter().length` per option.
- `i18n`: GameView hardcodes `Seed:`, `FX ON/OFF`, `[D]`; DebugPanel hardcodes German sentence.
- REPAIR: B7 (screens) + B9 (UI kit) + i18n sweep.

### A17. DEFECT (verifiziert, in der Release-Fläche sichtbar) — der Codex-Screen ist halb übersetzt

Gefunden bei der Sichtprüfung, nicht in der Simulation: Mit Sprache **English** steht auf dem Codex-Screen „No discoveries yet. Breed the first one!" direkt neben **„0 Entdeckungen"**, und der Erklärkasten ist vollständig deutsch („Seeds sind Zahlen — jede geteilte Zeile … lädt exakt dieselbe Pflanze. Verifikation = deterministischer RNG, kein externer Konsens.").

`src/components/Codex.tsx` schreibt diese Texte als **Literale in die Komponente**, statt sie über die i18n-Schicht zu ziehen — obwohl dieselbe Schicht für genau diesen Screen bereits einen Schlüssel führt (`codex.empty`, `src/i18n/translations.ts:75`). Das Muster existiert also, es wurde nur nicht durchgehalten. Ein gemischtsprachiger Screen ist kein Geschmacksurteil, sondern ein Oberflächen-Defekt, und er ist im Screenshot reproduzierbar.

**Warum kein Gate das fand:** Die Tests prüfen Verhalten (Router, Platzierung, Ticks), nicht die Sprache der Ausgabe. Genau darum steht in `AGENTS.md` die Sichtprüfung als eigene Stufe vor dem E2E — sie ist hier die einzige Instanz, die den Defekt sehen konnte.

---

## B3. Placement UX (pointer events, GameView extract `PlacementController`)

- States: `idle` → `selected(variantId)` → `ghost(cell, valid?)` → `placed/rejected`.
- `pointerdown` on tray card = select (pulse feedback); `pointermove` = ghost follows snapped cell; `pointerup` on valid cell = emit `PLACE_PLANT` command; `pointerup` invalid = ghost shakes, cell flashes red, `PLACEMENT_REJECTED` FX; second tap on same card or `CANCEL_PLANT` button = cancel.
- Ghost = ResolvedVisual at 60% alpha + range ring (shooter/support) + green/red footprint tint. Same resolved visual as final placement (PreviewModifier = alpha only — identity never changes).
- Desktop parity: identical pointer pipeline (no separate hover path).

**Karten-Aktivierung: Pointer UND Klick (20.09.2026).** Der Befund des Spieltests v0.0.71
(„Karten mit `onPointerDown` reagieren nicht auf synthetische Klick-Events") war ein echter
Barrierefreiheits-Defekt, kein Messartefakt: ein `<button>` wird von Tastatur (Enter/Space),
Vorlesewerkzeug und fremden Agenten über `click` aktiviert — dort feuert nie ein `pointerdown`.
Regel: jede Tray-Karte geht durch EINEN Vertrag, `cardPress(activate)` in
`components/PlacementTray.tsx` — Pointer wie bisher (inkl. `releasePointerCapture`, damit der
Drag aus der Tray zum Brett möglich bleibt), plus `click` **nur** bei `detail === 0`. Echte
Zeigegeräte liefern `detail ≥ 1`; ohne diese Unterscheidung würde jeder Maus-Tap die eben
gesetzte Auswahl sofort wieder umschalten. Beleg: `placementTray.test.ts` (4 Fälle),
Browser-Gegenprobe 6/6, und die Mutation (Klick-Zweig entfernt) macht genau die Tastatur- und
Synthetik-Strecke rot.

**Tile-Werkzeug bleibt gewählt (P-12, 23.09.2026).** Der Zweitklick auf dieselbe Tile-Karte war
ein stiller Abbruch mitten im Serien-Bau — die Werkzeug-Knöpfe waren Umschalter, und der Zustand
war an der Karte nicht schnell genug ablesbar (Taktik-Session, Kandidat 1/3). Regel:
`selectTile` wählt nur um (anderes Tile) bzw. räumt eine stehende Ablehnung weg (gleiches Tile);
Werkzeug und Geist bleiben. Die Abwahl ist die bewusste Geste über den ✕-Knopf (`cancel()`).
Die Asymmetrie zu den Pflanzen-Karten (dort bleibt der B3-Zweitklick-Cancel) ist sachlich:
Tiles werden serienweise gebaut, Pflanzen haben limitierten Bestand und brechen über Q17 ohnehin
ab, sobald er auf 0 fällt. Beleg: `placementController.test.ts` (+2 Fälle P-12).

**Leere Karten verschwinden (21.09.2026, Playtest-Befund „Wurzelmauer ×0").** Der Tray-Kasten
zeigte JEDE bekannte Pflanze bzw. jedes Tile, auch mit Bestand 0 — als `aria-disabled`-Karte, die
aussah wie eine Option, aber keine war. Regel: ein Kasten zeigt nur, was der Spieler HAT
(`cardsWithStock`, `components/PlacementTray.tsx` — dieselbe Regel für Pflanzen- und Bau-Kasten,
kein zweiter Leer-Begriff); ein Kasten ohne Bestand rendert gar keine Sektion statt eines leeren
Rahmens. Kein Zombie-Zustand: die Auswahl bricht der Controller weiterhin selbst ab, sobald der
Bestand auf 0 fällt (`placementController.ts`, Q17) — die Tray ist dafür NICHT zuständig.
Beleg: `placementTray.test.ts` (3 Fälle: Filter, `undefined`-Eintrag, leerer Kasten), E2E-Vertrag
in `run.spec.ts` (Karte WEG nach der letzten Einheit, zweiter Platzierungsversuch pflanzt nichts),
Browser-Gegenprobe in beiden Kästen (nur Karten mit Bestand sichtbar, keine Konsolefehler).

**Der Weg ist keine Tray-Karte mehr (21.09.2026).** Der FELD-Kasten trägt **zwei** Kacheln —
Topf und Deko; auch der Findling ist gestrichen (zweiter reiner Blocker, redundant zum Topf —
E2E-Vertrag in `mobile.spec.ts` zieht deshalb auf die Topf-Karte). Die Weg-Karte ist gestrichen:
Der Laufweg ist das ERGEBNIS des Pathfindings
(B16.1/R2), er wird berechnet, nicht gebaut. Eine Kachel, die den Weg nur ANZIEHT (Gewicht 0,6),
hätte die Route wieder zur Eingabe gemacht und ein zweites Weg-Bild neben die gezeichnete Strecke
gestellt. Die Tray leitet ihre Karten aus `MAP_TILES_SOURCE` ab — es gibt keine zweite
Karten-Liste, die man nachziehen müsste. Beleg: `qa_befunde.test.ts` (genau drei IDs, `path`
nicht dabei), `sources.test.ts` (kein `path` in der Quelle), `placement_map.test.ts`
(`PLACE_TILE` mit `path` ⇒ `unknown_tile`, ohne Material-Abzug).

## B7. Screen specifications

**Title (B7.1)** — full-bleed canvas scene behind minimal DOM: layered paper hills + swaying grass silhouettes drifting (cosmetic namespace, 3 depths, parallax on device tilt later); 2–3 ambient LEAF/SPORE particles/s; logo = custom SVG wordmark (B9) with 600 ms draw-on + settle; big ink-styled PLAY button (min 56 px target); language pills bottom; first pointer = audio unlock + soft chime. Sequence: paint → logo draws → button fades up. Never a bare div flash.

**Main menu (B7.2)** — same world dimmed; nektar counter with drop icon (SVG); stat chips (best wave, runs, collection); three mode cards as **illustrated panels** (greenhouse/endless/pvp each a mini canvas vignette, not emoji); collection grid with `PlantThumb` + count; loadout editor: tap to toggle ≤ 4 carried plants (B1).

**Greenhouse / Breeding ceremony (B7.3)** — replaces `<select>`: two parent slots (tap → collection sheet of `PlantThumb` cards, owned counts shown); center stage 240×240 canvas runs the breeding animation when KREUZEN is pressed (~1.6 s, deterministic from breed seed): parents slide in → genome markers (gene glyphs) orbit between them → dominant genes flare (accent, not glow) → mutation glitch: 2-frame ink-slash → seed drops to soil → offspring grows (scale + unfurl) → traits list staggers in → 3 result cards below. `SKIP` on tap. Cancel = back always safe.

**HUD (B7.4)** — top-left: **Nektar-Zähler (Tropfen-Icon + Zahl, Puls bei Zugang; korrigiert 21.09.2026)** — der Energie-Zähler dieser Zeile ist mit dem Energiesystem gestorben (#4), und Nektar ist die Währung des Laufs: er wird im Run verdient (`state.nektarEarned`) und beim Run-Ende gebucht. Er ist zugleich der **Zielpunkt der Belohnungsreise** (B5.1) und steht deshalb VORN (stabile Lage), dann lives (leaf-heart), wave chip `W 3`; top-right: pause icon + menu icon. Nothing else. Gemessen 21.09.2026 bei 390×844: Chip bei (22/210), 45 px breit, kein horizontaler Überlauf (`scrollWidth 390 = clientWidth 390`); Desktop identisch aufgebaut. Combo appears center-bottom of canvas as manga burst `×N` when ≥ 2. Phase is communicated by world (lighting), never a text label.

**Pause & Game Over (B7.5)** — pause: dim + resume/restart/exit + volume toggles. Game over: ink panel slides up, `WAVE N` large, score + combo highest + **nektar earned with flight-to-counter animation**, buttons New Run / Menu. `recordRunEnd()` fires exactly once here (guard flag).

**DevGate (B7.6)** — `#dev` hash or `?dev=1` reveals: state hash, tick, event log (last 20), particle count/budget, seed + runId, FX toggle, RNG draw counters, entity inspector (entity id / variantKey / visual seed / palette). Release build: zero dev surface, zero seed badge, zero counters.

**Dev Overlay ist Lesefläche (20.09.2026)** — es liegt über Tray und unterem Brett; mit `pointer-events:auto` schluckte es jeden Tap dort, im Dev-Modus ließ sich keine Tray-Karte auswählen (Befund „kann keine Pflanze platzieren"). Regel: das Overlay nimmt **keine** Spiel-Eingabe an (`pointer-events:none`); nur seine eigenen Bedienelemente (FX-Knopf) schalten sich wieder scharf.

## B9. UI kit + icons (SVG, single `ui/icons.tsx`)

- Icons (24×24, 2 px ink stroke, paper fill): energy-drop, heart-leaf, wave, play, pause, settings-gear, language-globe, nektar-drop, trophy, dna-helix, sword, shield, plus, x, back-arrow, volume, volume-off, bug (dev only).
- Panels: paper cards — `#f5efdc` fill, `#2b2b26` ink border 2 px, 3 px offset hard shadow, corner torn-radius (SVG path), no blur-glass.
- Buttons: ink outline, paper fill, press = translate 2 px + shadow shrink (no scale transform — feels like paper, not iOS).
- Typography: display = "Gaegu" or "Patrick Hand" (hand-drawn, bundled via @fontsource, no CDN); numbers/body = system stack. Title wordmark = custom SVG paths.
- Palette tokens in `index.css`: `--paper:#f5efdc; --paper-dim:#e8dfc8; --ink:#2b2b26; --leaf:#5a8f4e; --leaf-dark:#2e4a2a; --bloom:#c96f8e; --nektar:#d9a441; --danger:#a94438; --night:#1c222b;` — replaces the dark-Slate prototype tokens.

### B16.7 Sprache der Release-Fläche (aus A17)

Die drei Literale in `Codex.tsx` wandern in die i18n-Schicht (de + en) — die Schlüssel für diesen Screen existieren bereits. Kein Radikalschnitt über alle Komponenten: Der Bestand an hardcodierten deutschen Literalen in `src/components/*.tsx` wird **gezählt und als Obergrenze verankert** (Ratchet) — die Zahl darf sinken, nicht steigen. Sichtprüfung beider Sprachen bei 390×844, weil Sprache kein Testfall ist.

## B18. Loadout bedienbar machen — die Zucht muss im Run ankommen (Auftrag aus A19.6)

### B18.1 Sammlung und Loadout trennen

Der Menü-Abschnitt zeigt künftig **zwei** Dinge getrennt: den echten `meta.loadout` (Belegung „n/4", Kapazität aus `toggleLoadout`) und darunter die Sammlung (`variantCounts > 0`). Jede besessene, nicht mitgenommene Pflanze bekommt einen „Mitnehmen"-Schalter, jede mitgenommene einen „Ablegen"-Schalter. Die Überschrift darf nicht mehr lügen.

### B18.2 Der Run zeigt den Unterschied

Mit gefülltem Loadout greifen die bereits vorhandenen Pfade: `inventory[id] = 2` je Eintrag (`root.ts`), `resolveBredVisuals(savedVariants.filter(v => loadout.includes(v.id)))` für Silhouette/Farbe (`GameView`). Ein Kind muss sichtbar **anders** aussehen und spielen als eine Basis-Pflanze — sonst ist die Discovery-Chain Deko.

### B18.3 Gates

- `src/meta/brood_loop_continuation.test.ts`: `toggleLoadout` rein/raus, Kapazität 4 (danach unverändert), kein Eintrag ohne Bestand, Persistenz in einem Schritt.
- E2E (lesend): Loadout-Änderung überlebt einen Reload; die Tray-Zahl im Run entspricht dem Loadout.
- Sichtprüfung (390×844 + Desktop): Sammlung und Loadout sind unterscheidbar — ein Screenshot, der beide Abschnitte zeigt.

### B18.4 DoD für B18

- [x] Überschrift und Inhalt des Loadout-Abschnitts stimmen überein (A19.6) — **umgesetzt**: zwei Abschnitte (Loadout n/4 mit Mitnehmen/Ablegen über `toggleLoadout`, darunter die Sammlung); Menü liest nach Run-Exit frisch (B17.1). Lock: `b18.test.ts`
- [ ] Eine gezüchtete Pflanze ist im Run platzierbar und visuell unterscheidbar (Verdrahtung steht: `root.ts` Inventar, `resolveBredVisuals`; Sichtbeweis offen)
- [x] `tsc` clean, Suite grün (214/214), E2E 11/11, Shinon-Gate offen (Enforcement)

---

## B21. Onboarding „Krix" — animiertes Dialog-System (Auftrag: Tutorial/Onboarding)

### B21.1 Befund

Es gibt **kein** Onboarding. Ein neuer Spieler landet im Run-Screen mit einer Notizzettel-Zeile
(`game.hint`) und muss die Bedienung aus dem Text erschließen: welcher Knopf startet die Welle, was
bedeuten die HUD-Chips, dass ein Tap aufs Feld platziert. Die Hilfetexte (`i18n/help.ts`) decken nur
das Gewächshaus ab. Kein Screen hat einen Dialog-Layer, keine Sprechblase, keine Figur, keinen
Hinweis am Ziel-Element. Die Vorbereitungsphase startet die erste Welle zusätzlich nach
`AUTO_WAVE_DELAY_TICKS` (90 Ticks = 3 s) automatisch — wer in Ruhe liest, wird beim Lesen angegriffen.

### B21.2 Spec

1. **Ein Dialog-System, ein Owner.** `src/components/tutorial/` hält Schrittmodell (`script.ts`),
   Zustandsmaschine (`controller.ts`) und Präsentation (`TutorialOverlay`, `Stickman`,
   `SpeechBubble`). Die Spielertexte liegen in der i18n-Schicht (`src/i18n/tutorial.ts`, DE + EN
   paritätisch) — Sprache ist kein Sonderfall (Regel 1).
2. **Figur = Krix**, ein Fineliner-Strichmännchen mit Klemmbrett (B0.7/B0.9: Papierwelt, Ink-Kontur,
   kein Emoji, kein Stock-Icon). Er wird animiert **eingeblendet** (Ink-Draw über `stroke-dashoffset`,
   Anschieben von unten) und atmet danach weiter (Idle-Bob, Blinzeln, Mund beim Sprechen).
3. **Comic-Sprechblase** mit Papierverchluss, harter Ink-Kontur, Offset-Schatten und Schwanz. Krix
   zeigt abwechselnd einen kurzen Prompt und — erst nach einem echten Ereignis — die Reaktion:
   `karte` → `auswahl`, `pflanzen` → `platzierung`, `bau` → `bau_ergebnis` usw. Ein Prompt ohne
   Ereignis bleibt bei derselben Notiz; es gibt keinen unsolicited Reaktionsschwall.
4. **Blinkende Handlungsanweisung:** jeder Prompt zielt auf **genau ein** reales Bedienelement
   (`data-tut="language|begin|endless|card|board|layout-done|wave|pause|hud"`). Der Cue-Ring
   blinkt dort; der Overlay-Rahmen ist `pointer-events: none`, damit der Spieler die echten
   Knöpfe bedient. `data-tut-avoid` markiert Hub- und Tray-Karten; `bubbleLayout.ts` sucht die
   Blasenposition außerhalb dieser Flächen und im Viewport. `data-tut-avoid` ist die einzige
   Kollisionsquelle — Krix dupliziert keine DOM-Geometrie.
5. **Ein Writer pro Wahrheit:** Das Tutorial besitzt ausschließlich Präsentations-State. Es liest
   Sim-Signale (Phase, Pause, Auswahl) und **schreibt** nur `meta.tutorialVersion` (beim Abschluss)
   und den Tutorial-Hold (`holdRef`, Präsentations-Gate im RAF — kein Sim-Schreibzugriff).
6. **Kein Zeitdruck beim Lesen:** die Feld-Prompts und ihre kurzen Reaktionen (`feld`, `karte`,
   `auswahl`, `pflanzen`, `platzierung`) setzen den Hold. Der Hold fällt nach dem bestätigten
   Ereignis; die Welle selbst läuft ohne Krix-Freeze.
7. **Persistenz:** `MetaSave.tutorialVersion` (v7, Migration 1→6 bleibt lesbar) entscheidet, ob das
   Onboarding automatisch startet: `tutorialVersion < TUTORIAL_VERSION` ⇒ es läuft genau einmal.
   Ein Bool konnte die überarbeitete Tour nicht ausdrücken (s. B21.6). Kein zweiter Speicher, kein
   `localStorage`-Zugriff außerhalb `persistence/`.
8. **DevGate (B7.6):** `?dev=1` überspringt das Onboarding (Entwickler-Werkzeug), `tutorial=1`
   erzwingt es auch hinter dem Gate, `tutorial=0` unterdrückt es explizit. Die Release-Fläche
   (ohne DevGate) zeigt es automatisch — der E2E-Beweis läuft über den echten Release-Pfad.

### B21.3 Schrittfolge (eine Quelle: `script.ts`)

Jeder Eintrag liegt auf genau **einem** Screen und besteht aus einem Prompt mit Ereignis plus einer
kurzen Reaktion. `screenLeft` ist der einzige Sprung zwischen Screens; die Reaktion landet auf dem
Screen, den der Spieler gerade betreten hat.

| Screen | Prompt → Reaktion | Ereignis / Ergebnis |
|---|---|---|
| start | `ankunft` → `sprache` | eigene Sprachwahl; danach wird der Startknopf erklärt |
| start → menu | `startknopf` → `hub` | Screenwechsel; der Flur wird eingeordnet |
| menu → run | `labor` → `feld` | „Endlos“; das Beet und der nächste Handgriff werden erklärt |
| run | `karte` → `auswahl` (Hold) | ausgewählte Tray-Karte; danach freie Zelle |
| run | `pflanzen` → `platzierung` (Hold) | angenommener Drop; Ablehnungen bleiben ohne Reaktion |
| run | `bau` → `bau_ergebnis` | Bauphase verlassen; Welle ist vorbereitet |
| run | `welle` → `welle_ergebnis` | `phase === 'wave'`; die Gäste laufen |
| run | `pause` → `pause_ergebnis` | Pause wurde gedrückt |
| run | `weiter` → `weiter_ergebnis` | Pause wurde beendet |
| run | `chips` → `abschluss` | HUD gelesen; der Loop endet mit dem Freigabe-Klick |

**Ereignisregel** (`controller.met`): ein Prompt reagiert nur auf eine Änderung nach seinem
Eintritt (`langChosen`, Auswahl, angenommene Platzierung, Phase oder Pause). Ein wiederholter
Zustand ist still. `skipIfCurrent` verhindert, dass ein bereits eingetretener Zustand (z. B. die
automatisch gestartete Welle) den Spieler in einer Endlosschleife fängt.

**Sprungregel:** liegt der offene Schritt auf einem Screen, dessen Rang der Spieler schon hinter
sich hat (`screenRank(screen) > SCREEN_RANK[step.screen]`), ist er vorbei. Wer vorrennt, wird
nicht ausgebremst; wer den Run verlässt, findet seinen Schritt beim Wiedereintritt unverändert vor.

### B21.4 DoD für B21

- [x] Schrittmodell und i18n-Texte deckungsgleich: 20 Prompt/Reaktion-Einträge, DE + EN —
  Lock: `components_tutorial.test.ts`, `i18n_texts.test.ts`
- [x] Ereignis-Kanten: unveränderter Zustand löst keine Reaktion aus, abgelehnte Platzierung bleibt still —
  Lock: `components_tutorial.test.ts`
- [x] Karten-Kollision: `bubbleLayout` + `data-tut-avoid`, Blase und Figur bleiben im Viewport —
  Lock: `components_tutorial.test.ts`, `tests/krix_bubble.spec.ts`, Preview 390×844 + Desktop
- [x] Release-Fläche ohne Dev-/Popup-Zeile; DevGate-Footer nur hinter `?dev=1` — Lock: `tests/krix_bubble.spec.ts`
- [x] TypeScript, Suite und Build grün; `TUTORIAL_VERSION = 5` startet die neue Fassung genau einmal

### B21.5 Nachtrag — Sichtprüfung und E2E

Die alte Tour hatte keinen belastbaren E2E-Vertrag. `tests/krix_bubble.spec.ts` prüft jetzt auf
390×844 den kompletten sichtbaren Bubble-Vertrag: Release-Pfad ohne DevGate, Hub- und Tray-Karten
bleiben frei, der Papierhintergrund ist vorhanden und die Blase liegt vollständig im Viewport.
Die Preview wurde zusätzlich bei Desktop und 390×844 geprüft; der Sichtpfad ist damit nicht
mehr nur eine Behauptung aus dem DOM-Vertrag.

### T6-Status (24.09.2026) — P-3/P-12/P-20/P-24/P-25 erledigt, P-36 offen

Die tote PvP-Fläche ist aus dem Hub entfernt, Tile-Werkzeuge bleiben beim Serienbau gewählt, die Spawn-Ecke wird nicht mehr vom ✕-Overlay verdeckt und die Tray liegt unter dem Frame. Für P-20 gibt es keinen Inaktivitäts-/Maus-Timer: `gameRuntime.ts` reagiert ausschließlich auf `visibilitychange → hidden`, pausiert die Clock und zeigt das Suspend-Overlay. Die Behauptung eines Dimmer nach bloßer Mausinaktivität ist damit **widerlegt**; der Code enthält keinen solchen Zustand. P-36 bleibt offen, weil die Frage, ob die Feldmitte im Erstlauf bewusst erreichbar sein soll, eine Produktentscheidung ist und nicht durch eine automatische Wirtschaftsänderung beantwortet werden darf. Belege: `placementController.test.ts`, `qa_befunde.test.ts`, `tests/mobile.spec.ts`, `tests/layout_regie.spec.ts`, `src/render/gameRuntime.ts:247-254`.

### B21.6 Nachtrag — die Tour begann zu spät (Befund: Erstspieler-Test)

**Befund.** Der Erstspieler-Bericht (16.09., Version 0.1) führt als Onboarding-Risiko genau das:
„Guter Hook, wenig Erklärung — erklärt nicht die konkrete erste Entscheidung: Wo darf ich bauen,
wie weit reicht ein Turm, wann startet eine Welle?" Im Spiel nachgestellt: Die Sprechblasen
erscheinen **erst beim Klick auf „Endlos“** — also nach Sprachwahl, Titel-Screen und Hub. Wer den
Titel-Screen verlässt, ohne ins Feld zu gehen (Shop, Gewächshaus, Codex), begegnet der Figur nie.

Ursache war nicht Kaputtheit, sondern **Ownership**: Die Zustandsmaschine lebte in `GameView`, also
konnte die Tour nur existieren, solange der Feld-Screen gemountet war. Zweite Folge derselben
Ursache: jeder neue Run ist ein neues `GameView` (`key={runId}`) und begann die Notizen wieder bei 1.

**Spec.**

1. Der **Screen-Router besitzt** die Tour: `TutorialProvider` hält den einen Controller, die
   gesehene Fassung aus dem Meta und den Abschluss-Writer. Die Screens hängen nur noch
   `TutorialLayer` ein (Titel, Menü-Rahmen, Feld) und melden Signale — kein Screen besitzt State.
2. Die Tour hat **drei Stationen** (Titel → Hub → Feld) mit der Sprungregel aus B21.3.
3. `TutorialOverlay` ist rein präsentational (der Schritt kommt als Prop) — die Zustandsmaschine
   kennt kein DOM, das DOM kennt keine Zustandsmaschine.
4. Persistenz wird zur **Fassung** (`tutorialVersion`, MetaSave v7): die überarbeitete Tour läuft
   bei Bestandsspielern genau einmal neu. Ein Bool hätte sie genau denen vorenthalten, die die
alte Tour schon kannten — inklusive des Spielers, der den Bericht geschrieben hat.
5. Der DevGate-Vertrag bleibt unverändert (`?dev=1` überspringt, `tutorial=1` erzwingt,
   `tutorial=0` unterdrückt). Router- und Preview-E2E fahren mit `?tutorial=0` — sie messen
   Navigation und Layout, nicht die Tour.

**DoD — abgelöst durch B21.4/B21.5 (23.09.2026).** Die fünf Punkte bleiben als Herkunft stehen;
ihr Nachweis liegt jetzt an einer Stelle (B21.4/B21.5), damit hier keine zweite Statusliste lebt.

- [x] Erster Schritt auf dem **Titel-Screen** (Cue: Sprachwahl) — Lock: `components_tutorial.test.ts`
- [x] Sprungregel (`screenRank`) und Wiedereintritt in den Run — derselbe Lock
- [x] Genau ein Controller (Provider); kein Screen hält eigenen Tutorial-State — `TutorialLayer.tsx`
- [x] Router-/Preview-E2E unverändert grün mit `?tutorial=0` — `tests/router.spec.ts`, `tests/preview.spec.ts`
- [x] Hold-Menge folgt B21.2 Punkt 6: die Feld-Sequenz (`feld`, `karte`, `auswahl`, `pflanzen`,
      `platzierung`) hält die Sim an, nicht mehr die alte Zwei-Schritt-Fassung; `hold` steht im
      Schrittmodell (`script.ts`) und ist damit prüfbar.

### B21.7 P-15 — freiwilliges Nachlesen (24.09.2026)

**Spezifikation.** Nach dem bewussten Überspringen bleibt `tutorialVersion` der einzige
Gesehen-Stand; der Hub bietet danach `Krix-Notizen` als freiwilligen, read-only Review. Der Review
liest `TUTORIAL_STEPS` und `tutorialTexts`, zeigt alle 20 Notizen in DE/EN und schreibt weder
Meta noch Simulation. Er startet keinen neuen Provider/Controller und wird nicht durch `?tutorial=1`
erzwungen.

**Belege.** `src/components/tutorial/NotesReview.tsx`, `src/App.tsx`, `src/components/MainMenu.tsx`,
`src/components/components_tutorial.test.ts`, `tests/notes_review.spec.ts`; P-15 steht im
ROADMAP als BEHOBEN. Der scrollbare Review hält seinen Schließen-Header sichtbar; damit bleibt
die Aktion auch auf 390×844 erreichbar, ohne eine zweite Modal- oder State-Wahrheit einzuführen.

**Abgrenzung.** Der Blindlauf hat keine neue Wirtschaftsregel erfunden: Eine Center-Platzierung
der Leihpflanze kann weiterhin 0 Nektar ergeben. Diese Onboarding-Frage ist als P-36 im
ROADMAP offen; B21.7 behauptet nur das read-only Nachlesen, keine garantierte Erstplatzierung.

---

## B22. Leere Tray beim Betreten des Runs (Befund: Erstspieler-Test)

### B22.1 Befund

Der Tray-Bestand speist sich allein aus dem HUD-Snapshot des RAF-Takts
(`inventory={hud?.inventory ?? {}}` in `GameView`). Vor dem ersten Takt — bis zu 100 ms — ist `hud`
`null`: **jede** Karte stand als „×0" da und war `aria-disabled`. Ein Tap in diesem Fenster wurde
ignoriert, und der Blick auf die Tray sagte „du hast nichts", obwohl der Bestand längst in der Sim
lag.

Gefunden hat das nicht die Sichtprüfung, sondern die E2E-Suite: `progression.spec.ts:169` war rot
(„Pflanze konnte nicht platziert werden"), weil ihr Helfer die Karte unmittelbar nach dem Mount auf
`isEnabled()` prüft. Der Fall war damit **laufzeit-abhängig** (kalt gestarteter Dev-Server: grün,
warm: rot) — genau die Sorte Flake, die man sonst als „Test ist halt wackelig" abhakt.

### B22.2 Spec

Ein Abbild, eine Quelle: `src/components/hudSnapshot.ts` baut das HUD (`hudOf(state, paused)`), und
**sowohl** der Takt **als auch** die Erst-Anzeige beim Mount konsumieren es. `GameView` setzt den
Snapshot direkt nach dem Erzeugen von `SimulationRoot` (vor dem ersten Frame). Kein neuer State,
kein zweiter Writer: die Ableitung liest die Sim read-only und kopiert das Inventar (kein Aliasing
in den Sim-State hinein).

### B22.3 DoD für B22

- [ ] Tray zeigt Bestand/Energie im **ersten** Bild (`aria-disabled` korrekt je Karte) — Lock: `hudSnapshot.test.ts`
- [ ] `hudOf` ist reine Ableitung ohne Sim-Schreibzugriff und kopiert das Inventar — Lock: `hudSnapshot.test.ts`
- [ ] HUD-Aufbau existiert genau einmal (Takt + Mount teilen `hudOf`) — kein zweites Snapshot-Literal
- [ ] `GameView` bleibt ≤ 400 LOC; `tsc` clean, Suite grün, `vite build` grün
- [ ] `progression.spec.ts:142 → :169` in Folge grün (vorher reproduzierbar rot)

---

## B23. Aufbauphase, phasenrichtiger Wellen-Knopf, sichtbare Ablehnung (Befund: zwei Spielerberichte)

### B23.1 Befund

Zwei unabhängige Spielerberichte (16.09., Erstspieler-Test und externer Playtest) melden denselben
Kern: „Ich verliere in Welle 1, bevor ich eine Pflanze stehen habe" (beide: Game Over in Welle 1–2
mit Score 0), „bei ungültigem Platzieren passierte sichtbar nichts", „Start Wave tut mitten in der
Welle nichts", und das Game-Over-Blatt zeigte „243.09999999999997".

Im Code verifiziert:

1. `root.ts` setzt `prepStartTick` beim Run-Start, `maybeAutoStart` zündet nach
   `AUTO_WAVE_DELAY_TICKS` (90 Ticks = 3 s) — unabhängig davon, ob etwas steht.
2. Der `PlacementController` kennt jeden Ablehnungsgrund (`rejection.reason`) — **gerendert wurde
   davon nichts**. Der FX (Shake, roter Blitz) feuerte; ein Text, WARUM, gab es nie.
3. `GameTopBar` zeichnete den Wellen-Knopf phasenblind: immer „Start Wave", auch während der
   laufenden Welle (wo `START_WAVE` in der Sim `false` zurückgibt).
4. Der Score ist eine Kombi-vervielfachte Sim-Größe und legitim gebrochen — angezeigt wurde er roh.

### B23.2 Spec

1. **Eine Quelle für Wellen-Timing** (`simulation/waveTiming.ts`): `autoStartTicksLeft` beantwortet,
   wann die Welle von selbst startet — das WaveSystem entscheidet damit, das HUD zeigt damit. Die
   Regel steht einmal, nicht als Verhalten UND Anzeige.
2. **Aufbauphase** (`PREP_WAITS_FOR_FIRST_PLANT` in `economy.source`): mit leerem Feld startet
   keine Welle von selbst — und der Anker (`prepStartTick`) wird nachgezogen, solange nichts
   steht. Warten kostet also keine Zeit; der Wellen-Knopf bleibt der Ausweg (kein Softlock), und
   ab der ersten Pflanze gilt wieder das normale Fenster.
3. **Der Knopf bleibt die Handlung**: in der Vorbereitung steht er immer als „Welle starten" da
   (erkennbar drückbar), der Countdown und der Wartehinweis stehen als Hinweiszeile darunter.
   Während der Welle wird aus dem Knopf eine Anzeige („Welle n läuft", deaktiviert).
4. **Ablehnung sichtbar** (`FieldToast`): der Grund aus dem Controller wird als Papier-Toast
   übersetzt — „Auf dem Weg ist kein Platz", „Zu wenig Energie", … Zeitbasis ist der Sim-Tick
   (keine Wanduhr), die Meldung verblasst nach `TOAST_TICKS` und überlebt keinen Run-Neustart.
5. **Score als Spielerzahl** (`numberFormat.formatScore`): gerundet wird nur in der Anzeige, nie
   in der Sim.
6. **i18n paritätisch**: alle neuen Schlüssel (`wave.*`, `field.reject.*`) in DE und EN.

### B23.3 DoD für B23

- [ ] Leeres Feld ⇒ nach 20 Sim-Sekunden noch Welle 0, keine Gegner, Score 0 — Lock: `placement_map.test.ts` (B23.1-Block) (gegen den echten `SimulationRoot`)
- [ ] Mit Pflanze läuft das Fenster und die Welle startet von selbst; der Knopf kann jederzeit
      starten (kein Softlock) — Lock: `placement_map.test.ts` (B23.1-Block)
- [ ] Knopf-Zustand rein aus Phase + Restzeit abgeleitet; Beschriftung in prep ist immer die
      Handlung — Lock: `waveButton.test.ts`
- [ ] Jeder Ablehnungsgrund hat einen eigenen DE/EN-Text; Toast-Lebensdauer am Sim-Tick, kein
      Überleben des Run-Neustarts — Lock: `waveButton.test.ts`
- [x] Game-Over-Score gerundet (`243.09999999999997 → 243`) — Lock: `waveButton.test.ts`
- [x] E2E ohne Warten: `run.spec.ts:163` stößt die Welle selbst an (der Test verteidigt ja nicht)
- [x] `tsc` clean, Suite grün, E2E 27/27, `vite build` grün

## B25. Spielerbericht-Runde 2 — Verwelken, Zähler, Sprachmix (Befund: zwei Spielerberichte)

### B25.1 Befund

1. **Verwelken lautlos** (`plantSystem`): `lifeTicksLeft` schwächt und entfernte bezahlte
   Pflanzen; sichtbar war nur der `wither_dust`-Partikel. Kein Timer, keine Warnung.
2. **Loadout-Zähler widerspricht der Liste** (`MainMenu`): gezählt wurde `meta.loadout.length`,
   die Liste filterte nach Besitz — Einträge ohne Bestand zählten mit, erschienen aber nicht.
3. **Codex-Sprachmix**: DE-Wörterbuch enthielt `codex.valid: 'Chain valid'`, `codex.firstBy:
   'First by'` (englische Werte im deutschen Zweig); die Fläche nannte Hash-Ketten wie ein
   Onlinedienst, obwohl der Sync ein reiner Stub ist und nichts das Gerät verlässt.

### B25.2 Spec

1. **Haltbarkeitsleiste** (`render/renderer.ts`): die Leiste erscheint erst in den letzten 30 %
   der Lebenszeit (genau die `WEAKENED_THRESHOLD`-Schwelle); Gelb = geschwächt, Grün = Restzeit.
   Vorher ist Vergehen kein Thema, danach ist die Restzeit ehrlich ablesbar. Rein präsentational
   — die Sim bleibt der einzige Writer.
2. **Loadout-Zähler aus der Liste** (`MainMenu`): Zähler und Liste speisen sich aus **einer**
   Wahrheit (`loadoutVariants`, gefiltert nach Besitz); das Limit-Verhalten (Voll = disabled)
   folgt derselben Quelle.
3. **Codex als Laborbuch**: Titel/Untertitel/Fußnote sagen, was das Ding ist — Entdeckungen
   bleiben auf diesem Gerät, die Prüfung rechnet lokal nach. Fachbegriffe in Spielerzeichenfolge
   (`codex.noteTitle`, `codex.countOne/Many`, …), DE und EN paritätisch.

### B25.3 DoD für B25

- [x] Geschwächte Pflanzen zeigen eine sichtbare Restzeit-Leiste am Feld
- [x] Loadout-Zähler und Listeneinträge können nicht mehr auseinanderlaufen (eine Quelle)
- [x] Kein englischer Literal im DE-Codex; der Lokalitätshinweis steht in beiden Sprachen

## B31. Signatur sichtbar, Easter Egg am Blattrand (Befund: Autorität ohne Namen)

### B31.1 Befund

Das Projekt trug keinen Namen auf dem Schirm: weder Titelkarte noch Hub-Fußzeile nannten den
Autor, und der Weg zum Quellcode existierte nur in der Git-Remote. Der Auftrag lautete: „unauffällig
aber sichtbar" — dazu README, ein Easter Egg, und eine Anpassung des SVG-Banners.

### B31.2 Umsetzung

1. **Eine Quelle, drei Flächen:** `components/CreatedBy.tsx` besitzt Name (`VANNON`), Motto
   („Volatile Agent Needing No Other Nonsense — Never Overly Nice, Never Average Vibe.") und URL.
   `CreatedBy` sitzt auf Titelkarte und Hub-Fußzeile; die README trägt dieselben Zeilen unter den
   Badges. Drei Kopien, die nicht auseinanderlaufen können, weil der Gate-Test die Wörter gegen den
   Namen prüft: der erste Motto-Halbsatz buchstabiert V-A-N-N-O-N.
2. **Der Name wird nicht übersetzt** (Regel 1 — eine Signatur bleibt original); zweisprachig ist
   nur die Bedienhilfe des Links (`signature.github`).
3. **Easter Egg, fragmentiert aber logisch:** je Papierfläche ein Wort der Randnotiz — Titelkarte
   „Volatile 1/6", Hub „Agent 2/6", Gewächshaus „Needing 3/6", Shop „No 4/6", Brutstätte
   „Other 5/6", Codex „Nonsense 6/6". Klein, kursiv, leicht gedreht, in Bleistiftgrau
   (Register der Kritzeleien aus B0), `aria-hidden` + `pointer-events:none`, Ecke alternierend
   links/rechts. Die Nummer verrät, dass es eine Reihe ist; die Zuordnung Fläche → Wort ist eine
   Map (`FRAGMENT_BY_SCREEN`), kein Zufall.
4. **SVG-Banner angepasst:** „created by VANNON" + Motto rechts unten, in der Banner-Schriftfamilie
   und gedeckten Tönen (keine eigene Farbachse). Als Bildtext, weil ein `img`-Banner keine Links
   trägt — der klickbare Weg steht in der README direkt unter dem Banner. Der Vitest-Badge wurde
   auf den aktuellen Stand gezogen (311).
5. **GitHub-Marke gezeichnet, nicht gestockt:** kleine Tusche-Katze im B0-Register
   (`MenuIcons.GitHubIcon`), 16px, kein Emoji, kein Stock-Icon.

### B31.3 Gate-Tests

`src/components/createdBy.test.ts` (5 Fälle): Motto-Halbsatz 1 buchstabiert den Namen,
Halbsatz 2 die eigene Abkürzung (NONNAV); Fragmente == Wörter des Halbsatzes; die Flächen-Map
deckt 0–5 lückenlos und doppelfrei ab; die URL zeigt auf dieses Repository; die Bedienhilfe ist
zweisprachig. Das Easter Egg selbst ist absichtlich **nicht** in E2E verdrahtet — es ist Deko;
ein Auffinden-Test würde die Versteckstelle dokumentieren statt schützen.

### B31.4 DoD für B31

- [x] Signatur auf Titelkarte, Hub und in der README; eine Quelle für Name/Motto/URL
- [x] Easter Egg: 6 Fragmente, 6 Flächen, logische Reihenfolge, unauffällig im Papier-Register
- [x] SVG-Banner mit Signatur; README-Badge auf 311 Tests
- [x] Kein Stock-Icon/Emoji (gezeichnete Marke), Name unübersetzt, Bedienhilfe zweisprachig
- [x] Gate-Tests grün, tsc clean, `vite build` grün, E2E grün

---

## QA-Abgleich (19.09.2026) — erledigte Befunde dieser Domäne

Quelle: externer Spieler-Playtest 19.09.2026 (mit Screenshots), Re-Test + DE-Fassung v0.0.53,
Verständnis-QA v0.0.55. Nur am aktuellen Code **belegte** Erledigungen; Offenes steht in
`docs/process/ROADMAP.md` §3.

- **Hinweisblase verdeckte die Tray-Beschriftungen. BEHOBEN (F5/B42).** Im geführten Modus ist
  der Blasenrahmen durchlässig (`bubbleIsPointerTransparent`/`bubbleFrameStyle`) und hat keine
  eigene Verdeckungszone mehr — der Klick aufs geführte Ziel kommt an. Dazu der zweite Teil des
  Befunds („Nachrichten klappen ein, ohne dass man sie nachlesen kann"): `bubbleTextVisible`
  bindet die Sichtbarkeit AUSSCHLIESSLICH an „✕ Gelesen", nie an einen Timer; jeder neue Schritt
  startet mit sichtbarem Text.
- **„Welle starten" vs. „Fertig gebaut" — falscher Hinweis und zwei gleiche Knöpfe. BEHOBEN.**
  Der Hinweis nennt jetzt den echten Weg („Fertig gebaut" startet die erste Welle), und die
  beiden Knöpfe heißen verschieden: `layout.done` („Fertig gebaut") und `layout.doneLong`
  („Bauen beenden"). Die Begründung steht im Textfile selbst, damit sie nicht zurückgebaut wird.
- **Roter Banner neben grünem Geist (Vorschau lehnte ab, was die Sim annimmt). BEHOBEN (R2).**
  Die Vorschau reicht die ECHTE Weltgröße der Sim durch (`gameRuntime` → `cellRejectReason`),
  und `PlacementBoard.cols/rows` sind Pflichtfelder — der frühere Default 12 hat jede Zelle einer
  gewachsenen Welt als „kein Platz" gemeldet. Fehlt die Weltgröße künftig, ist das ein
  Compile-Fehler statt eines roten Geistes. Zusätzlich nennt jede Ablehnung ihren Grund
  (`field.reject.*`, u. a. `no_material`, `occupied_plant`, `out_of_world`).
- **Tray-Karte zeigte eine rohe ID („seed_0") statt „Spross (Keim 1)". BEHOBEN (F4/N3).**
  `plantLabels.ts` löst in einer Kette auf: i18n-Key → Source-Label (deutsch, kanonisch) → Roh-ID;
  gezüchtete Varianten ohne Source-Eintrag sind über `EXTRA_LABEL_KEYS` (z. B. `loan_sprout`)
  angebunden. Tray, Nachkauf und aria-labels nutzen dieselbe eine Quelle.
- **Signatur-Fragment im Spielfluss („Needing 3/6"). BEHOBEN.** „Needing" existiert im Code nur
  noch in der Signatur selbst (`CreatedBy.tsx`: VANNON = *Volatile Agent Needing No Other
  Nonsense*) und im Easter Egg — kein UI-Text baut mehr darauf auf.
- **Der HUD-Chip zeigt jetzt den LAUFWEG (Entscheidung 19.09.2026).** Statt „WEG-GÜTE 100 %"
  (eine Quote, die „gerade" nicht von „monoton gebogen" unterscheiden konnte) stehen dort zwei
  Felder-Zahlen: die echte Weglänge und daneben „· min" der kürzeste mögliche Weg — der Abstand
  ist der Maze-Gewinn, und die Zahl ist direkt das Zeit-unter-Feuer-Maß. Quelle ist EINE Funktion
  (`routeMetrics` über die State-Route, gelesen im `hudSnapshot`); die i18n-Keys
  `game.pathTiles`/`game.pathTilesHint` nennen, was gemessen wird, und Krix erklärt denselben
  Chip im Onboarding (`tut.chips.text`, beide Sprachen). Beleg: HUD-Snapshot-Test + Live-Preview.
- **Der Blumentopf erklärt seine vier Farben dort, wo man ihn auswählt.** Die FELD-Karte trägt
  als Titel „Jede Topf-Zelle trägt eine feste Farbe …" plus die vier Wirkungen (`pot.amber`,
  `pot.violet`, `pot.moss`, `pot.rust`) und einen Vier-Farb-Punkt. Bewusst KEINE schwebende
  Beschriftung — genau die hatte früher die Tray-Karten verdeckt (F5/N4).
- **Onboarding als Spielerfluss — im Re-Test v0.0.53 belegt (historischer Stand: 10/10 Schritte,
  `tutorialVersion 3`).** Heute gilt die überarbeitete Fassung: 20 Einträge als 10
  Prompt/Reaktion-Paare, `TUTORIAL_VERSION = 5`; der aktuelle Nachweis steht in B21.4/B21.5.
  KRIX trägt weiter die sichtbare Rolle („Praktikant · Strich mit Klemmbrett") und der Tour-Schritt
  nennt den echten Weg (Leih-Spross → eigene Pflanze → wegweisender Lauf).
