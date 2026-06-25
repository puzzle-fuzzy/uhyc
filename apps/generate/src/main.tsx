import '@uhyc/shared/styles/tokens.css'
import '@uhyc/shared/styles/ui.css'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <App />,
)
