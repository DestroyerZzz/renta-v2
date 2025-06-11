-- STORAGE BUCKETS DEFINITION FILE
-- This file contains all storage bucket configurations for the Open Mind application

-- Create all storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('product_images', 'product_images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT DO NOTHING;

-- AVATARS BUCKET POLICIES
-- Policies for the avatars bucket
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- PRODUCT IMAGES BUCKET POLICIES
-- Policies for the product_images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product_images');

CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product_images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product_images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product_images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- COVER IMAGES BUCKET POLICIES
-- Policies for cover images bucket
CREATE POLICY "Cover images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

CREATE POLICY "User can upload their own cover images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "User can update their own cover images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "User can delete their own cover images" 
ON storage.objects FOR DELETE
USING (
  bucket_id = 'covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- POST IMAGES BUCKET POLICIES
-- Policies for post images bucket
CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
