import type { ReactElement } from 'react'

/** Category glyph (instant / skill / power) shared by TacticCard and the opponent-tactics indicator. */
export const CAT_GLYPH: Record<string, ReactElement> = {
  instant: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ff9d92" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="rgba(232,85,74,0.25)" />
    </svg>
  ),
  skill: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#82c0f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" fill="rgba(62,148,222,0.18)" />
      <path d="M12 3 L12 21 M3 12 L21 12" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="#ecd089" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 21 L18 21 M12 17 L12 21 M5 4 L19 4 L19 9 A7 7 0 0 1 5 9 Z" fill="rgba(232,200,115,0.18)" />
    </svg>
  ),
}
