import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@/lib/supabase-server'
import { verifyJwt } from '@/lib/jwt'
import { authLimiter, apiLimiter } from '@/lib/rate-limit'

/**
 * Routes accessible WITHOUT authentication.
 */
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/signup']

/**
 * Public API routes that don't need auth in the middleware.
 */
const PUBLIC_API_ROUTES: string[] = []

/**
 * Auth-related paths that get stricter rate limiting.
 */
const AUTH_PATHS = ['/auth/login', '/auth/signup']

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname === route + '/'
  )
}

function isPublicApiRoute(pathname: string) {
  return PUBLIC_API_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  )
}

function isAuthPath(pathname: string) {
  return AUTH_PATHS.some(
    (route) => pathname === route || pathname.startsWith(route)
  )
}

/**
 * Extract the client IP from the request.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIp(request)

  // ── Rate limiting on auth endpoints (brute-force protection) ──────────
  if (isAuthPath(pathname) && request.method === 'POST') {
    if (authLimiter.isRateLimited(ip)) {
      const resetMs = authLimiter.resetIn(ip)
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', retryAfterMs: resetMs },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
      )
    }
  }

  // ── General API rate limiting ─────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    if (apiLimiter.isRateLimited(ip)) {
      const resetMs = apiLimiter.resetIn(ip)
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(resetMs / 1000)) } }
      )
    }
  }

  // ── Let public pages through ──────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // ── Read the session using Supabase's own cookie parser ───────────────
  // This correctly handles the chunked cookie format that createBrowserClient uses.
  const { supabase, response } = createMiddlewareSupabaseClient(request)
  const { data: { session } } = await supabase.auth.getSession()

  let isAuthenticated = false

  if (session?.access_token) {
    // Verify the JWT (signature check if secret configured, expiry check otherwise)
    const jwtPayload = await verifyJwt(session.access_token)
    isAuthenticated = jwtPayload !== null
  }

  // ── API routes: return 401 JSON if unauthenticated ────────────────────
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated && !isPublicApiRoute(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return response
  }

  // ── Page routes: redirect to login if unauthenticated ─────────────────
  if (!isAuthenticated) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.*|apple-icon.*|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$).*)',
  ],
}
