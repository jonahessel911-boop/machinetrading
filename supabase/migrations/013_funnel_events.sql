-- Funnel step events for Lead CR (site analytics)
create table if not exists public.funnel_events (
  id           text primary key default gen_random_uuid()::text,
  site         text not null default 'heftruckverkocht.nl',
  session_id   text not null,
  step         text not null,
  created_at   timestamptz not null default now(),
  constraint funnel_events_site_session_step_unique unique (site, session_id, step)
);

create index if not exists funnel_events_site_step_idx
  on public.funnel_events (site, step);

create index if not exists funnel_events_created_idx
  on public.funnel_events (created_at desc);

comment on table public.funnel_events is
  'Unieke form-stap per sessie — voor Lead CR / drop-off analytics';
