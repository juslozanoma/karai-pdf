// ===============================================================================================
// SECCIÓN: Configuración global de pdf.js y declaración de estado inicial
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { unlockDocumentScroll } from './scrollLock.js';

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initGlobalConfigSection() {
  unlockDocumentScroll();
}
