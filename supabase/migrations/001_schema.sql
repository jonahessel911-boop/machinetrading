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
