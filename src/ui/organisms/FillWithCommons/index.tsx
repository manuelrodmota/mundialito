import { Button } from '../../atoms/Button'

interface FillWithCommonsProps {
  onFill: () => void
  disabled?: boolean
}

/** Fill-with-commons affordance — triggers the §16.3 random-common roster fill. */
export function FillWithCommons({ onFill, disabled }: FillWithCommonsProps) {
  return (
    <div className="fill-with-commons">
      <Button variant="ghost" onClick={onFill} disabled={disabled}>
        Fill with commons
      </Button>
      <span className="fill-hint">Random commons fill remaining slots</span>
    </div>
  )
}
