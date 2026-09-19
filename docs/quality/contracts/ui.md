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

## B7. Screen specifications

**Title (B7.1)** — full-bleed canvas scene behind minimal DOM: layered paper hills + swaying grass silhouettes drifting (cosmetic namespace, 3 depths, parallax on device tilt later); 2–3 ambient LEAF/SPORE particles/s; logo = custom SVG wordmark (B9) with 600 ms draw-on + settle; big ink-styled PLAY button (min 56 px target); language pills bottom; first pointer = audio unlock + soft chime. Sequence: paint → logo draws → button fades up. Never a bare div flash.

**Main menu (B7.2)** — same world dimmed; nektar counter with drop icon (SVG); stat chips (best wave, runs, collection); three mode cards as **illustrated panels** (greenhouse/endless/pvp each a mini canvas vignette, not emoji); collection grid with `PlantThumb` + count; loadout editor: tap to toggle ≤ 4 carried plants (B1).

**Greenhouse / Breeding ceremony (B7.3)** — replaces `<select>`: two parent slots (tap → collection sheet of `PlantThumb` cards, owned counts shown); center stage 240×240 canvas runs the breeding animation when KREUZEN is pressed (~1.6 s, deterministic from breed seed): parents slide in → genome markers (gene glyphs) orbit between them → dominant genes flare (accent, not glow) → mutation glitch: 2-frame ink-slash → seed drops to soil → offspring grows (scale + unfurl) → traits list staggers in → 3 result cards below. `SKIP` on tap. Cancel = back always safe.

**HUD (B7.4)** — top-left: energy (drop icon + count, punch on gain), lives (leaf-heart), wave chip `W 3`; top-right: pause icon + menu icon. Nothing else. Combo appears center-bottom of canvas as manga burst `×N` when ≥ 2. Phase is communicated by world (lighting), never a text label.

**Pause & Game Over (B7.5)** — pause: dim + resume/restart/exit + volume toggles. Game over: ink panel slides up, `WAVE N` large, score + combo highest + **nektar earned with flight-to-counter animation**, buttons New Run / Menu. `recordRunEnd()` fires exactly once here (guard flag).

**DevGate (B7.6)** — `#dev` hash or `?dev=1` reveals: state hash, tick, event log (last 20), particle count/budget, seed + runId, FX toggle, RNG draw counters, entity inspector (entity id / variantKey / visual seed / palette). Release build: zero dev surface, zero seed badge, zero counters.

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
3. **Comic-Sprechblase** mit Papierverschluss, harter Ink-Kontur, Offset-Schatten, Schwanz und
   Schreibmaschinen-Reveal; erster Tipp auf die Blase = voller Text, zweiter Tipp = nächster Schritt.
4. **Blinkende Handlungsanweisung:** jeder Schritt zielt auf **genau ein** reales Bedienelement
   (`data-tut="language|begin|endless|card|board|wave|pause|hud"`). Der Cue-Ring blinkt dort
   (marchierende Ink-Striche, Ecken-Marker, Label) und der Arm der Figur zeigt auf das Ziel. Der
   Overlay-Rahmen ist `pointer-events: none` — der Spieler bedient **die echten Knöpfe**, nie eine
   Attrappe. Liegt ein Ziel außerhalb der Falz (Hub), holt der Overlay es einmal ins Bild.
5. **Ein Writer pro Wahrheit:** Das Tutorial besitzt ausschließlich Präsentations-State. Es liest
   Sim-Signale (Phase, Pause, Auswahl) und **schreibt** nur `meta.tutorialVersion` (beim Abschluss)
   und den Tutorial-Hold (`holdRef`, Präsentations-Gate im RAF — kein Sim-Schreibzugriff).
6. **Kein Zeitdruck beim Lesen:** die Leseschritte `karte`/`pflanzen` setzen den Hold (die Sim tickt
   nicht ⇒ auch der Auto-Start-Timer steht). Der Hold fällt mit dem platzierten Drop — die Pflanze
   erscheint dadurch im nächsten Frame.
7. **Persistenz:** `MetaSave.tutorialVersion` (v7, Migration 1→6 bleibt lesbar) entscheidet, ob das
   Onboarding automatisch startet: `tutorialVersion < TUTORIAL_VERSION` ⇒ es läuft genau einmal.
   Ein Bool konnte die überarbeitete Tour nicht ausdrücken (s. B21.6). Kein zweiter Speicher, kein
   `localStorage`-Zugriff außerhalb `persistence/`.
8. **DevGate (B7.6):** `?dev=1` überspringt das Onboarding (Entwickler-Werkzeug), `tutorial=1`
   erzwingt es auch hinter dem Gate, `tutorial=0` unterdrückt es explizit. Die Release-Fläche
   (ohne DevGate) zeigt es automatisch — der E2E-Beweis läuft über den echten Release-Pfad.

### B21.3 Schrittfolge (eine Quelle: `script.ts`)

Jeder Schritt liegt auf genau **einem** Screen: `start` (Titel), `menu` (Hub), `run` (Feld).

| Screen | Schritt | Cue | geht weiter durch |
|---|---|---|---|
| start | `ankunft` | Sprachwahl | eigener Tap auf eine Sprache (`langChosen`) |
| start | `startknopf` | „Spiel starten" | Verlassen des Screens |
| menu | `labor` | „Endlos"/Hub-Karten | Verlassen des Screens |
| run | `karte` (Hold) | Tray-Karte | angenommene Karten-Auswahl |
| run | `pflanzen` (Hold) | Feld | angenommener Drop (neue Platzierung) |
| run | `welle` | „Welle starten" | `phase !== 'prep'` |
| run | `pause` | Pause-Knopf | pausiert |
| run | `weiter` | Pause-Knopf | läuft wieder |
| run | `chips` | HUD | eigener Knopf |
| run | `abschluss` | — | eigener Knopf, schreibt `tutorialVersion` |

**Sprungregel** (`controller.met`): liegt der offene Schritt auf einem Screen, dessen Rang der
Spieler schon hinter sich hat (`screenRank(screen) > SCREEN_RANK[step.screen]`), ist er vorbei —
ohne Zutun. Wer vorrennt (Sprache nicht angefasst, Hub übersprungen), wird nie ausgebremst; wer den
Run verlässt, findet seinen Schritt beim Wiedereintritt unverändert vor (Rang ist einseitig).

### B21.4 DoD für B21

- [ ] Schrittmodell und i18n-Texte deckungsgleich (jeder Schritt hat DE- und EN-Text) — Lock: `components_tutorial.test.ts`
- [ ] Zustandsmaschine deterministisch (kein `Math.random`, keine Wanduhr) — Lock: `components_tutorial.test.ts`
- [ ] Genau ein Writer (`tutorialVersion` über `updateMeta`, Hold über `holdRef`) — Lock: Gate + `meta_migrations.test.ts`
- [ ] `MetaSave` v7 liest v1–v6 verlustfrei, das v6-Ja wird zu Fassung 1 — Lock: `meta_migrations.test.ts`
- [ ] Sprungregel einseitig: übersprungene Screens fallen, künftige warten — Lock: `components_tutorial.test.ts`
- [ ] Cue-Ziele existieren im DOM (`data-tut`), Overlay blockiert die echten Knöpfe nicht — E2E (Tutorial-Sweep)
- [ ] `tsc` clean, Suite grün, `vite build` grün; GameView bleibt ≤ 400 LOC (GameTopBar extrahiert)

### B21.5 Nachtrag — E2E-Beweis zurückgebaut

Der Onboarding-E2E ist auf Wunsch entfallen (er kostete je Lauf Sekunden
und deckte dieselben DOM-Verträge ab, die `components_tutorial.test.ts` deterministisch prüft). Damit gilt für
B21: Cue-Ziele und Hold-Verhalten sind **unit-gelockt**, der Sichtpfad ist nur noch manuell
(Preview) belegt — nicht E2E.

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

**DoD.**

- [ ] Erster Schritt erscheint auf dem **Titel-Screen** (Cue: Sprachwahl) — Lock: `components_tutorial.test.ts`
- [ ] Sprungregel: `screen: 'run'` überspringt die drei Stationen davor, `screen: 'greenhouse'`
      wartet — Lock: `components_tutorial.test.ts`
- [ ] Hold nur in `karte`/`pflanzen`, nie auf Titel oder Hub — Lock: `components_tutorial.test.ts`
- [ ] Genau ein Controller (Provider); kein Screen hält eigenen Tutorial-State
- [ ] Router-/Preview-E2E unverändert grün mit `?tutorial=0`

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
