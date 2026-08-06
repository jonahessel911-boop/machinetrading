-- Privé e-mail voor ontvangst inloggegevens (login blijft email @heftruckverkocht.nl)
alter table public.admin_users
  add column if not exists private_email text;

comment on column public.admin_users.email is
  'Login e-mail — moet @heftruckverkocht.nl zijn';
comment on column public.admin_users.private_email is
  'Privé e-mail — alleen voor ontvangst van wachtwoord / gegevens';
