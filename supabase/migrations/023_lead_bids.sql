-- Biedingen van handelaren op leads (via selectieportaal)
create table if not exists public.lead_bids (
  id               text primary key default gen_random_uuid()::text,
  lead_id          text not null references public.leads(id) on delete cascade,
  selection_id     text references public.lead_selections(id) on delete set null,
  buyer_id         text references public.buyers(id) on delete set null,
  bidder_naam      text not null,
  bidder_email     text not null,
  bidder_telefoon  text,
  bidder_bedrijf   text,
  bedrag           double precision not null,
  created_at       timestamptz not null default now(),
  constraint lead_bids_bedrag_check check (bedrag > 0)
);

create index if not exists lead_bids_lead_id_idx
  on public.lead_bids (lead_id);

create index if not exists lead_bids_lead_bedrag_idx
  on public.lead_bids (lead_id, bedrag desc);

create index if not exists lead_bids_selection_id_idx
  on public.lead_bids (selection_id);

create index if not exists lead_bids_created_at_idx
  on public.lead_bids (created_at desc);

comment on table public.lead_bids is
  'Biedingen van handelaren op een lead (o.a. via /selectie/{slug})';
