'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Music } from 'lucide-react'

/**
 * Client-side authentication guard.
 *
 * Provides a second layer of protection (defense in depth) on top of
 * the Next.js middleware. While middleware handles protection at the
 * edge, this component ensures the React tree never renders protected
 * content if the client session is missing.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-14 h-14">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            {/* Icon */}
            <div className="relative w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
              <Music className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Checking session…
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    // While the redirect fires, render nothing to prevent flash of protected content.
    return null
  }

  return <>{children}</>
}
