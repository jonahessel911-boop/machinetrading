-- Opgeslagen taxaties bij leads (bel-systeem)
create table if not exists public.lead_taxaties (
  id               text primary key default gen_random_uuid()::text,
  lead_id          text not null references public.leads(id) on delete cascade,
  input            jsonb not null default '{}'::jsonb,
  result           jsonb not null,
  verkoop_min      integer,
  verkoop_max      integer,
  inkoop_min       integer,
  inkoop_max       integer,
  conservatief     integer,
  created_at       timestamptz not null default now()
);

create index if not exists lead_taxaties_lead_id_idx
  on public.lead_taxaties (lead_id, created_at desc);

comment on table public.lead_taxaties is
  'Taxatie-assistent resultaten per lead — herladen in bel-systeem';
