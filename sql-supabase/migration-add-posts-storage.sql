-- Create a bucket for post images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for the posts bucket
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'posts' );

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE TO authenticated
USING ( 
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE TO authenticated
USING ( 
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);