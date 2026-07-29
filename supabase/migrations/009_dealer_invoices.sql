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
