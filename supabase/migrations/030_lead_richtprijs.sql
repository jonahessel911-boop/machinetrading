-- Richtprijs die de verkoper voor de heftruck wil hebben (form funnel)
alter table public.leads
  add column if not exists richtprijs double precision;

comment on column public.leads.richtprijs is
  'Richtprijs die de verkoper via het formulier heeft opgegeven';
