import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './ui/i18n'
import { AuthProvider } from './auth/AuthProvider'
import { AccountProvider } from './account/AccountProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <AuthProvider>
        <AccountProvider>
          <App />
        </AccountProvider>
      </AuthProvider>
    </LanguageProvider>
  </StrictMode>,
)
