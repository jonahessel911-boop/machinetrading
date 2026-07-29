# Supabase SQL — hoe te runnen

Open je Supabase project → **SQL Editor** → plak en run in deze volgorde:

1. [`001_schema.sql`](./migrations/001_schema.sql) — tabellen: `buyers`, `leads`, `lead_photos`, `contracts`
2. [`002_storage.sql`](./migrations/002_storage.sql) — storage bucket `lead-photos`
3. [`003_rls.sql`](./migrations/003_rls.sql) — Row Level Security
4. [`004_seed_optional.sql`](./migrations/004_seed_optional.sql) — optionele testhandelaar

Daarna in `.env` (lokaal / Vercel):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_USER=admin
ADMIN_PASS=admin123
AUTH_SECRET=change-me
```

De Next.js API's gebruiken `SUPABASE_SERVICE_ROLE_KEY` voor het CRM (lezen/schrijven alles).
Het publieke formulier mag leads + foto's inserten via anon key / server routes.
