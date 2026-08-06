-- Hernoem "In bemiddeling" → "Koper zoeken"
-- Eerst constraint loslaten, anders faalt de update op leads_status_check
alter table public.leads drop constraint if exists leads_status_check;

update public.leads
set status = 'koper_zoeken'
where status = 'in_bemiddeling';

alter table public.leads
  add constraint leads_status_check check (
    status in (
      'nieuw',
      'terugbellen',
      'afwachten_fotos',
      'koper_zoeken',
      'bod_doorgegeven',
      'deal',
      'geen_interesse',
      'onrealistische_prijs',
      'geen_contact',
      'verkeerd_telefoonnummer',
      'contact_1','contact_2','contact_3','contact_4',
      'contact_5','contact_6','contact_7'
    )
  );
