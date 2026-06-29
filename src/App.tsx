import { useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import './App.css'
import './ui/tokens/index.css'
import { MainMenu } from './ui/organisms/MainMenu'
import { PlaceholderScreen } from './ui/organisms/PlaceholderScreen'
import { Splash } from './ui/screens/Splash'
import { Register } from './ui/screens/Register'
import { Account } from './ui/screens/Account'
import { Collection } from './ui/screens/Collection'
import { Quickplay } from './ui/screens/Quickplay'
import { Arcade } from './ui/screens/Arcade'
import { HowToPlay } from './ui/screens/HowToPlay'
import { LevelUpHost } from './ui/organisms/LevelUp'
import { useLang } from './ui/i18n'
import { useAuth } from './auth/AuthProvider'
import { useAccount } from './account/AccountProvider'

const DesignSystemGallery = lazy(() =>
  import('./ui/gallery/DesignSystemGallery').then((m) => ({
    default: m.DesignSystemGallery,
  }))
)

function isGalleryRoute(): boolean {
  return (
    window.location.hash === '#ds' ||
    new URLSearchParams(window.location.search).has('ds')
  )
}

type Screen =
  | 'splash'
  | 'menu'
  | 'quickplay'
  | 'arcade'
  | 'account'
  | 'collection'
  | 'multiplayer'
  | 'howToPlay'

function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const { t } = useLang()
  const { status: authStatus, signOut } = useAuth()
  const { status: profileStatus } = useAccount()

  if (isGalleryRoute()) {
    return (
      <Suspense fallback={<div style={{ color: '#fff', padding: 40 }}>Loading gallery…</div>}>
        <DesignSystemGallery />
      </Suspense>
    )
  }

  // First login with no profile yet → must choose a username before anything else.
  if (authStatus === 'authed' && profileStatus === 'none') {
    return (
      <Register
        onDone={() => setScreen('account')}
        onBack={() => {
          signOut()
          setScreen('menu')
        }}
      />
    )
  }

  let screenEl: ReactNode
  // Hold level-up moments until the player has left the match (don't interrupt the result flow).
  let inMatch = false

  if (screen === 'splash') {
    screenEl = <Splash onEnter={() => setScreen('menu')} />
  } else if (screen === 'menu') {
    screenEl = (
      <MainMenu
        onQuickplay={() => setScreen('quickplay')}
        onArcade={() => setScreen('arcade')}
        onAccount={() => setScreen('account')}
        onMultiplayer={() => setScreen('multiplayer')}
        onHowToPlay={() => setScreen('howToPlay')}
      />
    )
  } else if (screen === 'quickplay') {
    screenEl = <Quickplay onBack={() => setScreen('menu')} />
    inMatch = true
  } else if (screen === 'arcade') {
    screenEl = <Arcade onHome={() => setScreen('menu')} />
    inMatch = true
  } else if (screen === 'account') {
    screenEl = <Account onHome={() => setScreen('menu')} onCollection={() => setScreen('collection')} />
  } else if (screen === 'collection') {
    screenEl = <Collection onHome={() => setScreen('menu')} onBack={() => setScreen('account')} />
  } else if (screen === 'multiplayer') {
    screenEl = (
      <PlaceholderScreen
        title={t('meta.multiplayer')}
        note={t('meta.multiplayerSoon')}
        onBack={() => setScreen('menu')}
      />
    )
  } else {
    screenEl = <HowToPlay onBack={() => setScreen('menu')} />
  }

  // Level-up moments surface only on calm screens (menu/account/…), never over a live match or splash.
  const showLevelUp = !inMatch && screen !== 'splash'

  return (
    <>
      {screenEl}
      {showLevelUp && <LevelUpHost />}
    </>
  )
}

export default App
