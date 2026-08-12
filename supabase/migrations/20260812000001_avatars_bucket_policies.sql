-- The `avatars` storage bucket was created manually in the Supabase dashboard
-- and had no tracked migration. It only had INSERT/SELECT policies, so
-- re-uploading a photo to the same path (upsert -> UPDATE on storage.objects)
-- was rejected by RLS. This adds the missing UPDATE policy and brings the
-- bucket's policies under version control.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "upload avatar files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

create policy "read avatar files"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

create policy "update avatar files"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars')
  with check (bucket_id = 'avatars');

create policy "delete avatar files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars');
