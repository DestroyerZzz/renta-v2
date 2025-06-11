-- TABLES DEFINITION FILE
-- This file contains all table definitions for the Open Mind application

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  bio TEXT,
  username TEXT UNIQUE,
  updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products/interests table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  description TEXT,
  tag TEXT,
  title TEXT,
  display_section TEXT CHECK (display_section IN ('left', 'right'))
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_url TEXT,
  original_post_id UUID REFERENCES posts(id),
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(follower_id, following_id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL, -- 'follow', 'post', 'interest'
  content TEXT,
  entity_id UUID, -- ID of the post, interest, or follow relationship
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_original_post_id ON posts(original_post_id);
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON follows(following_id);
CREATE INDEX IF NOT EXISTS notifications_receiver_id_idx ON notifications(receiver_id);
CREATE INDEX IF NOT EXISTS notifications_sender_id_idx ON notifications(sender_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON notifications(created_at);

-- Add table comments
COMMENT ON COLUMN posts.original_post_id IS 'Reference to the original post that was shared';
COMMENT ON COLUMN posts.is_shared IS 'Flag indicating if this post is a share of another post';
