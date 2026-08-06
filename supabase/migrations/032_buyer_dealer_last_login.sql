-- Laatste marketplace-login van een dealer/handelaar
alter table public.buyers
  add column if not exists dealer_last_login_at timestamptz;

comment on column public.buyers.dealer_last_login_at is
  'Tijdstip van laatste succesvolle dealer marketplace-login';
