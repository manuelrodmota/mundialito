import { useLang } from '../../i18n'
import { useSoundControls } from '../../sound/useSoundControls'
import './soundControls.css'

/** Music note — the crowd ambience channel. */
function IconMusic() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 18V6l11-2v12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6" cy="18" r="3" fill="currentColor" />
      <circle cx="17" cy="16" r="3" fill="currentColor" />
    </svg>
  )
}

/** Speaker — the sound-effects channel (goal roar, etc.). */
function IconSfx() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 9v6h4l5 4V5L8 9H4z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Two icon toggles for the two audio channels: crowd music and sound effects.
 *  A muted channel shows a diagonal slash (CSS) and reads dimmed. State persists. */
export function SoundControls() {
  const { t } = useLang()
  const { musicMuted, sfxMuted, toggleMusic, toggleSfx } = useSoundControls()

  return (
    <div className="sound-controls" role="group" aria-label="Sound">
      <button
        type="button"
        className={`sound-btn${musicMuted ? ' muted' : ''}`}
        aria-pressed={musicMuted}
        aria-label={t(musicMuted ? 'match.sound.music.off' : 'match.sound.music.on')}
        title={t(musicMuted ? 'match.sound.music.off' : 'match.sound.music.on')}
        onClick={toggleMusic}
      >
        <IconMusic />
      </button>
      <button
        type="button"
        className={`sound-btn${sfxMuted ? ' muted' : ''}`}
        aria-pressed={sfxMuted}
        aria-label={t(sfxMuted ? 'match.sound.sfx.off' : 'match.sound.sfx.on')}
        title={t(sfxMuted ? 'match.sound.sfx.off' : 'match.sound.sfx.on')}
        onClick={toggleSfx}
      >
        <IconSfx />
      </button>
    </div>
  )
}
