-- Allow public read access to profiles
ALTER TABLE profiles
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- Allow public read access to products
ALTER TABLE products
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public products are viewable by everyone" 
ON products FOR SELECT 
USING (true);

-- Ensure only authenticated users can modify their own profiles
CREATE POLICY "Users can only update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id);

-- Ensure only authenticated users can modify their own products
CREATE POLICY "Users can only insert their own products" 
ON products FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own products" 
ON products FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own products" 
ON products FOR DELETE 
USING (auth.uid() = user_id);