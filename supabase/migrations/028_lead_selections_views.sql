-- Wie maakte de selectie + of/wanneer de pagina is geopend
alter table public.lead_selections
  add column if not exists created_by_user_id text references public.admin_users(id) on delete set null,
  add column if not exists created_by_naam text,
  add column if not exists view_count integer not null default 0,
  add column if not exists first_viewed_at timestamptz,
  add column if not exists last_viewed_at timestamptz;

create index if not exists lead_selections_created_by_user_id_idx
  on public.lead_selections (created_by_user_id);

comment on column public.lead_selections.created_by_user_id is
  'Admin-user die de selectie heeft aangemaakt';
comment on column public.lead_selections.created_by_naam is
  'Weergavenaam van de maker (snapshot)';
comment on column public.lead_selections.view_count is
  'Aantal keer dat /selectie/{slug} is geladen (excl. admin)';
comment on column public.lead_selections.first_viewed_at is
  'Eerste pageview door ontvanger';
comment on column public.lead_selections.last_viewed_at is
  'Laatste pageview door ontvanger';
