/* eslint-disable react-refresh/only-export-components -- context module: the provider
   component and the useAccount hook are intentionally colocated. */
/**
 * Account context (WCC-048). Once the user is authed, loads their game profile
 * (username / xp / level / welcome state). If no profile exists yet, `status` is
 * 'none' — the app routes to the username registration screen.
 *
 * In stub auth (tests / dev flag / no Supabase env) a stub profile is provided so the
 * flow stays exercisable without a real session.
 *
 * The async fetch result is stored keyed by user; idle / dev / loading are *derived*
 * (no synchronous setState in the effect).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { USE_STUB_AUTH, useAuth } from '../auth/AuthProvider'
import {
  addXp as addXpRepo,
  fetchProfile,
  prestigeAccount,
  registerAccount,
  updateFavoriteTeam,
  type Profile,
} from '../data/user/profile.repo'
import type { BoxTier } from '../meta/boxes'

export type ProfileStatus = 'idle' | 'loading' | 'loaded' | 'none'

/** A level crossed by an XP grant, with the box it earned — drives the level-up moment. */
export interface LevelUpItem {
  level: number
  tier: BoxTier
  boxId: number
}

interface AccountContextValue {
  profile: Profile | null
  status: ProfileStatus
  register: (username: string) => Promise<Profile>
  refresh: () => Promise<void>
  setFavoriteTeam: (nation: string) => Promise<void>
  /** Grant XP (rolls levels + queues level-up moments). Best-effort; no-op when signed out. */
  addXp: (amount: number) => Promise<void>
  /** Prestige (level 50+): reset level, bump prestige rank. */
  prestige: () => Promise<void>
  /** Pending level-up moments (FIFO). */
  levelUps: LevelUpItem[]
  /** Dismiss the first pending level-up moment. */
  consumeLevelUp: () => void
}

const DEFAULT_VALUE: AccountContextValue = {
  profile: null,
  status: 'idle',
  register: async () => {
    throw new Error('AccountProvider missing')
  },
  refresh: async () => {},
  setFavoriteTeam: async () => {},
  addXp: async () => {},
  prestige: async () => {},
  levelUps: [],
  consumeLevelUp: () => {},
}

const AccountContext = createContext<AccountContextValue>(DEFAULT_VALUE)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { status: authStatus, user } = useAuth()
  // Real-fetch result, keyed by the user it belongs to. setState only in async callbacks.
  const [fetched, setFetched] = useState<{ key: string; profile: Profile | null } | null>(null)
  // Optimistic favorite-team override (applied over whatever profile is shown).
  const [favoriteOverride, setFavoriteOverride] = useState<string | null | undefined>(undefined)
  const [levelUps, setLevelUps] = useState<LevelUpItem[]>([])

  const authed = authStatus === 'authed'
  const authKey = authed ? (user?.id ?? user?.displayName ?? 'authed') : null

  useEffect(() => {
    if (!authed || USE_STUB_AUTH || !authKey) return
    let active = true
    fetchProfile()
      .then((p) => {
        if (active) setFetched({ key: authKey, profile: p })
      })
      .catch(() => {
        if (active) setFetched({ key: authKey, profile: null })
      })
    return () => {
      active = false
    }
  }, [authed, authKey])

  const register = useCallback(
    async (username: string) => {
      const created = await registerAccount(username)
      setFetched({ key: authKey ?? 'authed', profile: created })
      return created
    },
    [authKey],
  )

  const refresh = useCallback(async () => {
    if (USE_STUB_AUTH || !authKey) return
    const p = await fetchProfile()
    setFetched({ key: authKey, profile: p })
  }, [authKey])

  const setFavoriteTeam = useCallback(async (nation: string) => {
    setFavoriteOverride(nation) // optimistic
    if (USE_STUB_AUTH) return
    try {
      await updateFavoriteTeam(nation)
    } catch {
      /* keep the optimistic value; a refresh would reconcile */
    }
  }, [])

  const addXp = useCallback(
    async (amount: number) => {
      if (USE_STUB_AUTH || amount <= 0) return
      try {
        const grant = await addXpRepo(amount)
        setFetched((prev) =>
          prev?.profile
            ? { key: prev.key, profile: { ...prev.profile, level: grant.level, xp: grant.xp } }
            : prev,
        )
        if (grant.boxes.length) {
          setLevelUps((q) => [...q, ...grant.boxes.map((b) => ({ level: b.level, tier: b.tier, boxId: b.id }))])
        }
      } catch {
        /* best-effort */
      }
    },
    [],
  )

  const consumeLevelUp = useCallback(() => setLevelUps((q) => q.slice(1)), [])

  const prestige = useCallback(async () => {
    if (USE_STUB_AUTH) return
    const p = await prestigeAccount()
    setFetched({ key: authKey ?? 'authed', profile: p })
  }, [authKey])

  const value = useMemo<AccountContextValue>(() => {
    let baseProfile: Profile | null = null
    let status: ProfileStatus = 'idle'
    if (authed) {
      if (USE_STUB_AUTH) {
        baseProfile = {
          userId: 'dev',
          username: user?.displayName ?? 'Manager',
          xp: 0,
          level: 1,
          welcomeDone: false,
          favoriteTeam: null,
          gamesPlayed: 0,
          gamesWon: 0,
          prestige: 0,
        }
        status = 'loaded'
      } else if (fetched && fetched.key === authKey) {
        baseProfile = fetched.profile
        status = fetched.profile ? 'loaded' : 'none'
      } else {
        status = 'loading'
      }
    }
    const profile =
      baseProfile && favoriteOverride !== undefined
        ? { ...baseProfile, favoriteTeam: favoriteOverride }
        : baseProfile
    return { profile, status, register, refresh, setFavoriteTeam, addXp, prestige, levelUps, consumeLevelUp }
  }, [
    authed,
    authKey,
    fetched,
    user?.displayName,
    favoriteOverride,
    register,
    refresh,
    setFavoriteTeam,
    addXp,
    prestige,
    levelUps,
    consumeLevelUp,
  ])

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

/** Access the loaded profile + registration actions. */
export function useAccount(): AccountContextValue {
  return useContext(AccountContext)
}
