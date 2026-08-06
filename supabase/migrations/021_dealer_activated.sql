-- Eerste marketplace-login van een dealer
alter table public.buyers
  add column if not exists dealer_activated_at timestamptz;

comment on column public.buyers.dealer_activated_at is
  'Eerste succesvolle marketplace-login; null = nog niet geactiveerd';
