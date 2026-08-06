-- Log van contactpogingen (datum/tijd) voor klantportaal
alter table public.leads
  add column if not exists contact_attempt_times timestamptz[] not null default '{}';

comment on column public.leads.contact_attempt_times is 'Timestamps van contactpogingen (zichtbaar in klantportaal)';
