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
-- Optioneel: seed voorbeeld-handelaar
-- =============================================================================

insert into public.buyers (naam, email, telefoon, bedrijf)
values
  ('Piet de Vries', 'piet@voorbeeldhandel.nl', '0201234567', 'Voorbeeld Heftruck Handel BV')
on conflict do nothing;
