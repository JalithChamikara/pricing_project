-- Run this in Supabase: SQL Editor > New query > paste > Run

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  district text not null,
  property_type text not null,
  rooms integer not null,
  amenities text[] default '{}'::text[],
  base_rate numeric not null check (base_rate > 0),
  created_at timestamptz not null default now()
);

-- Safe migration for existing databases (adds amenities without deleting or altering existing records):
alter table public.properties add column if not exists amenities text[] default '{}'::text[];

create table if not exists public.price_recommendations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  stay_date date not null,
  predicted_occupancy numeric,
  recommended_price numeric not null,
  competitor_price numeric,
  explanation text,
  created_at timestamptz not null default now()
);

-- Each owner can see and change only their own data
alter table public.properties enable row level security;
alter table public.price_recommendations enable row level security;

create policy "owners manage own properties" on public.properties
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owners manage own recommendations" on public.price_recommendations
  for all using (exists (select 1 from public.properties p
                         where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p
                      where p.id = property_id and p.user_id = auth.uid()));
