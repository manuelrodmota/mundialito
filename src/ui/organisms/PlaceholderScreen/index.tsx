import { Button } from '../../atoms/Button'

interface PlaceholderScreenProps {
  title: string
  note?: string
  onBack: () => void
}

/** Generic "not yet built" screen — used as a stub for unbuilt destinations until their tickets land. */
export function PlaceholderScreen({ title, note, onBack }: PlaceholderScreenProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: 40 }}>
      <h1>{title}</h1>
      {note && <p className="note">{note}</p>}
      <Button variant="ghost" onClick={onBack}>
        Back to menu
      </Button>
    </div>
  )
}
