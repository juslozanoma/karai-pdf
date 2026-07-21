// ===============================================================================================
// LIBRERÍAS GLOBALES (pdf.js, mammoth, lucide)
// -----------------------------------------------------------------------------------------------
// El motor (src/engine/**) referencia `pdfjsLib`, `mammoth` y `lucide` como variables globales,
// tal como quedaban disponibles al cargarlas con <script> clásico desde un CDN. Para no depender
// de servicios externos en producción (cdnjs/unpkg bloqueados por "Tracking Prevention" del
// navegador, y frágiles ante caídas o cambios de versión), estas librerías se instalan como
// dependencias npm normales y quedan empaquetadas dentro del propio build.
//
// Este módulo las inicializa UNA sola vez y las publica en `window` con el MISMO nombre y forma
// de uso que tenían por CDN (pdfjsLib.getDocument(...), mammoth.convertToHtml(...),
// lucide.createIcons()), así el resto del motor no necesita cambiar ni una línea.
//
// Debe importarse ANTES que cualquier otro módulo del motor (se hace desde main.jsx, antes de
// montar <App />) para garantizar que estos globales ya existan cuando initReaderEngine() corra.
// NOTA sobre `legacy/build/pdf.mjs`: el build "normal" de pdfjs-dist usa
// `Uint8Array.prototype.toHex()`/`toBase64()`, métodos de JavaScript agregados a los navegadores
// recién en 2025. En cualquier navegador que aún no los soporte, pdf.js truena de forma dura con
// "hashOriginal.toHex is not a function" al intentar abrir CUALQUIER PDF (bug confirmado y activo
// en el repo oficial de Mozilla: mozilla/pdf.js#20759). El build `legacy/` incluye un polyfill
// propio para esos métodos, evitando el problema sin sacrificar nada del resto de la API.
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
// El sufijo `?url` le pide a Vite que, en vez de intentar empaquetar el worker como módulo, lo
// copie a /assets y nos devuelva su ruta final (con el hash y el `base` del sitio ya resueltos).
// Así el worker se sirve desde el mismo dominio de GitHub Pages, sin CORS ni URLs externas.
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import * as mammoth from 'mammoth';
import { createIcons, icons } from 'lucide';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

window.pdfjsLib = pdfjsLib;
window.mammoth = mammoth;
// El paquete "lucide" (a diferencia del build UMD por CDN) requiere pasar explícitamente el
// mapa de iconos en cada llamada; este wrapper conserva la firma `lucide.createIcons()` sin
// argumentos que usa el resto del motor.
window.lucide = {
  createIcons: (options) => createIcons({ icons, ...options }),
};
