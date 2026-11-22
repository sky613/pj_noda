-- 사진 버킷. private. 경로: {user_id}/{ritual_id}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ritual-photos', 'ritual-photos', false, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

create policy "ritual-photos: owner insert own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ritual-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ritual-photos: owner read own folder"
  on storage.objects for select to authenticated
  using (bucket_id = 'ritual-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ritual-photos: owner update own folder"
  on storage.objects for update to authenticated
  using (bucket_id = 'ritual-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "ritual-photos: owner delete own folder"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ritual-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
