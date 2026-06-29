import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../../i18n'
import { useAuth } from '../../../auth/AuthProvider'
import { useAccount } from '../../../account/AccountProvider'
import { usernameAvailable } from '../../../data/user/profile.repo'

interface RegisterProps {
  /** Called after the account is created (profile + welcome bundle seeded). */
  onDone: () => void
  /** Cancel registration (signs out and returns to the menu). */
  onBack: () => void
}

const USERNAME_RE = /^[a-zA-Z0-9_]{3,16}$/

/**
 * First-run username registration (WCC-048). Live availability check, suggestions, and
 * on submit calls `register()` → `register_account` RPC (creates the profile and seeds
 * the 4 welcome boxes).
 */
export function Register({ onDone, onBack }: RegisterProps) {
  const { t } = useLang()
  const { user } = useAuth()
  const { register } = useAccount()

  const [val, setVal] = useState('')
  // Availability result for a specific name; setState happens only in async callbacks.
  const [result, setResult] = useState<{ name: string; available: boolean | null } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const clean = val.trim()
  const formatValid = USERNAME_RE.test(clean)

  const seedBase = useMemo(() => {
    const first = (user?.displayName ?? 'manager').split(' ')[0].toLowerCase()
    return first.replace(/[^a-z0-9_]/g, '') || 'manager'
  }, [user?.displayName])

  const suggestions = useMemo(
    () => [`${seedBase}10`, `${seedBase}_wc`, `gaffer_${seedBase}`, `${seedBase}26`],
    [seedBase],
  )

  // Debounced availability check — only schedules work; setState lives in the callbacks.
  useEffect(() => {
    if (!formatValid) return
    let active = true
    const id = setTimeout(() => {
      usernameAvailable(clean)
        .then((avail) => {
          if (active) setResult({ name: clean, available: avail })
        })
        .catch(() => {
          if (active) setResult({ name: clean, available: null })
        })
    }, 350)
    return () => {
      active = false
      clearTimeout(id)
    }
  }, [clean, formatValid])

  const available = formatValid && result?.name === clean ? result.available : null
  const checking = formatValid && result?.name !== clean
  const ok = formatValid && available === true && !submitting

  let hint = t('register.hintDefault')
  let hintCls = ''
  if (clean.length > 0 && !formatValid) {
    hint = t('register.hintFormat')
    hintCls = 'bad'
  } else if (formatValid && checking) {
    hint = t('register.checking')
  } else if (formatValid && available === false) {
    hint = t('register.taken')
    hintCls = 'bad'
  } else if (ok) {
    hint = t('register.ok')
    hintCls = 'ok'
  }

  const submit = async () => {
    if (!ok) return
    setSubmitting(true)
    try {
      await register(clean)
      onDone()
    } catch {
      setResult({ name: clean, available: false })
      setSubmitting(false)
    }
  }

  return (
    <div className="reg">
      <div className="stadium-bg" />
      <div className="reg-card">
        <div className="step">{t('register.step')}</div>
        <h2>{t('register.title')}</h2>
        <p className="lede">{t('register.lede')}</p>

        <div>
          <label>{t('register.usernameLabel')}</label>
          <div className="uinput" style={{ marginTop: 8 }}>
            <span className="at">@</span>
            <input
              autoFocus
              value={val}
              maxLength={16}
              placeholder={t('register.placeholder')}
              onChange={(e) => setVal(e.target.value.replace(/\s/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && ok) void submit()
              }}
            />
          </div>
          <div className={`uhint ${hintCls}`} style={{ marginTop: 8 }}>
            {hint}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 8 }}>{t('register.suggestions')}</label>
          <div className="usuggest">
            {suggestions.map((s) => (
              <button key={s} className="chip" type="button" onClick={() => setVal(s)}>
                @{s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            {t('register.back')}
          </button>
          <button
            className="btn btn-gold"
            type="button"
            style={{ flex: 1, opacity: ok ? 1 : 0.4, pointerEvents: ok ? 'auto' : 'none' }}
            onClick={submit}
          >
            {submitting ? t('register.creating') : t('register.create')}
          </button>
        </div>
      </div>
    </div>
  )
}
