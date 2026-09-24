# Contract: Persistenz

**Owner (genau einer):** `src/persistence/storage.ts` — einziger I/O-Owner (localStorage/IDB)
**Writer:** nur `storage.ts`; Schema-Adapter (`meta/`, `runSave.ts`, `worldSave.ts`) definieren Version + Migration
**Readers:** alle, die laden/speichern — nie direkt `localStorage`
**LOC-Caps:** 250 (storage.ts gemäß Dateiheader) · 200 (Meta/Schema-Adapter)
**Herkunft:** herausgelöst aus dem Register `docs/quality/quality-spec.md` (Domänen-Split 19.09.2026).
Die **IDs (A…/B…) sind unverändert** — sie bleiben die stabile Referenz aus Code, Tests und
Commit-Historie. Dieses Dokument ist die Arbeitsliste dieser Domäne: Befund → Spezifikation → DoD.

> Verträge: FNV-Checksumme **kanonisch** (stabile Key-Sortierung), Quarantäne statt stillem Verwerfen, Downgrade-Schutz, Resume-Form ohne Feinde/Projektile.

---

## A8. `src/persistence/*` — INCOMPLETE

- `meta.ts`: raw localStorage, version field hardcoded, no migration chain, no checksum, no corruption quarantine.
- `runSave.ts`: saves live enemies/projectiles (fine for forensic debugging, wrong for resume), no checksum, resume never invoked.
- REPAIR: one `persistence/storage.ts` owner (B2): typed `load/save` + `version` + migration chain + FNV checksum + quarantine-on-corrupt. `meta.ts`/`runSave.ts` become thin schema adapters. Meta adds `runId`, `breedGeneration`, `loadout`.

### A13.5 DEFECT — Checksumme an die JSON-Property-Reihenfolge gekoppelt · **REPARIERT (B14.6)**

`persistence/storage.ts` prüft `fnv1a(JSON.stringify(env.data))`. `JSON.stringify` respektiert die Einfüge-Reihenfolge der Keys; `toV3` (`meta/store.ts`) baut das Objekt aus einem Literal neu mit **anderer** Key-Reihenfolge. Jede spätere Umsortierung von Keys (Refactor, Migration, `{...a, ...b}`-Umbau) quarantäniert **gültige** Saves. Integrität darf den Inhalt meistern, nicht die Darstellung.

### A18.4 DEFECT (behoben) — Persistenz: Downgrade überschrieb still das neuere Save

`env.v > opts.version` kehrte in **beiden** Backends still zum Fallback zurück; das nächste `save()` hätte das neuere Save überschrieben. Jetzt: Quarantäne statt stiller Verwerfen (Rohdaten bleiben unter `<key>.corrupt` erhalten). Dabei gleich zwei Review-Punkte mitgenommen: die Envelope-Validierung existierte doppelt (`load`/`idbGet`, ~15 Zeilen je Stelle) und lebt jetzt einmal in `validateEnvelope`; die Version-Differenz folgt einer Regel in `resolveVersion` (unter uns ⇒ migrieren, über uns ⇒ Quarantäne). `storage.ts` ist dadurch **geschrumpft** (192 → 190 LOC), ohne den Cap anzufassen. Der unbenutzte Grabstein-Export `STORAGE_CHECKSUM_SEP` ist entfernt; der IDB-Name `lifegamelab` ist als bewusstes Legacy dokumentiert (Umbenennung würde Run-Snapshots verwaisen).

## Red-Team-Nachtrag (24.09.2026) — RT-01/RT-04/RT-09/RT-10 BEHOBEN

`loadResult`/`loadWorldResult` trennen `valid`, `missing`, `corrupt` und `failed`; `isValidRunSave` prüft dieselbe Version zur Laufzeit; `WriteResult` reicht `written`, `skipped` oder `failed` an die Aufrufer durch; IDB-Migrationen warten auf den Schreibabschluss. Der Run-Autor serialisiert Save/Clear über `writeChain` und markiert Gameover/Abbruch terminal, damit kein veralteter Snapshot nach dem Löschen zurückkehrt. Belege: `src/persistence/storage.ts`, `worldSave.ts`, `runSave.ts`, `runSaveAutor.ts`, `persistence_resume.test.ts`, Commit `6441333`.

## B2. Persistence contract (new `persistence/storage.ts` ≤ 250 LOC)

- API: `load<T>(key, {version, migrate, fallback})`, `save(key, value)`; FNV-1a checksum suffix; checksum mismatch → quarantine to `key.corrupt` + return `fallback()`.
- Stores: `meta` (localStorage, sync) · `run` (localStorage v2, async-free MVP).
- Run-save v2 shape: `{version, runId, seed, tick, waveNumber, phase:'prep', energy, lives, score, combo, plants[], inventory, nektarEarned}` — **enemies/projectiles/schedule intentionally absent**. Resume: rebuild state, phase = `prep`, schedule regenerates from `(seed, waveNumber+1)`. Documented as the Resume-Vertrag; test-locked.
- `visibilitychange→hidden` ⇒ pause + save; `visible` ⇒ resume overlay (tap to continue).
