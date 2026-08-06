-- Berichten van admin naar lead (e-mailgeschiedenis)
create table if not exists public.lead_messages (
  id          text primary key default gen_random_uuid()::text,
  lead_id     text not null references public.leads(id) on delete cascade,
  subject     text not null,
  body        text not null,
  to_email    text not null,
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists lead_messages_lead_id_idx
  on public.lead_messages (lead_id, sent_at desc);

comment on table public.lead_messages is
  'Uitgaande e-mails van admin naar lead (Berichten)';
