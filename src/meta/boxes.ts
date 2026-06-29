/**
 * Box-tier metadata (WCC-045). Tier names are kept off the card rarities
 * (Group / Knockout / Champions / Trophy). Drop tables + the rolling engine
 * land with the box-opening flow (WCC-053); this is the shared tier catalog.
 */

export type BoxTier = 'group' | 'knockout' | 'champions' | 'trophy'

export interface BoxTierMeta {
  key: BoxTier
  name: string
  tagline: string
  /** Pack-art accent (bronze / silver / gold). */
  accent: string
  accent2: string
}

export const BOX_TIERS: Record<BoxTier, BoxTierMeta> = {
  group: { key: 'group', name: 'Group', tagline: 'Entry box', accent: '#cd7f43', accent2: '#8a5226' },
  knockout: { key: 'knockout', name: 'Knockout', tagline: 'Mid box', accent: '#c3ccd9', accent2: '#7d8aa0' },
  champions: { key: 'champions', name: 'Champions', tagline: 'Premium box', accent: '#eccf6e', accent2: '#b8862a' },
  trophy: { key: 'trophy', name: 'Champions — Trophy', tagline: 'Win the Final', accent: '#eccf6e', accent2: '#b8862a' },
}
