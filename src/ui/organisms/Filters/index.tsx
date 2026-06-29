import { useLang, localizeCountry } from '../../i18n'

interface FiltersProps {
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

/** Squad browser filter row — WC edition + country + text search + position + rarity + rating range. */
export function Filters({
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
  return (
    <div className="filters" style={{ border: 'none', padding: '0 28px 16px', width: '100%' }}>
      {seasonOptions && onSeasonChange && (
        <select
          className="edition-select"
          value={String(seasonValue ?? '')}
          onChange={(e) => onSeasonChange(Number(e.target.value))}
          title={t('builder.wcEditionTitle')}
        >
          {seasonOptions.map((s) => (
            <option key={s} value={s}>{t('builder.wcEdition', { year: s })}</option>
          ))}
        </select>
      )}
      <input
        type="text"
        placeholder={t('builder.searchPlaceholder')}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      {onCountryChange && (
        <select value={countryValue} onChange={(e) => onCountryChange(e.target.value)} title={t('builder.countryTitle')}>
          <option value="all">{t('builder.allCountries')}</option>
          {(countryOptions ?? []).map((c) => (
            <option key={c} value={c}>{localizeCountry(c, lang)}</option>
          ))}
        </select>
      )}
      <select value={positionValue} onChange={(e) => onPositionChange?.(e.target.value)}>
        <option value="all">{t('builder.allPositions')}</option>
        <option>FWD</option>
        <option>MID</option>
        <option>DEF</option>
        <option>GK</option>
      </select>
      <select value={rarityValue} onChange={(e) => onRarityChange?.(e.target.value)}>
        <option value="all">{rarityAllLabel ?? t('builder.allRarities')}</option>
        {rarityOptions.map((r) => (
          <option key={r} value={r}>{RARITY_LABELS[r] ?? r}</option>
        ))}
      </select>
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
