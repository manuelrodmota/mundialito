import { Button } from '../../atoms/Button'
import { useLang } from '../../i18n'

interface PlaceholderScreenProps {
  title: string
  note?: string
  onBack: () => void
}

/** Generic "not yet built" screen — used as a stub for unbuilt destinations until their tickets land. */
export function PlaceholderScreen({ title, note, onBack }: PlaceholderScreenProps) {
  const { t } = useLang()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
      <h1>{title}</h1>
      {note && <p className="note">{note}</p>}
      <Button variant="ghost" onClick={onBack}>
        {t('run.backToMenu')}
      </Button>
    </div>
  )
}
