-- Admin / sales users (volledige CRM-toegang)
create table if not exists public.admin_users (
  id             text primary key default gen_random_uuid()::text,
  naam           text not null,
  email          text not null,
  private_email  text,
  password_hash  text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint admin_users_email_unique unique (email)
);

create index if not exists admin_users_email_idx
  on public.admin_users (lower(email));

comment on table public.admin_users is
  'CRM-gebruikers (admin / sales) met volledige toegang';
comment on column public.admin_users.email is
  'Login e-mail — moet @heftruckverkocht.nl zijn';
comment on column public.admin_users.private_email is
  'Privé e-mail — alleen voor ontvangst van wachtwoord / gegevens';
