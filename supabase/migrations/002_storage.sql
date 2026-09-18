-- Supabase Storage metadata. Public reads only; mutations require backend service role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('award-media','award-media',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do nothing;
