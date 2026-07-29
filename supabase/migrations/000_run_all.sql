-- =============================================================================
-- heftruckverkocht.nl — Supabase schema (run in SQL Editor)
-- Volgorde: 001 → 002 → 003
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Handelaren / kopers (dealers)
-- -----------------------------------------------------------------------------
create table if not exists public.buyers (
  id            text primary key default gen_random_uuid()::text,
  naam          text not null,
  email         text,
  telefoon      text,
  bedrijf       text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists buyers_bedrijf_idx on public.buyers (bedrijf);

-- -----------------------------------------------------------------------------
-- Leads (aanmeldingen)
-- -----------------------------------------------------------------------------
create table if not exists public.leads (
  id                 text primary key default gen_random_uuid()::text,
  merk               text not null,
  model              text,
  timing             text not null,
  naam               text not null,
  email              text not null,
  telefoon           text not null,
  -- Adres
  straat             text,
  huisnummer         text,
  toevoeging         text,
  postcode           text,
  woonplaats         text not null,
  -- CRM
  status             text not null default 'nieuw',
  contact_attempts   integer not null default 0,
  inkoopprijs        double precision,
  marge              double precision,
  buyer_id           text references public.buyers(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint leads_status_check check (
    status in (
      'nieuw',
      'contact_1','contact_2','contact_3','contact_4',
      'contact_5','contact_6','contact_7',
      'geen_contact','deal','geen_interesse','verkeerd_telefoonnummer'
    )
  ),
  constraint leads_contact_attempts_check check (
    contact_attempts >= 0 and contact_attempts <= 7
  )
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_buyer_id_idx on public.leads (buyer_id);
create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_postcode_idx on public.leads (postcode);

-- -----------------------------------------------------------------------------
-- Lead foto's (metadata; bestanden in Storage bucket `lead-photos`)
-- -----------------------------------------------------------------------------
create table if not exists public.lead_photos (
  id             text primary key default gen_random_uuid()::text,
  lead_id        text not null references public.leads(id) on delete cascade,
  filename       text not null,
  original_name  text not null,
  mime_type      text not null,
  size           integer not null default 0,
  url            text not null,
  storage_path   text,
  created_at     timestamptz not null default now()
);

create index if not exists lead_photos_lead_id_idx on public.lead_photos (lead_id);

-- -----------------------------------------------------------------------------
-- Contracten
-- -----------------------------------------------------------------------------
create table if not exists public.contracts (
  id          text primary key default gen_random_uuid()::text,
  lead_id     text not null references public.leads(id) on delete cascade,
  buyer_id    text not null references public.buyers(id) on delete restrict,
  status      text not null default 'concept',
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint contracts_status_check check (
    status in ('concept', 'verstuurd', 'getekend', 'geannuleerd')
  )
);

create index if not exists contracts_lead_id_idx on public.contracts (lead_id);
create index if not exists contracts_buyer_id_idx on public.contracts (buyer_id);

-- -----------------------------------------------------------------------------
-- updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyers_set_updated_at on public.buyers;
create trigger buyers_set_updated_at
  before update on public.buyers
  for each row execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists contracts_set_updated_at on public.contracts;
create trigger contracts_set_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Handige view voor CRM-overzicht
-- -----------------------------------------------------------------------------
create or replace view public.leads_overview as
select
  l.id,
  l.naam,
  l.email,
  l.telefoon,
  l.straat,
  l.huisnummer,
  l.toevoeging,
  l.postcode,
  l.woonplaats,
  l.merk,
  l.model,
  l.timing,
  l.status,
  l.contact_attempts,
  l.inkoopprijs,
  l.marge,
  l.buyer_id,
  b.bedrijf as buyer_bedrijf,
  b.naam as buyer_contact,
  (
    select count(*)::int from public.lead_photos p where p.lead_id = l.id
  ) as photo_count,
  l.created_at,
  l.updated_at
from public.leads l
left join public.buyers b on b.id = l.buyer_id;
-- =============================================================================
-- Storage bucket voor lead-foto's
-- Run na 001_schema.sql in Supabase SQL Editor
-- =============================================================================

-- Bucket aanmaken (publiek leesbaar zodat CRM/img tags werken via public URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos',
  'lead-photos',
  true,
  8388608, -- 8MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: anon mag uploaden onder leads/<lead_id>/...
-- (admin APIs gebruiken service_role en bypassen RLS)

drop policy if exists "Public read lead photos" on storage.objects;
create policy "Public read lead photos"
  on storage.objects for select
  to public
  using (bucket_id = 'lead-photos');

drop policy if exists "Anon upload lead photos" on storage.objects;
create policy "Anon upload lead photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'lead-photos'
    and (storage.foldername(name))[1] = 'leads'
  );

drop policy if exists "Anon update own lead photos" on storage.objects;
create policy "Anon update own lead photos"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'lead-photos')
  with check (bucket_id = 'lead-photos');

drop policy if exists "Service role full lead photos" on storage.objects;
-- service_role bypasses RLS; no extra policy needed
-- =============================================================================
-- Row Level Security
-- Publieke funnel mag leads + foto-metadata inserten.
-- CRM leest/schrijft via SUPABASE_SERVICE_ROLE_KEY (bypasst RLS).
-- =============================================================================

alter table public.buyers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_photos enable row level security;
alter table public.contracts enable row level security;

-- ---- LEADS ----
drop policy if exists "Anon can insert leads" on public.leads;
create policy "Anon can insert leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Optioneel: lead mag eigen record lezen op id (handig voor bevestiging)
drop policy if exists "Anon can select leads by id" on public.leads;
create policy "Anon can select leads by id"
  on public.leads for select
  to anon, authenticated
  using (true);
-- NOTE: voor productie kun je select beperken; service_role blijft alles zien.

-- ---- LEAD PHOTOS ----
drop policy if exists "Anon can insert lead photos" on public.lead_photos;
create policy "Anon can insert lead photos"
  on public.lead_photos for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can select lead photos" on public.lead_photos;
create policy "Anon can select lead photos"
  on public.lead_photos for select
  to anon, authenticated
  using (true);

-- ---- BUYERS / CONTRACTS: geen anon toegang (alleen service_role) ----
-- Geen policies = default deny voor anon/authenticated bij enabled RLS.
-- service_role bypasses RLS volledig.

-- Grants
grant usage on schema public to anon, authenticated, service_role;

grant insert, select on public.leads to anon, authenticated;
grant insert, select on public.lead_photos to anon, authenticated;

grant all on public.leads to service_role;
grant all on public.lead_photos to service_role;
grant all on public.buyers to service_role;
grant all on public.contracts to service_role;

grant select on public.leads_overview to service_role;



-- =============================================================================
-- 005 deal fields + 006 marketplace + 007 dealer + 008 period costs
-- =============================================================================

-- Deal / contract velden op leads
alter table public.leads
  add column if not exists verkoopprijs double precision,
  add column if not exists deal_datum date,
  add column if not exists netto_inkoopprijs double precision;

comment on column public.leads.inkoopprijs is 'Bruto inkoopprijs = bedrag dat de klant ontvangt (enige prijs in contract)';
comment on column public.leads.marge is 'Bemiddelingsmarge';
comment on column public.leads.netto_inkoopprijs is 'Netto = bruto + marge (prijs richting dealer)';
comment on column public.leads.verkoopprijs is 'Optionele markt-/verkoopprijs indicatie';
comment on column public.leads.deal_datum is 'Datum van de deal/overeenkomst';

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

-- Dealer login gekoppeld aan kopers/handelaren
alter table public.buyers
  add column if not exists dealer_username text,
  add column if not exists dealer_password_hash text,
  add column if not exists dealer_enabled boolean not null default false;

create unique index if not exists buyers_dealer_username_uidx
  on public.buyers (dealer_username)
  where dealer_username is not null;

comment on column public.buyers.dealer_username is 'Login voor /dealer/login marketplace';
comment on column public.buyers.dealer_enabled is 'Mag inloggen op marketplace';

-- Dagelijkse kosten voor periode-rapportage
create table if not exists public.period_costs (
  id           text primary key default gen_random_uuid()::text,
  cost_date    date not null unique,
  ad_spend     double precision not null default 0,
  sales_cost   double precision not null default 0,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint period_costs_amounts_check check (ad_spend >= 0 and sales_cost >= 0)
);

create index if not exists period_costs_date_idx on public.period_costs (cost_date desc);

comment on table public.period_costs is 'Ad spend & sales cost per dag voor rapportage';

-- RLS extras for new tables
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_bids enable row level security;
alter table public.marketplace_shares enable row level security;
alter table public.period_costs enable row level security;
grant all on public.marketplace_listings to service_role;
grant all on public.marketplace_bids to service_role;
grant all on public.marketplace_shares to service_role;
grant all on public.period_costs to service_role;


-- =============================================================================
-- 009 dealer invoices
-- =============================================================================

-- =============================================================================
-- 009 — Dealer factuurgegevens + facturen (platform → dealer)
-- Run in Supabase SQL Editor na 001–008
-- =============================================================================

-- Factuurgegevens op koper/dealer (instellingen)
alter table public.buyers
  add column if not exists invoice_bedrijf text,
  add column if not exists invoice_contact text,
  add column if not exists invoice_email text,
  add column if not exists invoice_telefoon text,
  add column if not exists invoice_straat text,
  add column if not exists invoice_huisnummer text,
  add column if not exists invoice_postcode text,
  add column if not exists invoice_woonplaats text,
  add column if not exists invoice_land text default 'Nederland',
  add column if not exists invoice_kvk text,
  add column if not exists invoice_btw text,
  add column if not exists invoice_iban text,
  add column if not exists invoice_bic text;

comment on column public.buyers.invoice_bedrijf is 'Factuurnaam bedrijf (dealer instellingen)';
comment on column public.buyers.invoice_kvk is 'KvK nummer voor facturatie';
comment on column public.buyers.invoice_btw is 'BTW-nummer voor facturatie';
comment on column public.buyers.invoice_iban is 'IBAN voor betalingen';

-- Facturen aangemaakt door platform voor een dealer/koper
create table if not exists public.invoices (
  id              text primary key default gen_random_uuid()::text,
  buyer_id        text not null references public.buyers(id) on delete cascade,
  lead_id         text references public.leads(id) on delete set null,
  invoice_number  text not null,
  status          text not null default 'concept',
  issue_date      date not null default current_date,
  due_date        date,
  description     text,
  amount_ex_btw   double precision not null default 0,
  btw_pct         double precision not null default 21,
  btw_amount      double precision not null default 0,
  amount_inc_btw  double precision not null default 0,
  currency        text not null default 'EUR',
  notes           text,
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint invoices_status_check check (
    status in ('concept', 'verstuurd', 'betaald', 'geannuleerd')
  ),
  constraint invoices_amount_check check (
    amount_ex_btw >= 0 and btw_pct >= 0 and btw_amount >= 0 and amount_inc_btw >= 0
  )
);

create unique index if not exists invoices_number_uidx
  on public.invoices (invoice_number);

create index if not exists invoices_buyer_id_idx
  on public.invoices (buyer_id);

create index if not exists invoices_status_idx
  on public.invoices (status);

create index if not exists invoices_issue_date_idx
  on public.invoices (issue_date desc);

comment on table public.invoices is 'Facturen van platform naar dealer/koper';
comment on column public.invoices.buyer_id is 'Dealer/koper die de factuur ontvangt';

alter table public.invoices enable row level security;

grant all on public.invoices to service_role;


-- 010 lead bedrijfsnaam
-- Optionele bedrijfsnaam verkoper (koopcontract)
alter table public.leads
  add column if not exists bedrijfsnaam text;

comment on column public.leads.bedrijfsnaam is 'Optionele bedrijfsnaam verkoper op koopcontract';
