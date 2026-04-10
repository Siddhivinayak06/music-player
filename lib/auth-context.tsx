'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setLoading(false)
        return
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      setUser(session?.user ?? null)

      // Handle security-relevant auth events
      switch (event) {
        case 'SIGNED_OUT':
          // Clear any cached data on sign out
          setSession(null)
          setUser(null)
          break

        case 'TOKEN_REFRESHED':
          // Session was automatically refreshed — update state
          break

        case 'USER_UPDATED':
          // User metadata changed
          break
      }
    })

    // Proactive session refresh: check token expiry every 30 seconds
    // and trigger a refresh if the token expires within 5 minutes.
    const refreshInterval = setInterval(async () => {
      if (!supabase) return

      const {
        data: { session: current },
      } = await supabase.auth.getSession()

      if (!current) return

      const expiresAt = current.expires_at
      if (expiresAt) {
        const secondsLeft = expiresAt - Math.floor(Date.now() / 1000)

        // Refresh if less than 5 minutes remaining
        if (secondsLeft < 300) {
          await supabase.auth.refreshSession()
        }
      }
    }, 30_000)

    return () => {
      subscription?.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [])

  const signUp = async (email: string, password: string, username: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        }
      }
    })

    if (error) throw error
    // User profile is automatically created by the database trigger (on_auth_user_created)
    // No need to manually insert into public.users
  }

  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
  }

  const signOut = async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
