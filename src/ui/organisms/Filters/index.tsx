interface FiltersProps {
  searchValue?: string
  onSearchChange?: (value: string) => void
  positionValue?: string
  onPositionChange?: (value: string) => void
  rarityValue?: string
  onRarityChange?: (value: string) => void
  ratingMin?: number
  onRatingMinChange?: (value: number) => void
}

/** Squad browser filter row — text search, position select, rarity select, rating range. */
export function Filters({
  searchValue = '',
  onSearchChange,
  positionValue = 'all',
  onPositionChange,
  rarityValue = 'all',
  onRarityChange,
  ratingMin = 60,
  onRatingMinChange,
}: FiltersProps) {
  return (
    <div className="filters" style={{ border: 'none', padding: 0, width: '100%' }}>
      <input
        type="text"
        placeholder="Search players…"
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      <select value={positionValue} onChange={(e) => onPositionChange?.(e.target.value)}>
        <option value="all">All positions</option>
        <option>FWD</option>
        <option>MID</option>
        <option>DEF</option>
        <option>GK</option>
      </select>
      <select value={rarityValue} onChange={(e) => onRarityChange?.(e.target.value)}>
        <option value="all">All rarities</option>
        <option>Legendary</option>
        <option>Epic</option>
        <option>Rare</option>
        <option>Common</option>
      </select>
      <div className="range-wrap">
        <span>Rating {ratingMin}+</span>
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
