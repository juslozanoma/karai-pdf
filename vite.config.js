import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Karai (lector PDF/DOCX con IA) - configuración de Vite.
// pdf.js, mammoth.js y lucide van empaquetados como dependencias npm (ver
// src/engine/globalLibs.js), no por CDN, para que el build sea autosuficiente en GitHub Pages.
export default defineConfig({
  plugins: [react()],
  base: '/karai-pdf/',
});
