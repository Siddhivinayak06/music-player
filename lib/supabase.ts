/**
 * SSR-aware Supabase browser client.
 *
 * Uses @supabase/ssr's createBrowserClient which stores auth tokens
 * in cookies, enabling the Next.js middleware to read the session on
 * every request.
 *
 * This module creates a singleton client instance that is reused
 * throughout the application.
 */
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : null
