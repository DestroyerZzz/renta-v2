import { createBrowserClient } from '@supabase/ssr'
import { SUPABASE_CONFIG } from './supabase-config'

export function createClient() {
  return createBrowserClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.anonKey
  )
}