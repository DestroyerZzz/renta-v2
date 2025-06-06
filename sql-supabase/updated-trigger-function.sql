-- This is the SQL command to run in your Supabase SQL Editor to fix the profile creation issue

-- Check the structure of the profiles table to ensure username column exists
-- If it doesn't exist yet, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
    -- Create index on username column for faster lookups
    CREATE INDEX idx_profiles_username ON profiles(username);
  END IF;
END $$;

-- Update the trigger function to try multiple metadata locations
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
  
  -- Log the values for debugging
  RAISE LOG 'Creating profile for user % with full_name="%", username="%"', 
    new.id, full_name_value, username_value;
  
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

-- No need to recreate the trigger if it already exists, but we'll ensure it's correct
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.create_profile_for_user();

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

-- Call the function to fix existing profiles
SELECT fix_existing_profiles();
