-- Supabase: append-only Discovery-Chain (Blockchain-lite ohne Blockchain)
-- Deterministischer RNG ist der Beweis — kein Mining, kein Token.
-- Lokal-first: tryAppend + UNIQUE(genome_hash). Diese Migration spiegelt
-- die Kette nur öffentlich lesbar; INSERT schlägt bei Duplikat fehl.

create table if not exists public.discoveries (
  id uuid primary key default gen_random_uuid(),
  player_id text not null,
  genome_hash text not null unique,          -- erste Entdeckung gewinnt
  parents jsonb not null,
  seed bigint not null,
  generation integer not null,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists discoveries_created_at_idx on public.discoveries (created_at desc);
create index if not exists discoveries_player_idx on public.discoveries (player_id);

-- Public read: kein Login nötig zum Lesen (RLS in 10 Minuten)
alter table public.discoveries enable row level security;

drop policy if exists "public read discoveries" on public.discoveries;
create policy "public read discoveries"
  on public.discoveries for select
  using (true);

drop policy if exists "authenticated insert discoveries" on public.discoveries;
create policy "authenticated insert discoveries"
  on public.discoveries for insert
  with check (true);

-- Optional: anon inserts erlauben wenn lokal-first gewünscht.
-- Dann in Supabase Dashboard → Auth → Allow anon inserts aktivieren
-- und stattdessen:
-- drop policy if exists "anon insert discoveries" on public.discoveries;
-- create policy "anon insert discoveries"
--   on public.discoveries for insert
--   with check (true);
