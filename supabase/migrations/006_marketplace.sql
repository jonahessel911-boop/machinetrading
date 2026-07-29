-- Marketplace: veilingen (7 dagen), biedingen, shares naar handelaren
create table if not exists public.marketplace_listings (
  id              text primary key default gen_random_uuid()::text,
  lead_id         text not null references public.leads(id) on delete cascade,
  slug            text not null unique,
  omschrijving    text,
  woonplaats      text not null,
  merk            text not null,
  model           text,
  status          text not null default 'actief',
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint marketplace_listings_status_check check (
    status in ('actief', 'verlopen', 'ingetrokken')
  )
);

create index if not exists marketplace_listings_lead_id_idx
  on public.marketplace_listings (lead_id);
create index if not exists marketplace_listings_status_ends_idx
  on public.marketplace_listings (status, ends_at);
create index if not exists marketplace_listings_slug_idx
  on public.marketplace_listings (slug);

create table if not exists public.marketplace_bids (
  id               text primary key default gen_random_uuid()::text,
  listing_id       text not null references public.marketplace_listings(id) on delete cascade,
  bidder_naam      text not null,
  bidder_email     text not null,
  bidder_telefoon  text,
  bidder_bedrijf   text,
  bedrag           double precision not null,
  created_at       timestamptz not null default now(),
  constraint marketplace_bids_bedrag_check check (bedrag > 0)
);

create index if not exists marketplace_bids_listing_id_idx
  on public.marketplace_bids (listing_id);
create index if not exists marketplace_bids_created_at_idx
  on public.marketplace_bids (created_at desc);

create table if not exists public.marketplace_shares (
  id          text primary key default gen_random_uuid()::text,
  listing_id  text not null references public.marketplace_listings(id) on delete cascade,
  buyer_id    text references public.buyers(id) on delete set null,
  email       text not null,
  sent_at     timestamptz not null default now()
);

create index if not exists marketplace_shares_listing_id_idx
  on public.marketplace_shares (listing_id);

comment on table public.marketplace_listings is 'Heftruck veilingen op het platform (standaard 7 dagen)';
comment on column public.marketplace_listings.slug is 'Unieke publieke link: /marketplace/{slug}';
comment on column public.marketplace_listings.ends_at is 'Na deze tijd status → verlopen (niet meer publiek)';
