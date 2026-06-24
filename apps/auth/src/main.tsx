import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@uhyc/shared/styles/tokens.css'
import '@uhyc/shared/styles/ui.css'
import './app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
