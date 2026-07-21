// ===============================================================================================
// SECCIÓN: Zoom con pinch (gesto de dos dedos)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { initInterfaceLanguage } from './i18nRuntime.js';
import { commitZoom, zoomAtPoint } from './zoom.js';

export function getPinchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getPinchMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initPinchZoomSection() {
  state.docContainer.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2 && state.documentObj && !state.documentObj.isDocx) {
        state.isPinching = true;
        state.pinchStartDistance = getPinchDistance(e.touches);
        state.pinchStartScale = state.pendingScale;
        if (state.zoomCommitTimer) {
          clearTimeout(state.zoomCommitTimer);
          state.zoomCommitTimer = null;
        }
        const mid = getPinchMidpoint(e.touches);
        state.pinchLastMidX = mid.x;
        state.pinchLastMidY = mid.y;
        e.preventDefault();
      }
    },
    { passive: false },
  );
  state.docContainer.addEventListener(
    'touchmove',
    (e) => {
      if (state.isPinching && e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = getPinchDistance(e.touches);
        const scaleRatio = currentDistance / state.pinchStartDistance;
        const mid = getPinchMidpoint(e.touches);
        state.pinchLastMidX = mid.x;
        state.pinchLastMidY = mid.y;
        // Misma función que gobierna el resto del zoom: redimensiona al instante y ancla
        // matemáticamente el punto medio del pellizco, sin transform CSS y sin parpadeo.
        zoomAtPoint(state.pinchStartScale * scaleRatio, state.pinchLastMidX, state.pinchLastMidY);
      }
    },
    { passive: false },
  );
  state.docContainer.addEventListener('touchend', (e) => {
    if (state.isPinching && e.touches.length < 2) {
      state.isPinching = false;
      state.pinchStartDistance = 0;
      // Forzamos que el refresco nítido (ya programado por zoomAtPoint) ocurra de inmediato
      // al soltar los dedos, en vez de esperar el resto del debounce.
      if (state.zoomCommitTimer) {
        clearTimeout(state.zoomCommitTimer);
        state.zoomCommitTimer = null;
      }
      commitZoom();
    }
  });
  state.docContainer.addEventListener('touchcancel', () => {
    state.isPinching = false;
    state.pinchStartDistance = 0;
  });
  initInterfaceLanguage();
}
