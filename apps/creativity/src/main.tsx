import { createRoot } from 'react-dom/client'
import '@uhyc/shared/styles/tokens.css'
import '@uhyc/shared/styles/ui.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
