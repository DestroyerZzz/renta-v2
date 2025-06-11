# Clean SQL Files for Open Mind v1.2.0

This directory contains a reorganized version of the SQL files for the Open Mind application. The content has been split into three logical files for better organization and maintainability.

## Files

1. **01-tables.sql** - Contains all table definitions including:
   - profiles
   - products (interests)
   - posts
   - follows
   - notifications
   - All related indexes

2. **02-storage.sql** - Contains all storage bucket configurations including:
   - avatars bucket
   - product_images bucket
   - covers bucket
   - posts bucket
   - All related security policies for each bucket

3. **03-policies-and-functions.sql** - Contains all RLS policies and database functions including:
   - Row-Level Security (RLS) policies for all tables
   - Trigger functions for automatic timestamps
   - Profile creation function for new users
   - Username validation functions
   - Notification creation functions and triggers
   - Utility functions for counting followers, etc.

## Usage

When applying these SQL files to your Supabase instance, you should run them in order:

1. First run `01-tables.sql` to create the database structure
2. Then run `02-storage.sql` to set up the storage buckets
3. Finally run `03-policies-and-functions.sql` to add the security policies and functions

This ensures that all dependencies are met in the correct order.

## Important Notes

- These files are designed to be idempotent - they use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING` where appropriate so they can be run multiple times without error.
- When making changes to the database structure, please update the appropriate file in this directory rather than creating new migration files.
- Before running in production, always test in a development environment first.
