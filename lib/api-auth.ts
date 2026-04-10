import { createClient, User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt, SupabaseJwtPayload } from '@/lib/jwt'

export function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice(7)
}

export function createAuthedSupabaseClient(accessToken?: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    }
  )
}

/**
 * Require an authenticated user for API routes.
 *
 * 1. Extracts the Bearer JWT from the Authorization header
 * 2. Verifies the JWT signature locally using `jose` (no network call)
 * 3. Creates a Supabase client scoped to the user's token for RLS
 *
 * Returns either { user, supabase, jwt } or { error }.
 */
export async function requireApiUser(request: NextRequest): Promise<
  | {
      user: User
      supabase: ReturnType<typeof createAuthedSupabaseClient>
      jwt: SupabaseJwtPayload
    }
  | {
      error: NextResponse
    }
> {
  const token = getBearerToken(request)

  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Verify JWT locally — fast, no network call
  const jwtPayload = await verifyJwt(token)

  if (!jwtPayload || !jwtPayload.sub) {
    return { error: NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 }) }
  }

  // Create a Supabase client with the user's token so RLS policies apply
  const supabase = createAuthedSupabaseClient(token)

  // Construct a minimal User object from the JWT claims
  const user: User = {
    id: jwtPayload.sub,
    email: jwtPayload.email,
    role: jwtPayload.role || 'authenticated',
    aud: (jwtPayload.aud as string) || 'authenticated',
    app_metadata: (jwtPayload.app_metadata as Record<string, unknown>) || {},
    user_metadata: (jwtPayload.user_metadata as Record<string, unknown>) || {},
    created_at: '',
  }

  return { user, supabase, jwt: jwtPayload }
}
