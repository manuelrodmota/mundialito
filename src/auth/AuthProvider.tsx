/* eslint-disable react-refresh/only-export-components -- context module: the provider
   component and the useAuth hook are intentionally colocated so consumers import both
   from `../../auth/AuthProvider`. (Rule only affects Fast Refresh granularity.) */
/**
 * Auth context for the meta layer (WCC-043). Real Google OAuth via Supabase Auth, with
 * session restore + logout. Quickplay + How to Play stay usable while anonymous; Arcade /
 * Account / Multiplayer gate on `status === 'authed'`.
 *
 * In tests, and when `VITE_DEV_LOGIN=true`, Supabase is skipped and a local stub session
 * is used so the downstream flow stays exercisable before Google OAuth is configured.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '../data/remote/client'

export type AuthStatus = 'loading' | 'anonymous' | 'authed'

export interface AuthUser {
  id?: string
  email?: string
  displayName: string
  /** Google profile picture URL, if available. */
  avatarUrl?: string
  /** Seeds the account avatar background (fallback when there's no picture). */
  avatarColor?: string
}

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  signInWithGoogle: () => void
  signOut: () => void
}

/** Skip Supabase auth and use a local stub (tests, or VITE_DEV_LOGIN=true). */
export const IS_DEV_AUTH =
  import.meta.env.MODE === 'test' || import.meta.env.VITE_DEV_LOGIN === 'true'

/** Whether Supabase env is configured (else: anonymous with a dev-login fallback). */
const HAS_SUPABASE = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
)

/** Use the local stub session instead of Supabase (tests, dev flag, or unconfigured env). */
export const USE_STUB_AUTH = IS_DEV_AUTH || !HAS_SUPABASE

const DEV_USER: AuthUser = {
  displayName: 'Manager',
  email: 'manager@worldcupclash.dev',
  avatarColor: '#7f56d9',
}

function mapUser(u: User): AuthUser {
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  const name =
    (meta.full_name as string) ||
    (meta.name as string) ||
    (u.email ? u.email.split('@')[0] : 'Player')
  return {
    id: u.id,
    email: u.email ?? undefined,
    displayName: name,
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
    avatarColor: (meta.avatar_color as string) || '#7f56d9',
  }
}

const DEFAULT_VALUE: AuthContextValue = {
  status: 'anonymous',
  user: null,
  signInWithGoogle: () => {},
  signOut: () => {},
}

const AuthContext = createContext<AuthContextValue>(DEFAULT_VALUE)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [devUser, setDevUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(USE_STUB_AUTH)

  useEffect(() => {
    if (USE_STUB_AUTH) return
    let active = true
    const supabase = getSupabaseClient()
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session)
        setReady(true)
      }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = useCallback(() => {
    if (USE_STUB_AUTH) {
      setDevUser(DEV_USER)
      return
    }
    void getSupabaseClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }, [])

  const signOut = useCallback(() => {
    setDevUser(null)
    if (USE_STUB_AUTH) return
    void getSupabaseClient().auth.signOut()
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ? mapUser(session.user) : devUser
    const status: AuthStatus = !ready ? 'loading' : user ? 'authed' : 'anonymous'
    return { status, user, signInWithGoogle, signOut }
  }, [session, devUser, ready, signInWithGoogle, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Access auth status + actions. Outside a provider it degrades to anonymous. */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}
