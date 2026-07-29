# Supabase SQL — hoe te runnen

Open je Supabase project → **SQL Editor** → plak en run **in deze volgorde**:

## Verplicht

1. [`001_schema.sql`](./migrations/001_schema.sql) — tabellen: `buyers`, `leads`, `lead_photos`, `contracts`
2. [`002_storage.sql`](./migrations/002_storage.sql) — storage bucket `lead-photos`
3. [`003_rls.sql`](./migrations/003_rls.sql) — Row Level Security
4. [`005_deal_fields.sql`](./migrations/005_deal_fields.sql) — deal-velden (netto, deal_datum, verkoopprijs)
5. [`006_marketplace.sql`](./migrations/006_marketplace.sql) — marketplace listings + bids
6. [`007_dealer_accounts.sql`](./migrations/007_dealer_accounts.sql) — dealer-login op buyers
7. [`008_period_costs.sql`](./migrations/008_period_costs.sql) — ad spend / sales cost per dag

## Optioneel

- [`004_seed_optional.sql`](./migrations/004_seed_optional.sql) — leeg (geen voorbeeldddata)

## Of in één keer

[`000_run_all.sql`](./migrations/000_run_all.sql) bevat 001–003 + 005–008 (geen seed).

---

Daarna in `.env` (lokaal / Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_USER=admin
ADMIN_PASS=admin123
AUTH_SECRET=change-me
```

De Next.js API's gebruiken `SUPABASE_SERVICE_ROLE_KEY` voor het CRM.
