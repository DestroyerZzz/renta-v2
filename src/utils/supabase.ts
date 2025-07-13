import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './supabase-config'

// Create a single client instance that will be reused
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Only create a new client if one doesn't exist
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey
    )
  }

  return supabaseClient
}