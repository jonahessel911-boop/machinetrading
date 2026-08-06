-- Volgorde van lead-foto's (admin sleep → selectie / marketplace)
alter table public.lead_photos
  add column if not exists sort_order integer not null default 0;

-- Bestaande foto's: volgorde = uploadvolgorde (created_at)
with ranked as (
  select
    id,
    (row_number() over (partition by lead_id order by created_at asc) - 1)::integer as rn
  from public.lead_photos
)
update public.lead_photos p
set sort_order = ranked.rn
from ranked
where p.id = ranked.id;

create index if not exists lead_photos_lead_sort_idx
  on public.lead_photos (lead_id, sort_order);

comment on column public.lead_photos.sort_order is
  'Weergavevolgorde (0 = eerst) in admin, selectie en marketplace';
