-- ================================================================
-- GOOGLE OAUTH INTEGRATION MIGRATION - FINAL VERSION
-- ================================================================
-- 
-- This migration updates the profile creation system to support Google OAuth
-- and automatically populate user profiles with Google account data.
--
-- Project: OpenMind (product-dashboard)
-- Date: June 13, 2025
-- ================================================================

-- Update the profile creation function to handle Google OAuth data
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_value TEXT;
  username_value TEXT;
  avatar_url_value TEXT;
  base_username TEXT;
  counter INTEGER := 1;
  username_exists BOOLEAN;
BEGIN
  -- Extract data from metadata (Google OAuth stores in raw_user_meta_data)
  IF new.raw_user_meta_data IS NOT NULL THEN
    full_name_value := COALESCE(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    );
    username_value := COALESCE(
      new.raw_user_meta_data->>'username',
      lower(replace(split_part(new.email, '@', 1), '.', '_'))
    );
    avatar_url_value := new.raw_user_meta_data->>'avatar_url';
  ELSIF new.raw_app_meta_data IS NOT NULL THEN
    full_name_value := COALESCE(
      new.raw_app_meta_data->>'full_name',
      new.raw_app_meta_data->>'name',
      split_part(new.email, '@', 1)
    );
    username_value := COALESCE(
      new.raw_app_meta_data->>'username',
      lower(replace(split_part(new.email, '@', 1), '.', '_'))
    );
    avatar_url_value := new.raw_app_meta_data->>'avatar_url';
  ELSE
    full_name_value := split_part(new.email, '@', 1);
    username_value := lower(replace(split_part(new.email, '@', 1), '.', '_'));
    avatar_url_value := NULL;
  END IF;
  
  -- Ensure unique username by appending numbers if needed
  base_username := username_value;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.profiles 
      WHERE username = username_value AND id != new.id
    ) INTO username_exists;
    
    IF NOT username_exists THEN EXIT; END IF;
    
    username_value := base_username || counter::TEXT;
    counter := counter + 1;
    
    -- Safety check to prevent infinite loops
    IF counter > 1000 THEN
      username_value := base_username || '_' || extract(epoch from now())::bigint::TEXT;
      EXIT;
    END IF;
  END LOOP;
  
  -- Log for debugging (visible in Supabase logs)
  RAISE LOG 'Creating profile for user % with full_name="%", username="%", avatar_url="%"', 
    new.id, full_name_value, username_value, 
    CASE WHEN avatar_url_value IS NOT NULL THEN 'SET' ELSE 'NULL' END;
  
  -- Insert or update the profile
  INSERT INTO public.profiles (id, full_name, username, avatar_url, updated_at, created_at)
  VALUES (new.id, full_name_value, username_value, avatar_url_value, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = EXCLUDED.updated_at;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger to ensure it's properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_profile_for_user();

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
--
-- This migration enables:
-- ✅ Automatic profile creation for Google OAuth users
-- ✅ Smart username generation with conflict resolution
-- ✅ Google profile picture import (avatar_url)
-- ✅ Fallback handling for email/password users
-- ✅ Proper error handling and logging
--
-- To test: 
-- 1. Apply this migration in Supabase SQL Editor
-- 2. Configure Google OAuth in Supabase Dashboard
-- 3. Test sign-in with Google account
-- 4. Check Supabase logs for trigger messages
-- ================================================================
