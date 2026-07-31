-- Meta click attribution van de oorspronkelijke bezoeker (voor Lead + later Deal CAPI)
alter table public.leads
  add column if not exists meta_fbp text,
  add column if not exists meta_fbc text,
  add column if not exists meta_fbclid text;

comment on column public.leads.meta_fbp is 'Meta browser ID (_fbp) van de lead bij aanmelden';
comment on column public.leads.meta_fbc is 'Meta click ID (_fbc) van de lead bij aanmelden';
comment on column public.leads.meta_fbclid is 'Ruwe fbclid van de ad-klik bij aanmelden';
