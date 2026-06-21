import { useState, lazy, Suspense } from 'react'
import './App.css'
import './ui/tokens/index.css'
import { MainMenu } from './ui/organisms/MainMenu'
import { PlaceholderScreen } from './ui/organisms/PlaceholderScreen'
import { Quickplay } from './ui/screens/Quickplay'
import { Arcade } from './ui/screens/Arcade'
import { HowToPlay } from './ui/screens/HowToPlay'

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

type Screen = 'menu' | 'quickplay' | 'arcade' | 'collection' | 'howToPlay'

function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  if (isGalleryRoute()) {
    return (
      <Suspense fallback={<div style={{ color: '#fff', padding: 40 }}>Loading gallery…</div>}>
        <DesignSystemGallery />
      </Suspense>
    )
  }

  if (screen === 'menu') {
    return (
      <MainMenu
        onQuickplay={() => setScreen('quickplay')}
        onArcade={() => setScreen('arcade')}
        onCollection={() => setScreen('collection')}
        onHowToPlay={() => setScreen('howToPlay')}
      />
    )
  }

  if (screen === 'quickplay') {
    return (
      <Quickplay onBack={() => setScreen('menu')} />
    )
  }

  if (screen === 'arcade') {
    return (
      <Arcade onHome={() => setScreen('menu')} />
    )
  }

  if (screen === 'collection') {
    return (
      <PlaceholderScreen
        title="Collection"
        note="Card collection coming soon"
        onBack={() => setScreen('menu')}
      />
    )
  }

  return <HowToPlay onBack={() => setScreen('menu')} />
}

export default App
