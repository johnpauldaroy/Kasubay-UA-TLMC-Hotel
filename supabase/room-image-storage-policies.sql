-- Room image storage setup
-- Run this in the Supabase SQL Editor or with:
-- supabase db query --linked --file supabase/room-image-storage-policies.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-images',
  'room-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "room_images_public_read" on storage.objects;
drop policy if exists "room_images_admin_insert" on storage.objects;
drop policy if exists "room_images_admin_update" on storage.objects;
drop policy if exists "room_images_admin_delete" on storage.objects;

create policy "room_images_public_read"
on storage.objects for select
using (bucket_id = 'room-images');

create policy "room_images_admin_insert"
on storage.objects for insert
with check (bucket_id = 'room-images' and auth.role() = 'authenticated');

create policy "room_images_admin_update"
on storage.objects for update
using (bucket_id = 'room-images' and auth.role() = 'authenticated')
with check (bucket_id = 'room-images' and auth.role() = 'authenticated');

create policy "room_images_admin_delete"
on storage.objects for delete
using (bucket_id = 'room-images' and auth.role() = 'authenticated');
