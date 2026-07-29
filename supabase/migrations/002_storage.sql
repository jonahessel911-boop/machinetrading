-- =============================================================================
-- Storage bucket voor lead-foto's
-- Run na 001_schema.sql in Supabase SQL Editor
-- =============================================================================

-- Bucket aanmaken (publiek leesbaar zodat CRM/img tags werken via public URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lead-photos',
  'lead-photos',
  true,
  8388608, -- 8MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Policies: anon mag uploaden onder leads/<lead_id>/...
-- (admin APIs gebruiken service_role en bypassen RLS)

drop policy if exists "Public read lead photos" on storage.objects;
create policy "Public read lead photos"
  on storage.objects for select
  to public
  using (bucket_id = 'lead-photos');

drop policy if exists "Anon upload lead photos" on storage.objects;
create policy "Anon upload lead photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'lead-photos'
    and (storage.foldername(name))[1] = 'leads'
  );

drop policy if exists "Anon update own lead photos" on storage.objects;
create policy "Anon update own lead photos"
  on storage.objects for update
  to anon, authenticated
  using (bucket_id = 'lead-photos')
  with check (bucket_id = 'lead-photos');

drop policy if exists "Service role full lead photos" on storage.objects;
-- service_role bypasses RLS; no extra policy needed
