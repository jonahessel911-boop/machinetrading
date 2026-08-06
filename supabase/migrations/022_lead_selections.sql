-- Selecties van meerdere heftrucks om naar een handelaar te sturen
create table if not exists public.lead_selections (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null,
  naam        text not null,
  lead_ids    text[] not null,
  created_at  timestamptz not null default now(),
  constraint lead_selections_slug_unique unique (slug)
);

create index if not exists lead_selections_slug_idx
  on public.lead_selections (slug);

create index if not exists lead_selections_created_at_idx
  on public.lead_selections (created_at desc);

comment on table public.lead_selections is
  'Selectie van heftrucks met unieke deel-link /selectie/{slug}';
comment on column public.lead_selections.naam is
  'Naam van de selectie (zichtbaar op de deelpagina)';
comment on column public.lead_selections.lead_ids is
  'Lead-IDs in volgorde van de selectie';
