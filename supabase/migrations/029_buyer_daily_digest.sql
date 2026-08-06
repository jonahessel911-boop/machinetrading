-- Opt-in: koper ontvangt dagelijks "Aanbod van de dag" als er nieuwe marketplace-listings zijn
alter table public.buyers
  add column if not exists daily_digest boolean not null default false;

comment on column public.buyers.daily_digest is
  'True = ontvangt dagelijkse e-mail met nieuwe marketplace-heftrucks (alleen als er ≥1 is)';

create index if not exists buyers_daily_digest_idx
  on public.buyers (daily_digest)
  where daily_digest = true;
