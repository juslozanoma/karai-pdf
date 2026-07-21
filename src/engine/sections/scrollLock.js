// ===============================================================================================
// SECCIÓN: Bloqueo de scroll en modo rastreador
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';

export function lockDocumentScroll() {
  state.inspectScrollY = window.scrollY || window.pageYOffset || 0;
  document.body.classList.add('inspect-mode-active');
  // En iOS, position:fixed quita el scroll; lo restauramos al salir
  document.body.style.top = `-${state.inspectScrollY}px`;
}

export function unlockDocumentScroll() {
  document.body.classList.remove('inspect-mode-active');
  document.body.style.top = '';
  // Restaurar posición exacta de scroll (crítico en iOS)
  window.scrollTo(0, state.inspectScrollY);
}

export function preventScrollEvent(e) {
  if (!state.isInspectMode) return;
  if (e.type === 'wheel') {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
  if (
    e.type === 'keydown' &&
    ['Space', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)
  ) {
    e.preventDefault();
    return false;
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initScrollLockSection() {
  document.addEventListener('wheel', preventScrollEvent, { passive: false });
  document.addEventListener('keydown', preventScrollEvent);
}
