-- Add bio column to profiles table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                 WHERE table_name='profiles' AND column_name='bio') THEN
        ALTER TABLE profiles ADD COLUMN bio TEXT;
    END IF;
END $$;

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for posts
CREATE POLICY "Users can view any post"
    ON posts FOR SELECT
    USING (true);

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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();