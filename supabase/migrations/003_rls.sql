-- =============================================================================
-- Row Level Security
-- Publieke funnel mag leads + foto-metadata inserten.
-- CRM leest/schrijft via SUPABASE_SERVICE_ROLE_KEY (bypasst RLS).
-- =============================================================================

alter table public.buyers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_photos enable row level security;
alter table public.contracts enable row level security;

-- ---- LEADS ----
drop policy if exists "Anon can insert leads" on public.leads;
create policy "Anon can insert leads"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- Optioneel: lead mag eigen record lezen op id (handig voor bevestiging)
drop policy if exists "Anon can select leads by id" on public.leads;
create policy "Anon can select leads by id"
  on public.leads for select
  to anon, authenticated
  using (true);
-- NOTE: voor productie kun je select beperken; service_role blijft alles zien.

-- ---- LEAD PHOTOS ----
drop policy if exists "Anon can insert lead photos" on public.lead_photos;
create policy "Anon can insert lead photos"
  on public.lead_photos for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Anon can select lead photos" on public.lead_photos;
create policy "Anon can select lead photos"
  on public.lead_photos for select
  to anon, authenticated
  using (true);

-- ---- BUYERS / CONTRACTS: geen anon toegang (alleen service_role) ----
-- Geen policies = default deny voor anon/authenticated bij enabled RLS.
-- service_role bypasses RLS volledig.

-- Grants
grant usage on schema public to anon, authenticated, service_role;

grant insert, select on public.leads to anon, authenticated;
grant insert, select on public.lead_photos to anon, authenticated;

grant all on public.leads to service_role;
grant all on public.lead_photos to service_role;
grant all on public.buyers to service_role;
grant all on public.contracts to service_role;

grant select on public.leads_overview to service_role;
