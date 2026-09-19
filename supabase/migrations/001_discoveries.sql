-- Supabase: append-only Discovery-Chain (Blockchain-lite ohne Blockchain)
-- Deterministischer RNG ist der Beweis — kein Mining, kein Token.
-- Lokal-first: tryAppend + UNIQUE(genome_hash). Diese Migration spiegelt
-- die Kette nur öffentlich lesbar; INSERT schlägt bei Duplikat fehl.
--
-- SICHERHEITS-STAND (vor Aktivierung geprüft):
--   · INSERT nur für authentifizierte Rollen (`to authenticated`) — vorher stand die Policy
--     zwar unter dem Namen „authenticated insert", aber OHNE `to authenticated`: damit durfte
--     jede Rolle mit dem Anon-Key einfügen.
--   · Format-Constraints prüfen die Feldform (entry_hash/prev_hash als 8-Hex, player_id-Muster,
--     genau zwei Eltern, nicht-negative Zahlen, plant_hmac-Muster) — der Hash wird damit nicht
--     NEU GERECHNET. ACHTUNG (offene Lücke, bewusst nicht weggeredet): `plant_hmac` ist heute
--     eine CLIENT-seitige FNV-Mischung, die nur eine öffentliche Epoche-0-Wurzel kennt. Er
--     trennt die zwei Wahrheiten, ist aber KEIN Server-Beweis — die Server-Verifikation gegen
--     einen geheimen Account-Root gehört zu P3/P4 (plan-discovery-chain.md), VOR dem
--     Aktivieren dieses Spiegels.
--   · RESTRISIKO (bewusst dokumentiert, nicht weggeredet): UNIQUE(genome_hash) plus
--     „erste Entdeckung gewinnt" erlaubt Hash-Squatting — wer zuerst einen fremden
--     genome_hash schreibt, blockiert die echte Entdeckung. Solange kein Server die Kette
--     nachrechnet (`entry_hash`), ist die Chain ein Anzeige-Spiegel, kein Beweis.
--     Vor dem Aktivieren gegen Fremd-Schreibzugriffe: entweder Signatur/Recompute am Edge
--     oder eine moderierte Sync-Stufe. `src/discovery/chain.ts` ist bis dahin ein Stub.

create table if not exists public.discoveries (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  genome_hash text not null unique,          -- erste Entdeckung gewinnt (siehe Squatting-Hinweis)
  parents jsonb not null,
  -- P2' (plan-discovery-chain.md §1.2): NEUE Einträge tragen den ÖFFENTLICHEN Beleg
  -- `plant_hmac` und KEINEN Klartext-Seed — der private Zucht-Seed bleibt beim Client.
  -- `seed` bleibt für Gründer-Einträge der Epoche 0 (deren Wurzel ist ohnehin öffentlich).
  -- Beide Spalten sind deshalb nullable; genau EINE muss gesetzt sein (Constraint unten).
  plant_hmac text,
  seed bigint,
  generation integer not null,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default now(),
  constraint discoveries_entry_hash_shape check (entry_hash ~ '^[0-9a-f]{8}$'),
  constraint discoveries_prev_hash_shape check (prev_hash is null or prev_hash ~ '^[0-9a-f]{8}$'),
  constraint discoveries_player_shape check (player_id ~ '^player_[0-9a-f]{8}$'),
  constraint discoveries_parents_arity check (jsonb_typeof(parents) = 'array' and jsonb_array_length(parents) = 2),
  -- Eine Wahrheit über die Herkunft: HMAC (neue Einträge) ODER Klartext-Seed (Gründer).
  constraint discoveries_identity_singular check ((plant_hmac is null) <> (seed is null)),
  constraint discoveries_plant_hmac_shape check (plant_hmac is null or plant_hmac ~ '^ph-[0-9a-f]{8}$'),
  constraint discoveries_numbers_nonneg check ((seed is null or seed >= 0) and generation >= 0)
);

create index if not exists discoveries_created_at_idx on public.discoveries (created_at desc);
create index if not exists discoveries_player_idx on public.discoveries (player_id);

-- Public read: kein Login nötig zum Lesen (RLS in 10 Minuten)
alter table public.discoveries enable row level security;

drop policy if exists "public read discoveries" on public.discoveries;
create policy "public read discoveries"
  on public.discoveries for select
  using (true);

-- Schreiben nur für authentifizierte Rollen. `to authenticated` ist der entscheidende Teil:
-- ohne diese Zeile gilt die Policy für ALLE Rollen (auch anon) und der Anon-Key reicht zum
-- Einfügen. Neue Zeilen sind unveränderlich: UPDATE/DELETE bekommt bewusst KEINE Policy.
drop policy if exists "authenticated insert discoveries" on public.discoveries;
create policy "authenticated insert discoveries"
  on public.discoveries for insert
  to authenticated
  with check (true);

-- Anon-Inserts sind NICHT vorgesehen (lokal-first heißt: die Kette bleibt lokal, bis eine
-- geprüfte Sync-Stufe existiert). Falls sie je gewünscht sind, gehört dazu zwingend eine
-- serverseitige Prüfung von entry_hash — sonst ist „erste Entdeckung gewinnt" nur eine
-- Behauptung des Absenders.
