-- Verkoopmedewerker die de deal heeft afgerond
alter table public.leads
  add column if not exists verkoopmedewerker text;

comment on column public.leads.verkoopmedewerker is 'Naam van de verkoopmedewerker die de deal heeft gedaan';
