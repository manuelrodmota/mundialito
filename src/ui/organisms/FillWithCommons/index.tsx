import { Button } from '../../atoms/Button'
import { useLang } from '../../i18n'

interface FillWithCommonsProps {
  onFill: () => void
  disabled?: boolean
}

/** Fill-with-commons affordance — triggers the §16.3 random-common roster fill. */
export function FillWithCommons({ onFill, disabled }: FillWithCommonsProps) {
  const { t } = useLang()
  return (
    <div className="fill-with-commons">
      <Button variant="ghost" onClick={onFill} disabled={disabled}>
        {t('builder.fillBench')}
      </Button>
      <span className="fill-hint">{t('builder.fillHint')}</span>
    </div>
  )
}
