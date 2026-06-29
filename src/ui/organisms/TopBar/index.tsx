import { useLang } from '../../i18n'
import { Icon } from '../../atoms/Icon'
import { Avatar } from '../../atoms/Avatar'

interface TopBarProps {
  /** Click the brand to go home (menu). */
  onBrand: () => void
  username: string
  level: number
  avatarUrl?: string
  avatarColor?: string
}

/** Fixed top bar for the signed-in meta screens (Account / Collection). */
export function TopBar({ onBrand, username, level, avatarUrl, avatarColor }: TopBarProps) {
  const { t } = useLang()
  const initial = username.charAt(0).toUpperCase() || '?'
  return (
    <div className="topbar">
      <button className="brand-min" type="button" onClick={onBrand} title={t('account.backToMenu')}>
        <Icon name="back" size={18} />
        <span className="dot" />
        {t('common.appName')}
      </button>
      <div className="spacer" />
      <div className="acct-chip">
        <Avatar url={avatarUrl} letter={initial} color={avatarColor} />
        <div>
          <div className="nm">{username}</div>
          <div className="lv">{t('account.level', { n: level })}</div>
        </div>
      </div>
    </div>
  )
}
