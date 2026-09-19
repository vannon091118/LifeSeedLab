# Contract: Kern & Kontrakte

**Owner (genau einer):** `src/core/*` (rng, hash, clock, ids) · `src/bus/*` · Content-Truth `src/config.ts` + `src/config/*.source.ts`
**Writer:** Content-Werte: `config/*.source.ts` (SOURCE = CONTENT TRUTH). Bus: `bus/events.ts`/`commands.ts`. Identität: `core/ids.ts` (monoton).
**Readers:** Alle Systeme (RNG/Clock/IDs); Geräte & Observer (Bus-Audience).
**LOC-Caps:** 300 (Simulationssysteme, Bus, Clock, RNG, IDs, Hash) · 200 (Types, Config/Source)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Diese Domäne hält die Fundament-Regeln: Typen-Wahrheit, Source-Truth, Event-Audience und den Grundsatz „eine Ableitung je Wahrheit".

---

## A1. `src/types.ts` — WRONG (split)

| Symbol | Class | Verdict |
|---|---|---|
| `GameState`, `Tower`, `Enemy`, `Projectile`, `WaveConfig`, `WorkerInMessage`, `WorkerOutMessage`, `Position` | WRONG | Delete. Old worker-monolith contract. Zero importers (verified). Sim truth lives in `simulation/state.ts` (`SimState`, `PlantEntity`, `EnemyEntity`, `ProjectileEntity`). Keeping both = "fixes on device A break resume on device B". |
| `Gene`, `Genome`, `PlantType`, `PlantVariant`, `CrossResult`, `RunEconomy`, `MetaSave`, `GameMode`, `RunStartConfig` | KEEP | Move to a future meta types module (breeding/meta; Ziel offen — noch kein Pfad festgelegt) and delete the entity/wave/worker sections. |
| `DebugPanel.tsx` imports `GameState` | WRONG | Component is dead (mounted nowhere) → delete file; rebuilt later under DevGate with `SimState`. |

## A3. `src/config.ts` — WRONG (duplicate source)

- `GRID_COLS/ROWS/CELL_SIZE` duplicated from `config/world.source.ts` (violates SOURCE = CONTENT TRUTH).
- REPAIR: `config.ts` shrinks to `GAME_SEED` + `RUN_ID_SOURCE` only; world constants live once in `world.source.ts`.

## A12. World source — KEEP + prune

- KEEP `ENEMY_PATH`, placement margin, helpers.
- Prune dangling constants (`WAVES_PER_NIGHT`, `PLANTS_PER_CELL`, `SPAWN_QUEUE_SHUFFLE`, `CELL_SIZE` duplicate) or wire them into the systems that should consume them (`WAVES_PER_NIGHT` → wave/night coupling in Phase D).

## B29. Events ohne Konsumenten — entschieden, nicht vergessen (Befund: Event → Observer)

### B29.1 Befund

Fünf Events wurden von der Sim emittiert und von **exakt niemandem** gelesen: kein FX, kein Ton,
kein Text. `FERTILIZE_REJECTED`, `PROPAGATE_REJECTED`, `TILE_REJECTED`, `BEETLE_REJECTED`,
`COINS_GRANTED`. Der schärfste Fall war `TILE_REJECTED`: `placementController` lehnt Tiles
**absichtlich** nicht lokal ab („das Map-Regelwerk ist reicher als eine Zellenprüfung") und schickt
den Command in die Sim — die Ablehnung kam dort auch an, nur nie beim Spieler. Er zahlte Energie,
tippte auf einen Findling im Korridor und es passierte sichtbar nichts. Dazu ein Nebenbefund, den
die Registry erst sichtbar machte: `RUN_STARTED` hatte **weder Produzenten noch Konsumenten**.

Ursache war nicht Vergessen, sondern **Struktur**: die Subscription-Liste stand handgepflegt in
`render/gameRuntime.ts`. Was dort fehlte, fehlte lautlos — es gab keinen Ort, an dem „wer hört zu?“
eine Entscheidung war. Das ist die eigentliche Reparatur dieses Sprints.

### B29.2 Die Entscheidungen (je Event eine, mit Begründung)

| Event | Entscheidung | Grund |
|---|---|---|
| `TILE_REJECTED` | **bleibt** → FX + Text | Die UI delegiert bewusst an die Sim; alle 7 Gründe erreichen den Spieler |
| `BEETLE_REJECTED` | **bleibt** → Text (kein Welt-FX) | Ursache ist HUD-Wissen (kein Tier/belegt/Energie); ein Puls am Pfadkopf würde eine Weltursache suggerieren, die es nicht gibt |
| `FERTILIZE_REJECTED` | **bleibt** → FX + Text | Spieler-ausgelöste Aktion an einer Entity; der Command-Pfad existiert in der Sim (Knopf noch offen) |
| `PROPAGATE_REJECTED` | **bleibt** → FX + Text | wie FERTILIZE (Zustand reif/frei/Nicht-Weg liegt in der Sim) |
| `COINS_GRANTED` | **gestrichen** | Kein Positionsfeld (kein Welt-FX möglich), Stand ist Snapshot, und der Kontostand hat **keine Senke und keine Anzeige**. Nachtrag 19.09.2026: das Feld heißt jetzt `resources.experience` — nach dem Ende des In-Run-Shops war „Münzen" eine zweite Geld-Wahrheit neben Nektar. Erfahrung ist bewusst keine Währung und wird nie ausgegeben. Ein Event kehrt erst mit einem echten Consumer zurück |
| `RUN_STARTED` | **gestrichen** | Weder Produzent noch Konsument; die Information ist „React hat GameView gemountet“ plus der Seed im Snapshot |

Ergänzend beschlossen (gleiche Klasse, ausdrücklich statt zufällig): `PLANT_REMOVED`,
`TILE_PLACED`, `ROUTE_CHANGED`, `MAP_EXPANDED` sind `snapshot` (Renderer/HUD lesen den State),
`SCORE_CHANGED`/`COMBO_CHANGED` ebenso, `PLANT_ATTACKED` ist `internal` (Duplikat direkt neben
`PROJECTILE_FIRED`) — mit ausformulierter Begründung und offenen Politur-Hinweisen in
`bus/eventAudience.ts`.

### B29.3 Spec

1. **Ein Ort für „wer hört zu“:** `src/bus/eventAudience.ts` ordnet **jedem** `EventType` eine
   Audience zu (`fx` = VisualObserver erzeugt Kommandos, `notice` = erreicht den Spieler als Text,
   `snapshot`/`internal` = bewusst kein Consumer) plus einer Begründung.
2. **Die Runtime leitet ihre Subscriptions daraus ab** (`FX_EVENT_TYPES`, `OBSERVED_EVENT_TYPES`,
   `NOTICE_EVENT_TYPES`) — keine handgepflegte Liste mehr. Der Ton hört auf `OBSERVED_EVENT_TYPES`;
   welche Töne existieren, bleibt im `AudioObserver` (sonst zwei Wahrheiten).
3. **Ablehnungs-Vokabular einmal typisiert** (`PlacementRejectReason`/`PlantRejectReason`/
   `TileRejectReason`/`BeetleRejectReason`/`RejectReason` in `bus/events.ts`). Der Feld-Toast bildet
   `RejectReason` **erschöpfend** auf i18n-Schlüssel ab: ein neuer Grund ohne Text ist ein
   Compile-Fehler, kein stiller Fallback auf „Hier lässt sich gerade nichts setzen.“
4. **Ein Schreiber für die Meldung:** `components/fieldNotice.ts` (Event → Meldung) speist genau
   einen Zustand in `GameView`; die UI-Vorprüfung läuft über denselben Kanal der Runtime. Vorher
   hing der Toast am Controller-Zustand, während Sim-Gründe gar keinen Weg hatten.
5. **Die FX müssen auch zeichnen:** `PlayAnimation 'recoil'` war im VisualCommand-Vertrag
   deklariert, aber im Renderer nie umgesetzt — eine Ablehnungs-Animation wäre erneut stumm
   geblieben. `recoil` ist deshalb implementiert (drei Schläge seitwärts an der Entity).
6. **`no_energy` gilt für Pflanze und Feld:** der zweite UI-Grund `no_energy_tile` (eigener Text)
   ist gestrichen — der rote Puls sagt, wo es klemmt, und „Zu wenig Energie.“ stimmt in beiden Fällen.

### B29.4 Gate-Tests

`src/bus/bus_audience.test.ts` und `src/simulation/simulation_beetle_fire_pair.test.ts`:

1. **Erschöpfung:** Muster-Payload für **jeden** `EventType` (per Typ erzwungen) + Registry-Eintrag
   mit nicht-leerer Audience und Begründung; Registry nicht größer als der Kontrakt.
2. **FX behavioral:** jede `fx`-Zeile erzeugt im Observer wirklich ≥ 1 Kommando — und bei FX OFF 0.
3. **Gründe zweisprachig:** für jeden Grund der fünf Notice-Events existiert der Text in DE **und** EN
   (typgeprüfte Liste, inkl. aller sieben `TILE_REJECTED`-Gründe).
4. **End-to-End am echten Run:** `spawn_corridor`/`max_count` (Tiles), `max_reached` (Dünger),
   `not_mature` (Vermehrung), `no_energy` (Brutling) — jeweils bis zum ausgelieferten Text.

### B29.5 DoD für B29

- [x] Jedes Event hat eine Einordnung mit Begründung; die Registry ist die einzige Subscriptions-Quelle
- [x] TILE/BEETLE/FERTILIZE/PROPAGATE_REJECTED erreichen den Spieler (FX und/oder Text)
- [x] Reason-Vokabular einmal typisiert; Toast-Mapping erschöpfend (Compile-Sperre)
- [x] `recoil` gezeichnet (FX-Kommando ohne Renderer wäre eine neue stille Zeile)
- [x] COINS_GRANTED und RUN_STARTED gestrichen, mit Rückkehr-Bedingung dokumentiert
- [x] Gate-Tests grün, tsc clean, `vite build` grün, E2E grün
- [ ] Offen (eigene Politur, nicht Teil von B29): `PLANT_REMOVED` (Rückerstattung als Zahl, braucht
      Position im Payload), `TILE_PLACED` (der Bau hat keinen Moment), `PLANT_ATTACKED` (Duplikat
      prüfen), `grow`/`death`-Animationen (emittiert, im Renderer ohne Wirkung)

---
