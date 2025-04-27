-- Add username column to profiles table
ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;

-- Create index on username column for faster lookups
CREATE INDEX idx_profiles_username ON profiles(username);

-- Update RLS policies to allow searching by username
CREATE POLICY "Public profiles are viewable by username" 
ON profiles FOR SELECT 
USING (true);

-- Ensure auth_uid remains the primary key and owner of the profile
-- This is a constraint to ensure username can only be modified by the owner
CREATE POLICY "Users can only update their own username" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Create a function to validate username format (no special characters)
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

-- Create a trigger to validate username before insert or update
CREATE TRIGGER validate_username_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
WHEN (NEW.username IS NOT NULL)
EXECUTE FUNCTION validate_username();
