import type { CSSProperties } from 'react'

/**
 * Line-icon set for the meta layer (menu, account, collection, boxes).
 * Single 24×24 stroke path per name; `play` is filled. Ported from the
 * progression design handoff (`prog/Screens.jsx`).
 */
const ICONS = {
  play: 'M7 4 L19 12 L7 20 Z',
  help: 'M9.5 9 a2.5 2.5 0 1 1 3.5 2.3 c-1 .5 -1.5 1 -1.5 2.2 M12 17 h.01 M21 12 a9 9 0 1 1 -18 0 a9 9 0 0 1 18 0',
  lock: 'M7 11 V8 a5 5 0 0 1 10 0 v3 M5 11 h14 v9 H5 Z',
  arcade:
    'M6 11 h2 M7 10 v2 M15 11 h.01 M17 13 h.01 M5 6 h14 a3 3 0 0 1 3 3 v6 a3 3 0 0 1 -3 3 H5 a3 3 0 0 1 -3 -3 V9 a3 3 0 0 1 3 -3 Z',
  multiplayer:
    'M16 14 a4 4 0 1 0 -8 0 M12 10 a3 3 0 1 0 0 -6 a3 3 0 0 0 0 6 M3 20 a5 5 0 0 1 6 -4.5 M21 20 a5 5 0 0 1 -6 -4.5',
  account: 'M19 21 v-2 a4 4 0 0 0 -4 -4 H9 a4 4 0 0 0 -4 4 v2 M12 11 a4 4 0 1 0 0 -8 a4 4 0 0 0 0 8',
  collection: 'M3 7 a2 2 0 0 1 2 -2 h4 l2 2 h8 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z',
  back: 'M15 18 L9 12 L15 6',
  search: 'M11 19 a8 8 0 1 0 0 -16 a8 8 0 0 0 0 16 M21 21 l-4.3 -4.3',
  sparkle: 'M12 3 l1.8 5.2 5.2 1.8 -5.2 1.8 -1.8 5.2 -1.8 -5.2 -5.2 -1.8 5.2 -1.8 Z',
  box: 'M21 8 L12 3 L3 8 v8 l9 5 9 -5 Z M3 8 l9 5 9 -5 M12 13 v8',
  check: 'M20 6 L9 17 L4 12',
  logout: 'M16 17 l5 -5 -5 -5 M21 12 H9 M9 21 H6 a2 2 0 0 1 -2 -2 V5 a2 2 0 0 1 2 -2 h3',
} as const

export type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName
  size?: number
  style?: CSSProperties
}

/** Inline line-icon. Inherits `currentColor` from its container. */
export function Icon({ name, size = 24, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={name === 'play' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

/** Google "G" mark for the Login tile / sign-in button. */
export function GoogleG({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45 24c0-1.6-.1-3.1-.4-4.6H24v9.1h11.8c-.5 2.8-2 5.1-4.4 6.7v5.6h7.1C42.7 37 45 31 45 24z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.9 0 10.9-2 14.5-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.4v5.7C8 41.6 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.4C2.9 17.1 2 20.4 2 24s.9 6.9 2.4 9.9l7.4-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 29.9 2 24 2 15.4 2 8 6.4 4.4 14.1l7.4 5.7c1.7-5.2 6.5-9 12.2-9z"
      />
    </svg>
  )
}
