import type { ReactNode } from 'react'
import { useLang, localizeCountry } from '../../i18n'
import { Select, type SelectOption } from '../../molecules/Select'

interface FiltersProps {
  /** Leading controls rendered at the start of the bar (e.g. the assisted/free mode tabs). */
  leading?: ReactNode
  searchValue?: string
  onSearchChange?: (value: string) => void
  /** Selected WC edition (season year). With seasonOptions, renders the edition selector. */
  seasonValue?: number
  onSeasonChange?: (value: number) => void
  seasonOptions?: readonly number[]
  /** Selected country/nation ('all' = any). With onCountryChange, renders the country dropdown. */
  countryValue?: string
  onCountryChange?: (value: string) => void
  countryOptions?: readonly string[]
  positionValue?: string
  onPositionChange?: (value: string) => void
  rarityValue?: string
  onRarityChange?: (value: string) => void
  /** Label for the "any rarity" option. v9 builder uses "All premiums" (commons aren't hand-pickable). */
  rarityAllLabel?: string
  /** Selectable rarity options. Defaults to all four; v9 builder passes premium-only (no Common). */
  rarityOptions?: readonly string[]
  ratingMin?: number
  onRatingMinChange?: (value: number) => void
}

/** Squad browser filter row — WC edition + country + text search + position + rarity + rating range.
 *  Uses the custom Select dropdown (native <select> overflows / clips on mobile). */
export function Filters({
  leading,
  searchValue = '',
  onSearchChange,
  seasonValue,
  onSeasonChange,
  seasonOptions,
  countryValue = 'all',
  onCountryChange,
  countryOptions,
  positionValue = 'all',
  onPositionChange,
  rarityValue = 'all',
  onRarityChange,
  rarityAllLabel,
  rarityOptions = ['Legendary', 'Epic', 'Rare', 'Common'],
  ratingMin = 60,
  onRatingMinChange,
}: FiltersProps) {
  const { t, lang } = useLang()
  const RARITY_LABELS: Record<string, string> = {
    Legendary: t('builder.rarityLegendary'),
    Epic: t('builder.rarityEpic'),
    Rare: t('builder.rarityRare'),
    Common: t('builder.rarityCommon'),
  }

  const seasonOpts: SelectOption[] = (seasonOptions ?? []).map((s) => ({
    value: String(s),
    label: t('builder.wcEdition', { year: s }),
  }))
  const countryOpts: SelectOption[] = [
    { value: 'all', label: t('builder.allCountries') },
    ...(countryOptions ?? []).map((c) => ({ value: c, label: localizeCountry(c, lang) })),
  ]
  const positionOpts: SelectOption[] = [
    { value: 'all', label: t('builder.allPositions') },
    { value: 'FWD', label: t('builder.posFwd') },
    { value: 'MID', label: t('builder.posMid') },
    { value: 'DEF', label: t('builder.posDef') },
    { value: 'GK', label: t('builder.posGk') },
  ]
  const rarityOpts: SelectOption[] = [
    { value: 'all', label: rarityAllLabel ?? t('builder.allRarities') },
    ...rarityOptions.map((r) => ({ value: r, label: RARITY_LABELS[r] ?? r })),
  ]

  return (
    <div className="filters">
      {leading}
      {seasonOpts.length > 0 && onSeasonChange && (
        <Select
          className="edition-select"
          ariaLabel={t('builder.wcEditionTitle')}
          value={String(seasonValue ?? '')}
          options={seasonOpts}
          onChange={(v) => onSeasonChange(Number(v))}
        />
      )}
      <input
        type="text"
        className="filter-search"
        placeholder={t('builder.searchPlaceholder')}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      {onCountryChange && (
        <Select
          ariaLabel={t('builder.countryTitle')}
          value={countryValue}
          options={countryOpts}
          onChange={onCountryChange}
        />
      )}
      <Select
        ariaLabel={t('builder.allPositions')}
        value={positionValue}
        options={positionOpts}
        onChange={(v) => onPositionChange?.(v)}
      />
      <Select
        ariaLabel={rarityAllLabel ?? t('builder.allRarities')}
        value={rarityValue}
        options={rarityOpts}
        onChange={(v) => onRarityChange?.(v)}
      />
      <div className="range-wrap">
        <span>{t('builder.ratingMin', { n: ratingMin })}</span>
        <input
          type="range"
          min="60"
          max="99"
          value={ratingMin}
          onChange={(e) => onRatingMinChange?.(Number(e.target.value))}
        />
      </div>
    </div>
  )
}
