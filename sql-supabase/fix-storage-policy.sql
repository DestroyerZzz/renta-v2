-- Drop the existing policy that's causing issues
-- DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;

-- Create a new policy with a more reliable path check
CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product_images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Also add a more permissive policy for reading images
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

-- Make sure users can update and delete their own images
CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product_images'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product_images'
  AND split_part(name, '/', 1) = auth.uid()::text
);