# LifeSeedLab — Umsetzungsplan

Status: **verbindliche Arbeitsliste**  
Erstellt: 2026-09-14  
Grundlage: `AGENTS.md`, `ARCHITECTURE_CONTRACT.md`, `ARCHITECTURE.md`, `docs/QUALITY_SPEC.md`

## Ziel

Aus dem technisch tragfähigen Singleplayer-Prototyp wird schrittweise ein deterministisches, visuell eigenständiges und mobil nutzbares Spiel. Multiplayer wird zunächst nur durch saubere Command-/Snapshot-Grenzen vorbereitet; ein Netzwerk-Backend bleibt bis zum Abschluss der Core-Gates ausdrücklich zurückgestellt.

## Leitplanken

- Ein State-Slice hat genau einen Writer.
- `SOURCE + SEED + CLOCK + PLAYER COMMANDS` bleibt die einzige Gameplay-Wahrheit.
- Alle Zufälligkeit läuft über `src/core/rng.ts`; Präsentations-RNG bleibt vom Gameplay getrennt.
- Canvas, React und Observer schreiben niemals Gameplay-State.
- Content-Werte gehören in `src/config/*.source.ts`.
- Harte LOC-Caps aus dem Architekturvertrag werden eingehalten; bei Überschreitung wird gesplittet.
- Jede Phase endet mit Tests und Typecheck, bevor die nächste Phase beginnt.

## 0. Art Direction & Pipeline (verbindlich, vor jeder UI-Arbeit)

- Quelle: `ARCHITECTURE.md` §3.1/§3.2 und `docs/QUALITY_SPEC.md` B0.
- Pipeline: `SOURCE → GENOME → TRAITS → GAMEPLAY PHENOTYPE → VISUAL PHENOTYPE → SIMULATION → EVENT → OBSERVER → RENDER` — Grafik besitzt keine zweite Wahrheit. `genomeToVisualInput()` ist die einzige Genome→Visual-Eingabe; der Renderer zeichnet nur `ResolvedVisual`.
- Welt: Haptischer Papercraft-Look — Papierhintergrund + Papierwege mit Drop-Shadow + Fineliner-Rasterpunkte. Keine zweite Präsentationslogik in React/Canvas.
- Lebewesen: Pflanzen/Gegner als detailreiche Nintendo-Pop-Figuren auf matter Papierwelt; jede gezüchtete Variante ist visuell distinkt (per Genom → `ResolvedVisual`, test-locked).
- UI: Forschungsbuch/Notizzettel-Ästhetik (Post-it/Pappschild/Büroklammer), keine generischen Gradient-/Blur-Karten.

## Phasen und Abnahmekriterien

### Phase A — Konsolidierung und Identität

**Zweck:** Doppelte Wahrheiten und React-Session-Zustände entfernen, ohne die bestehende Simulation neu zu erfinden.

- [x] Legacy-Entity-/Worker-Typen aus `src/types.ts` entfernt bzw. gegen `simulation/state.ts` abgegrenzt.
- [x] `genome.ts` verwendet `core/rng.ts`; eine einzige `createBaseVariants()`-Quelle bleibt bestehen.
- [x] Welt-/Grid-Konstanten aus `src/config.ts` entfernt; Content-Quelle bleibt in `config/world.source.ts`.
- [x] Persistenz auf `persistence/storage.ts` als Storage-Owner ausgerichtet.
- [x] `MetaSave` enthält die autoritative Run-Identität und die Loadout-/Zuchtfelder.
- [x] `App.tsx` verwendet `MetaSave.runId` beim Run-Start statt eines React-Session-Schlüssels.
- [x] `RootInit` erhält `runId`, `loadout` und die zugehörigen Bred-Stats aus dem Startkontext.
- [x] `GameView` erzeugt keinen zweiten Run-Zähler und keine zweite Run-Identität.
- [x] Release-HUD von Seed, Hash, Tick, Event-/Partikelzählern, Phase-Label, FX- und Debug-Schaltern trennen; DevGate bleibt als eigener späterer UI-Schritt dokumentiert.
- [ ] Tote Imports/Funktionen und verbliebene Legacy-Symbole entfernen.

**Gate A:** `bun tsc -b --noEmit` und `bun vitest run` grün; keine Legacy-Symbole außerhalb von Dokumentation/Tests; Run-ID-Weitergabe ist durch einen Test abgesichert.

**Gate-A-Status:** Teil-Gate grün. Die Run-ID-/Loadout-Weitergabe ist in `src/simulation/sim.test.ts` abgesichert; Typecheck und Tests laufen erfolgreich. Der vollständige Legacy-/Dead-Code-Audit und ein separates DevGate bleiben offen.

### Phase B — Simulation und Core-Gates vervollständigen

- [x] Pierce und Combo-Multiplikator an datengetriebene Effekt-/Score-Pipelines anschließen.
- [x] Wave-Reward als `REWARD_GRANTED` statt falscher Score-Änderung behandeln.
- [x] `DAY_STARTED`/`NIGHT_STARTED` an Clock-Phasenwechsel veröffentlichen.
- [x] Grundlegende Crit-/Status-/Chain-Pipeline im Simulationskern verdrahten.
- [ ] Integrationstests für Effektkette, Combo × Score, Reward, Day/Night und Game Over ergänzen.
- [ ] Resume-Shape und Meta-Migration test-locken.

**Gate B:** deterministische Wiederholung liefert denselben State-Hash; FX an/aus verändert den Gameplay-State nicht; neue Core-Tests grün.

### Phase C — Grafische Identität und Feedback

- [ ] `genomeToVisualInput()` als einzige Genome→Visual-Eingabe ergänzen.
- [ ] Bred Plants mit deterministischem `ResolvedVisual` rendern; visuelle Identität test-locken.
- [ ] Renderer in die vereinbarten Layer aufteilen, falls der LOC-Cap erreicht wird.
- [ ] Terrain, Pflanzen, Gegner und Projektile nach B0/B4/B10 als Paper-World statt Platzhalter zeichnen.
- [ ] Alle Observer-Kommandos ausführen: Floating Numbers, Punch, Flash, Manga, Animation, Partikel und Reward Flight.
- [ ] Kamera-Shake tatsächlich in die Render-Transformation übernehmen.
- [ ] Audio als reinen Event-Observer fertigstellen.

**Gate C:** alle sieben visuellen Command-Typen haben einen Executor; bred/base visuals sind deterministisch verschieden; Renderer bleibt gameplay-schreibfrei.

### Phase D — Mobile UX und Performance

- [ ] 390×844 als primäres Portrait-Layout komponieren.
- [ ] Platzierung auf den Pointer-Workflow `idle → selected → ghost → placed/rejected` umstellen.
- [ ] Hover-Abhängigkeiten entfernen; Touch-Ziele und Cancel/Pause vergrößern.
- [ ] `visibilitychange` mit Pause, Save und Resume-Overlay gemäß Vertrag umsetzen.
- [ ] DPR-/Particle-/FX-Degradationsreihenfolge hinterlegen und im DevGate messbar machen.
- [ ] Mobile-Renderziel mit mindestens 30 Entities prüfen.

**Gate D:** Touch-Placement funktioniert ohne Maus-Hover; Suspend/Resume verliert keinen vertraglich gespeicherten Run-State; 390×844 bleibt bedienbar.

### Phase E — Multiplayer-nahtfähige Runtime ohne Netzwerk

- [ ] Versioniertes `CommandTransport`-Interface definieren.
- [ ] Lokalen Transport als Standardadapter auf die bestehende `CommandQueue` setzen.
- [ ] Remote-/Snapshot-Adapter nur als typisierte Mock-Grenze ergänzen.
- [ ] Deterministische IDs um Run-/Match-Kontext und Sequenz vorbereiten, ohne UUID-/Zufallszustand einzuführen.
- [ ] Snapshot-Serialisierung, Event-Stream-Version und State-Hash als öffentliche Runtime-Verträge prüfen.

**Gate E:** `SimulationRoot` kennt keinen Transport und kein Netzwerk; lokale Commands und Mock-Remote-Commands erreichen denselben Queue-Eingang.

### Phase F — Multiplayer-Backend (bewusst zurückgestellt)

Erst nach Gate E und stabiler Mobile-Version: Convex-Schema, Match-/Actor-Identität, Command-Sortierung nach Tick, Snapshot-/Hash-Abgleich und Reconciliation. Kein Backend-Code wird in Phase A–E vorgezogen.

## Arbeitsrhythmus

1. Einen Phasenabschnitt auswählen.
2. Vor dem Schreiben die 8-Fragen-Sperre aus dem Architekturvertrag prüfen.
3. Kleinste zusammenhängende Änderung implementieren.
4. Relevante Tests und `bun tsc -b --noEmit` ausführen.
5. Erst bei grünem Gate den nächsten Abschnitt beginnen.
6. Dieses Dokument nach jedem abgeschlossenen Abschnitt aktualisieren.

## Aktueller Arbeitsstand

Die Bestandsaufnahme zeigt, dass mehrere Phase-A/B-Reparaturen bereits im Quellstand vorhanden sind. Der erste aktive Abschnitt ist umgesetzt: `MetaSave.runId` wird beim Run-Start reserviert, deterministisch als Seed-Komponente verwendet und zusammen mit Loadout/Bred-Stats an `SimulationRoot` gereicht. Das Release-HUD enthält keine Seed-/Hash-/Tick-/Event-/Partikel-/Phase-Debugwerte und keine FX-/Debug-Schalter mehr. Typecheck und die vollständige Suite sind grün (65 Tests); das neue RootInit-Gate deckt die Identitätsweitergabe ab.

Als nächster aktiver Abschnitt folgt der vollständige Legacy-/Dead-Code-Audit. Danach wird das DevGate als eigene Präsentationsgrenze umgesetzt; Pointer-Placement, Resume und der große Visual-Pass bleiben getrennte Gates.
