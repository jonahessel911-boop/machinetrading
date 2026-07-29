-- Optionele bedrijfsnaam verkoper (koopcontract)
alter table public.leads
  add column if not exists bedrijfsnaam text;

comment on column public.leads.bedrijfsnaam is 'Optionele bedrijfsnaam verkoper op koopcontract';
