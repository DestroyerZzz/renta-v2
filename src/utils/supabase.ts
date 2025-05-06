import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './supabase-config'

export function createClient() {
  // Use the createBrowserClient function from @supabase/ssr
  return createBrowserClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  )
}