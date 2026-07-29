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
