-- Dagelijkse kosten voor periode-rapportage
create table if not exists public.period_costs (
  id           text primary key default gen_random_uuid()::text,
  cost_date    date not null unique,
  ad_spend     double precision not null default 0,
  sales_cost   double precision not null default 0,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint period_costs_amounts_check check (ad_spend >= 0 and sales_cost >= 0)
);

create index if not exists period_costs_date_idx on public.period_costs (cost_date desc);

comment on table public.period_costs is 'Ad spend & sales cost per dag voor rapportage';
