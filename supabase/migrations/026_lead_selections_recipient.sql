-- Koppel selecties aan de handelaar/koper die ze ontvangt
alter table public.lead_selections
  add column if not exists buyer_id text references public.buyers(id) on delete set null,
  add column if not exists recipient_email text,
  add column if not exists recipient_naam text;

create index if not exists lead_selections_buyer_id_idx
  on public.lead_selections (buyer_id);

create index if not exists lead_selections_recipient_email_idx
  on public.lead_selections (lower(recipient_email));

comment on column public.lead_selections.buyer_id is
  'Koper/handelaar naar wie de selectie is verstuurd (optioneel)';
comment on column public.lead_selections.recipient_email is
  'E-mailadres waarnaar de selectie is verstuurd';
comment on column public.lead_selections.recipient_naam is
  'Naam/bedrijf in de aanhef van de mail';
