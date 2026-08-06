-- Interne notities op leads (alleen CRM-medewerkers)
create table if not exists public.lead_notes (
  id               text primary key default gen_random_uuid()::text,
  lead_id          text not null references public.leads(id) on delete cascade,
  body             text not null,
  author_naam      text not null,
  author_user_id   text,
  created_at       timestamptz not null default now()
);

create index if not exists lead_notes_lead_id_idx
  on public.lead_notes (lead_id, created_at desc);

comment on table public.lead_notes is
  'Interne notities bij een lead — alleen zichtbaar voor CRM-medewerkers';
