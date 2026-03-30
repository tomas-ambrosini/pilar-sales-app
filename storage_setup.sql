-- Initialize the new public storage bucket for catalog images
insert into storage.buckets (id, name, public)
values ('catalog-images', 'catalog-images', true)
on conflict (id) do nothing;

-- Create policy to allow public viewing of the images
create policy "Allow public viewing of catalog images"
on storage.objects for select
to public
using ( bucket_id = 'catalog-images' );

-- Create policy to allow uploading of images
create policy "Allow uploading of catalog images"
on storage.objects for insert
to public
with check ( bucket_id = 'catalog-images' );

-- Create policy to allow updating of images
create policy "Allow updating of catalog images"
on storage.objects for update
to public
using ( bucket_id = 'catalog-images' );

-- Create policy to allow deleting of images
create policy "Allow deleting of catalog images"
on storage.objects for delete
to public
using ( bucket_id = 'catalog-images' );
