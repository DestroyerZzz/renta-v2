-- POLICIES AND FUNCTIONS FILE
-- This file contains all Row-Level Security (RLS) policies and database functions

-- ENABLE ROW LEVEL SECURITY
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILE POLICIES
-- Allow public read access to profiles
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Ensure only authenticated users can modify their own profiles
CREATE POLICY "Users can only update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- PRODUCTS POLICIES
-- Allow public read access to products/interests
CREATE POLICY "Public products are viewable by everyone" 
ON products FOR SELECT 
USING (true);

-- Ensure users can only manage their own products/interests
CREATE POLICY "Users can only insert their own products" 
ON products FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own products" 
ON products FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own products" 
ON products FOR DELETE 
USING (auth.uid() = user_id);

-- POSTS POLICIES
-- Allow public viewing of posts
CREATE POLICY "Users can view any post"
ON posts FOR SELECT
USING (true);

-- Users can only manage their own posts
CREATE POLICY "Users can insert their own posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts"
ON posts FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts"
ON posts FOR DELETE
USING (auth.uid() = user_id);

-- FOLLOWS POLICIES
-- Anyone can view follow relationships
CREATE POLICY "Users can view any follow relationship"
ON follows FOR SELECT
USING (true);

-- Users can only follow/unfollow from their own account
CREATE POLICY "Users can follow other users"
ON follows FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON follows FOR DELETE
USING (auth.uid() = follower_id);

-- NOTIFICATIONS POLICIES
-- Users can only view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = receiver_id);

-- Users can only mark their own notifications as read
CREATE POLICY "Users can mark their notifications as read"
ON notifications FOR UPDATE
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

-- Allow triggers to create notifications (needed for automation)
CREATE POLICY "Triggers can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- FUNCTIONS

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to posts
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create profile for new users automatically
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_value TEXT;
  username_value TEXT;
BEGIN
  -- Try different metadata locations (Supabase stores metadata in different places depending on version)
  -- First check raw_user_meta_data (most common in newer versions)
  IF new.raw_user_meta_data IS NOT NULL THEN
    full_name_value := COALESCE(new.raw_user_meta_data->>'full_name', '');
    username_value := COALESCE(new.raw_user_meta_data->>'username', '');
  -- Then check raw_app_meta_data (sometimes used)
  ELSIF new.raw_app_meta_data IS NOT NULL THEN
    full_name_value := COALESCE(new.raw_app_meta_data->>'full_name', '');
    username_value := COALESCE(new.raw_app_meta_data->>'username', '');
  ELSE
    full_name_value := '';
    username_value := '';
  END IF;
  
  -- Insert or update the profile
  INSERT INTO public.profiles (id, full_name, username, updated_at, created_at)
  VALUES (
    new.id,
    full_name_value,
    username_value,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    updated_at = EXCLUDED.updated_at;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_profile_for_user();

-- Username validation function
CREATE OR REPLACE FUNCTION validate_username() 
RETURNS TRIGGER AS $$
BEGIN
  -- Username should be alphanumeric and may include underscores and hyphens
  IF NEW.username !~ '^[a-zA-Z0-9_-]+$' THEN
    RAISE EXCEPTION 'Username can only contain letters, numbers, underscores, and hyphens';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Username validation trigger
CREATE TRIGGER validate_username_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.username IS NOT NULL)
EXECUTE FUNCTION validate_username();

-- Notification creation functions and triggers
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert notification for the followed user
    INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
    VALUES (
        NEW.following_id,
        NEW.follower_id,
        'follow',
        'started following you',
        NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_follow_trigger
AFTER INSERT ON follows
FOR EACH ROW
EXECUTE FUNCTION create_follow_notification();

CREATE OR REPLACE FUNCTION create_post_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_rec RECORD;
BEGIN
    -- For all followers of the post creator, create a notification
    FOR follower_rec IN (
        SELECT follower_id 
        FROM follows 
        WHERE following_id = NEW.user_id
    ) LOOP
        INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
        VALUES (
            follower_rec.follower_id,
            NEW.user_id,
            'post',
            'published a new post',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_create_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION create_post_notification();

CREATE OR REPLACE FUNCTION create_interest_notification()
RETURNS TRIGGER AS $$
DECLARE
    follower_rec RECORD;
BEGIN
    -- For all followers of the interest creator, create a notification
    FOR follower_rec IN (
        SELECT follower_id 
        FROM follows 
        WHERE following_id = NEW.user_id
    ) LOOP
        INSERT INTO notifications (receiver_id, sender_id, type, content, entity_id)
        VALUES (
            follower_rec.follower_id,
            NEW.user_id,
            'interest',
            'added a new interest',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_interest_create_trigger
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION create_interest_notification();

-- Utility functions
CREATE OR REPLACE FUNCTION get_follower_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM follows
        WHERE following_id = user_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_following_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM follows
        WHERE follower_id = user_id
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM notifications
        WHERE receiver_id = user_id AND read = false
    );
END;
$$ LANGUAGE plpgsql;

-- Function to fix existing profiles with missing data
CREATE OR REPLACE FUNCTION fix_existing_profiles()
RETURNS TEXT AS $$
DECLARE
  fixed_count INTEGER := 0;
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      au.id, 
      COALESCE(au.raw_user_meta_data, au.raw_app_meta_data) as metadata
    FROM auth.users au
    JOIN profiles p ON au.id = p.id
    WHERE (p.full_name IS NULL OR p.full_name = '' OR p.username IS NULL OR p.username = '')
  LOOP
    UPDATE profiles
    SET 
      full_name = COALESCE(user_record.metadata->>'full_name', full_name, ''),
      username = COALESCE(user_record.metadata->>'username', username, ''),
      updated_at = now()
    WHERE id = user_record.id
    AND (user_record.metadata->>'full_name' IS NOT NULL OR user_record.metadata->>'username' IS NOT NULL);
    
    IF FOUND THEN
      fixed_count := fixed_count + 1;
    END IF;
  END LOOP;
  
  RETURN 'Fixed ' || fixed_count || ' profiles';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
