'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { validatePassword } from '@/lib/sanitize'
import { Music, AlertCircle, ArrowLeft, Check, X, Shield } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Number', test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
]

export default function SignupPage() {
  const router = useRouter()
  const { signUp, user, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPasswordRules, setShowPasswordRules] = useState(false)

  // Redirect to home if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/')
    }
  }, [authLoading, user, router])

  const passwordErrors = useMemo(() => validatePassword(password), [password])
  const isPasswordValid = password.length > 0 && passwordErrors.length === 0

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side password validation
    if (passwordErrors.length > 0) {
      setError(passwordErrors[0])
      return
    }

    // Username validation
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setLoading(true)
    try {
      await signUp(email, password, username.trim())
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="group flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft size={16} className="transition group-hover:-translate-x-0.5" />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        <div className="surface-glass rounded-2xl p-6 sm:p-7">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Music className="h-7 w-7" />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-foreground">Create account</h1>
            <p className="text-sm text-muted-foreground">Join Vinyl and start listening</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={14} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <input
                type="text"
                placeholder="Pick a username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_-]+"
                autoComplete="username"
                className="w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setShowPasswordRules(true) }}
                required
                autoComplete="new-password"
                className="w-full rounded-xl border border-border bg-background/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />

              {/* Password strength indicator */}
              {showPasswordRules && password.length > 0 && (
                <div className="mt-2 rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Shield size={12} className={isPasswordValid ? 'text-emerald-500' : 'text-muted-foreground'} />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Password strength
                    </span>
                  </div>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(password)
                    return (
                      <div key={rule.label} className="flex items-center gap-2 text-xs">
                        {passed ? (
                          <Check size={12} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <X size={12} className="text-muted-foreground/50 flex-shrink-0" />
                        )}
                        <span className={passed ? 'text-foreground' : 'text-muted-foreground/70'}>
                          {rule.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !isPasswordValid)}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
