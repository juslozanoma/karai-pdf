// ===============================================================================================
// SECCIÓN: Redimensión del panel lateral de chat + nav responsive
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initChatPanelResizeSection() {
  state.chatResizer.addEventListener('mousedown', (e) => {
    state.isResizingChat = true;
    state.chatPanel.classList.remove('transition-all', 'duration-300');
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!state.isResizingChat) return;
    const newWidth = e.clientX;
    if (newWidth >= 280 && newWidth <= window.innerWidth * 0.8) {
      state.chatPanel.style.width = `${newWidth}px`;
    }
  });
  document.addEventListener('mouseup', () => {
    if (state.isResizingChat) {
      state.isResizingChat = false;
      state.chatPanel.classList.add('transition-all', 'duration-300');
      document.body.style.cursor = '';
    }
  });
}
