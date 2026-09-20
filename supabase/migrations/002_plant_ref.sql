-- Supabase-Migration 002: `plant_hmac` → `plant_ref` (Schema v3 im Client).
--
-- WARUM EINE EIGENE MIGRATION stattdessen 001 zu editieren:
-- 001 ist der dokumentierte Stand, mit dem die Kette eingeführt wurde. Eine angewandte
-- Migration nachträglich umzuschreiben macht jede Umgebung, die sie schon gesehen hat,
-- unnachvollziehbar. Also: additive Korrektur, wie in SQL üblich.
--
-- WARUM ÜBERHAUPT (Befund 20.09.2026, adversarialer Review): Das Feld hieß nach einem HMAC,
-- war aber ein schlüsselloser FNV-Mischwert über öffentliche Eingaben plus Seed. Der Kommentar
-- in 001 sagte das ehrlich — der NAME wanderte trotzdem in Schema, Constraint und Client.
-- Ein Name, der eine kryptografische Eigenschaft verspricht, die die Funktion nicht hat, ist
-- eine zweite Wahrheit über dieselbe Sache. `plant_ref` sagt, was es ist.
--
-- Der Wert-Präfix wandert mit: `ph-…` → `pr-…`. Bestandszeilen werden umgeschrieben; ein echtes
-- HMAC kommt mit P3/P4 (Account-Root) und braucht dann ein NEUES Feld, nicht dieses.
--
-- ACHTUNG (Reihenfolge, ehrlich benannt): Diese Migration setzt voraus, dass Clients bereits
-- auf Schema v3 schreiben (Client-Migration: `src/discovery/codex_migration.ts`). Der Spiegel
-- ist laut Plan (`docs/process/plan-discovery-chain.md`) NOCH NICHT AKTIV — die Migration ist
-- der vorbereitete Stand für die Aktivierung, kein angewandter Lauf.

alter table public.discoveries rename column plant_hmac to plant_ref;

-- Constraint-Namen mitwandern lassen: die alten Prüfungen nennen die Spalte im Ausdruck, sie
-- würden beim Rename stehenbleiben und ins Leere zeigen.
alter table public.discoveries
  drop constraint if exists discoveries_identity_singular;
alter table public.discoveries
  add constraint discoveries_identity_singular check ((plant_ref is null) <> (seed is null));

alter table public.discoveries
  drop constraint if exists discoveries_plant_hmac_shape;
alter table public.discoveries
  add constraint discoveries_plant_ref_shape check (plant_ref is null or plant_ref ~ '^pr-[0-9a-f]{8}$');

-- Bestandszeilen im alten Präfix umschreiben, damit die neue Formprüfung hält.
update public.discoveries
  set plant_ref = 'pr-' || substring(plant_ref from 4)
  where plant_ref like 'ph-%';
