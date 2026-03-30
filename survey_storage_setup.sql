-- Initialize the new public storage bucket for site survey photos
insert into storage.buckets (id, name, public)
values ('surveys', 'surveys', true)
on conflict (id) do nothing;

-- Create policy to allow public viewing of the survey images
create policy "Allow public viewing of survey images"
on storage.objects for select
to public
using ( bucket_id = 'surveys' );

-- Create policy to allow uploading of survey images
create policy "Allow uploading of survey images"
on storage.objects for insert
to public
with check ( bucket_id = 'surveys' );

-- Create policy to allow updating of survey images
create policy "Allow updating of survey images"
on storage.objects for update
to public
using ( bucket_id = 'surveys' );

-- Create policy to allow deleting of survey images
create policy "Allow deleting of survey images"
on storage.objects for delete
to public
using ( bucket_id = 'surveys' );
