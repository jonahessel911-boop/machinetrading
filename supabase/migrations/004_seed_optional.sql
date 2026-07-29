-- =============================================================================
-- Optioneel: seed voorbeeld-handelaar
-- =============================================================================

insert into public.buyers (naam, email, telefoon, bedrijf)
values
  ('Piet de Vries', 'piet@voorbeeldhandel.nl', '0201234567', 'Voorbeeld Heftruck Handel BV')
on conflict do nothing;
