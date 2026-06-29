/**
 * Per-user profile repository (WCC-044/048). Talks to the owner-scoped `profiles`
 * table + the `username_available` / `register_account` RPCs (RLS / SECURITY DEFINER
 * enforce that a user only ever touches their own row).
 */

import { getSupabaseClient } from '../remote/client'
import type { BoxTier } from '../../meta/boxes'

export interface Profile {
  userId: string
  username: string
  xp: number
  level: number
  welcomeDone: boolean
  favoriteTeam: string | null
  gamesPlayed: number
  gamesWon: number
  prestige: number
}

interface ProfileRow {
  user_id: string
  username: string
  xp: number
  level: number
  welcome_done: boolean
  favorite_team: string | null
  games_played: number
  games_won: number
  prestige: number
}

function mapProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    username: row.username,
    xp: row.xp,
    level: row.level,
    welcomeDone: row.welcome_done,
    favoriteTeam: row.favorite_team,
    gamesPlayed: row.games_played,
    gamesWon: row.games_won,
    prestige: row.prestige,
  }
}

/** The signed-in user's profile, or null if they haven't registered a username yet. */
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('user_id, username, xp, level, welcome_done, favorite_team, games_played, games_won, prestige')
    .maybeSingle()
  if (error) throw error
  return data ? mapProfile(data) : null
}

export interface XpGrant {
  level: number
  xp: number
  /** Milestone boxes granted by the level-ups this XP caused. */
  boxes: { id: number; tier: BoxTier; level: number }[]
}

/** Apply XP (atomic, via add_xp RPC): rolls levels + grants milestone boxes. */
export async function addXp(amount: number): Promise<XpGrant> {
  const { data, error } = await getSupabaseClient().rpc('add_xp', { p_amount: amount })
  if (error) throw error
  const d = data as unknown as {
    level: number
    xp: number
    boxes: { id: number; tier: string; level: number }[]
  }
  return {
    level: d.level,
    xp: d.xp,
    boxes: (d.boxes ?? []).map((b) => ({ id: b.id, tier: b.tier as BoxTier, level: b.level })),
  }
}

/** Prestige: reset level→1 for a prestige rank (requires level 50). Keeps cards/boxes. */
export async function prestigeAccount(): Promise<Profile> {
  const { data, error } = await getSupabaseClient().rpc('prestige_account')
  if (error) throw error
  return mapProfile(data as unknown as ProfileRow)
}

/** Record a finished match result (best-effort; no-op when signed out). */
export async function recordMatch(won: boolean): Promise<void> {
  try {
    const sb = getSupabaseClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    if (!session) return
    await sb.rpc('record_match', { p_won: won })
  } catch {
    /* best-effort stat; ignore failures */
  }
}

/** Set the signed-in user's favorite nation (shown as a crest on the account). */
export async function updateFavoriteTeam(nation: string): Promise<void> {
  const sb = getSupabaseClient()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) throw new Error('not authenticated')
  const { error } = await sb.from('profiles').update({ favorite_team: nation }).eq('user_id', user.id)
  if (error) throw error
}

/** Case-insensitive availability check (via SECURITY DEFINER fn — doesn't expose other rows). */
export async function usernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await getSupabaseClient().rpc('username_available', {
    p_username: username,
  })
  if (error) throw error
  return data === true
}

/** Atomically create the profile and seed the 4-box welcome bundle. Throws on taken/invalid name. */
export async function registerAccount(username: string): Promise<Profile> {
  const { data, error } = await getSupabaseClient().rpc('register_account', {
    p_username: username,
  })
  if (error) throw error
  return mapProfile(data as unknown as ProfileRow)
}
