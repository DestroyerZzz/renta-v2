-- Add columns for post sharing functionality
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS original_post_id UUID REFERENCES posts(id),
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- Add an index to improve query performance when fetching shared posts
CREATE INDEX IF NOT EXISTS idx_posts_original_post_id ON posts(original_post_id);

-- Add a comment to explain the purpose of these columns
COMMENT ON COLUMN posts.original_post_id IS 'Reference to the original post that was shared';
COMMENT ON COLUMN posts.is_shared IS 'Flag indicating if this post is a share of another post';