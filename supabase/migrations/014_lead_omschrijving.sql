-- Omschrijving van de lead (portaal ↔ marketplace)
alter table public.leads
  add column if not exists omschrijving text;

comment on column public.leads.omschrijving is 'Klant-/admin-omschrijving; sync met marketplace listing';
