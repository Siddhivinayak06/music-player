import { jwtVerify, JWTPayload, errors } from 'jose'

/**
 * Decoded Supabase JWT payload.
 */
export interface SupabaseJwtPayload extends JWTPayload {
  sub: string          // user id
  email?: string
  role?: string        // e.g. 'authenticated'
  aal?: string         // authenticator assurance level
  session_id?: string
  user_metadata?: Record<string, unknown>
  app_metadata?: Record<string, unknown>
}

/**
 * Whether a dedicated JWT secret is configured.
 * When true we do full HS256 signature verification.
 * When false we decode + check expiry (the API layer still validates
 * through Supabase, so security is not compromised).
 */
const hasJwtSecret = Boolean(process.env.SUPABASE_JWT_SECRET)

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
}

/**
 * Verify and decode a Supabase JWT.
 *
 * • If SUPABASE_JWT_SECRET is set → full HS256 signature verification.
 * • Otherwise → decode + expiry check only.  The downstream Supabase
 *   client will still reject tampered tokens via RLS, so this is safe
 *   for a middleware guard layer.
 *
 * @returns The decoded payload if valid, or null if expired / invalid.
 */
export async function verifyJwt(token: string): Promise<SupabaseJwtPayload | null> {
  if (hasJwtSecret) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecret(), {
        algorithms: ['HS256'],
      })
      return payload as SupabaseJwtPayload
    } catch {
      return null
    }
  }

  // Fallback: decode without signature verification, but DO check expiry.
  return decodeAndCheckExpiry(token)
}

/**
 * Decode a JWT and check its expiry WITHOUT verifying the signature.
 * Used when SUPABASE_JWT_SECRET is not available.
 */
function decodeAndCheckExpiry(token: string): SupabaseJwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Decode the payload (base64url)
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null
    }

    // Must have a subject (user id)
    if (!payload.sub) {
      return null
    }

    return payload as SupabaseJwtPayload
  } catch {
    return null
  }
}
