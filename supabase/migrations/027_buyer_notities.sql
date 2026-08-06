-- Interne notities per koper/handelaar
alter table public.buyers
  add column if not exists notities text;

comment on column public.buyers.notities is
  'Interne notities bij deze koper — alleen voor CRM';
