import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Analytics } from '@vercel/analytics/react' // Vite/React version (the "/next" one is for Next.js)
import App from './App.tsx'
import { applyTheme } from './lib/theme'

applyTheme() // before the first render, so the page never flashes the wrong colours

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Counts visitors and page views for the Vercel dashboard. Draws nothing on screen, and
        only sends data on the deployed site — not while running npm run dev. */}
    <Analytics />
  </StrictMode>,
)
