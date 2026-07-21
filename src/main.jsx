import { createRoot } from 'react-dom/client'
import './engine/globalLibs.js'
import './index.css'
import App from './App.jsx'

// Nota: se omite <StrictMode> a propósito. El "engine" portado es un script imperativo
// (addEventListener, WebSocket, speechSynthesis, etc.) pensado para ejecutarse UNA sola vez,
// igual que el <script> original al final del <body>. El doble montaje/efecto que StrictMode
// fuerza en desarrollo duplicaría listeners y conexiones, así que se mantiene desactivado.
createRoot(document.getElementById('root')).render(<App />)
