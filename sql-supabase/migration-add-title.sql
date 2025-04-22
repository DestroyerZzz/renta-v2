-- Add title field to products table
ALTER TABLE products ADD COLUMN title TEXT;

-- Update existing records to set title from first line of description
UPDATE products 
SET title = CASE
  WHEN description IS NULL THEN 'Untitled Product'
  WHEN position(E'\n' in description) > 0 THEN substring(description from 1 for position(E'\n' in description) - 1)
  ELSE substring(description from 1 for 50)
END;