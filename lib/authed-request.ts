import { supabase } from '@/lib/supabase'

export async function authedJsonRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabase) {
    throw new Error('Supabase is not configured')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const token = session?.access_token

  if (!token) {
    throw new Error('You must be signed in')
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error ?? 'Request failed')
  }

  return payload as T
}
