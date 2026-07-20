/* Main entry point for the application - renders the root React component */
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './main.css'

// Mostra no console quando este código foi gerado. Se a data estiver velha,
// o navegador está com bundle antigo (servidor de dev parado no tempo/cache).
declare const __BUILD_TIME__: string
console.info(
  `%c Feedback Inteligente %c build de ${new Date(__BUILD_TIME__).toLocaleString('pt-BR')} `,
  'background:#1D4ED8;color:#fff;border-radius:3px 0 0 3px;padding:2px 4px',
  'background:#e2e8f0;color:#0f172a;border-radius:0 3px 3px 0;padding:2px 4px',
)

// @skip-protected: Do not remove. Required for React rendering.
createRoot(document.getElementById('root')!).render(<App />)
