-- Add cover_image_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Make sure storage permissions are set up for cover images bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for cover images (similar to avatars)
CREATE POLICY "User can upload their own cover images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "User can update their own cover images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "User can delete their own cover images" 
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'covers');


-- ---------------------------------------------------------------------- Fix Storage Policy
-- Fix for the covers bucket - make it public and ensure proper RLS policies
UPDATE storage.buckets SET public = true WHERE id = 'covers';

-- First drop any existing policies that might conflict
DROP POLICY IF EXISTS "User can upload their own cover images" ON storage.objects;
DROP POLICY IF EXISTS "User can update their own cover images" ON storage.objects;
DROP POLICY IF EXISTS "User can delete their own cover images" ON storage.objects;
DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;

-- Re-create with proper formatting and permissions
CREATE POLICY "User can upload their own cover images"
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User can update their own cover images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "User can delete their own cover images" 
ON storage.objects FOR DELETE
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');