/**
 * Common configuration for Supabase clients
 * This file centralizes the configuration used across different client types
 */

// Environment variables used across all Supabase clients
export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
}