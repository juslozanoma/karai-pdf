// ===============================================================================================
// SECCIÓN: Modo rastreador de imágenes/área (Visual RAG)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { applyActiveStyle } from './buttonStyles.js';
import { processChatQueryStreaming, processChatQueryWithImage } from './chat.js';
import { unlockDocumentScroll } from './scrollLock.js';
import { showStatus } from './subtitleHighlight.js';

export function handleInspectSelectionEnd() {
  const width = parseFloat(state.inspectSelectionBox.style.width);
  const height = parseFloat(state.inspectSelectionBox.style.height);

  if (width > 20 && height > 20) {
    const selRect = state.inspectSelectionBox.getBoundingClientRect();
    const canvases = state.docContainer.querySelectorAll('canvas');
    let targetCanvas = null;
    let targetRect = null;

    for (let c of canvases) {
      let cRect = c.getBoundingClientRect();
      if (!(
        selRect.right < cRect.left ||
        selRect.left > cRect.right ||
        selRect.bottom < cRect.top ||
        selRect.top > cRect.bottom
      )) {
        targetCanvas = c;
        targetRect = cRect;
        break;
      }
    }

    if (targetCanvas) {
      const cropX = Math.max(0, selRect.left - targetRect.left);
      const cropY = Math.max(0, selRect.top - targetRect.top);
      const cropW = Math.min(targetRect.width - cropX, selRect.width);
      const cropH = Math.min(targetRect.height - cropY, selRect.height);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropW;
      tempCanvas.height = cropH;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(targetCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      const base64Img = tempCanvas.toDataURL('image/jpeg', 0.9);
      state.btnChatInspect.click(); // Apaga modo rastreador
      if (state.chatPanel.classList.contains('hidden'))
        document.getElementById('btn-toggle-chat').click();

      if (state.autoTrackSendEnabled) {
        // Envío automático (comportamiento por defecto): se manda de una vez, sin
        // esperar a que el usuario escriba nada.
        processChatQueryWithImage(base64Img, '');
      } else {
        // Colocar en espera visualmente (Staging) para que el usuario escriba su pregunta
        state.pendingImageBase64 = base64Img;
        state.imgPreviewImg.src = base64Img;
        state.imgPreviewContainer.classList.remove('hidden');
        state.aiInput.placeholder = 'Escribe qué deseas analizar de esta imagen...';
        state.aiInput.focus();
      }
    } else if (state.documentObj && state.documentObj.isDocx) {
      // Fallback para DOCX
      const selection = window.getSelection().toString();
      if (selection.trim()) {
        state.btnChatInspect.click();
        if (state.chatPanel.classList.contains('hidden'))
          document.getElementById('btn-toggle-chat').click();

        const selectionPrompt = `Análisis de texto seleccionado:\n"${selection}"\n\n`;
        if (state.autoTrackSendEnabled) {
          processChatQueryStreaming(selectionPrompt);
        } else {
          document.getElementById('ai-input').value = selectionPrompt;
          document.getElementById('ai-input').focus();
        }
      } else {
        showStatus('Área vacía o inválida.', true);
        setTimeout(() => showStatus('', false), 2000);
        state.btnChatInspect.click();
      }
    }
  } else {
    state.btnChatInspect.click(); // Cancela si hizo clic suelto
  }
  state.inspectSelectionBox.classList.add('hidden');
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initImageTrackerModeSection() {
  state.inspectSelectionBox.className =
    'absolute border-2 border-[#8B5CF6] bg-[#8B5CF6]/20 z-50 pointer-events-none hidden';
  state.docContainer.appendChild(state.inspectSelectionBox);
  state.btnChatInspect.addEventListener('click', () => {
    state.isInspectMode = !state.isInspectMode;
    applyActiveStyle('btn-tracker-mode', state.isInspectMode);
    if (state.isInspectMode) {
      state.btnChatInspect.classList.remove('text-gray-400');
      state.btnChatInspect.classList.add('text-[#7C3AED]');
      showStatus('Modo Rastreador: Selecciona un área del documento', true);
      state.docContainer.classList.add('inspect-mode-active');
      // Ocultar panel de chat si está abierto para permitir selección en el documento
      if (!state.chatPanel.classList.contains('hidden')) {
        state.chatPanel.classList.add('hidden');
        state.chatPanel.classList.remove('flex');
        state.btnToggleChat.classList.remove('bg-[#7C3AED]', 'text-white');
      }
    } else {
      state.btnChatInspect.classList.add('text-gray-400');
      state.btnChatInspect.classList.remove('text-[#7C3AED]');
      showStatus('', false);
      state.docContainer.classList.remove('inspect-mode-active');
      state.inspectSelectionBox.classList.add('hidden');
      state.isSelectingArea = false;
      unlockDocumentScroll();
    }
  });
  // Botón gemelo en la barra inferior: delega al mismo botón/lógica de siempre (igual que el
  // resto de la app hace con pares de botones desktop/mobile) para no duplicar el estado.
  state.btnTrackerMode.addEventListener('click', () => state.btnChatInspect.click());
  state.docContainer.addEventListener('mousedown', (e) => {
    if (!state.isInspectMode || e.target.closest('button') || e.target.closest('#chat-panel'))
      return;
    e.preventDefault();
    state.isSelectingArea = true;
    const rect = state.docContainer.getBoundingClientRect();
    // Las coordenadas son relativas al borde izquierdo y superior del docContainer
    state.inspectStartX = e.clientX - rect.left;
    state.inspectStartY = e.clientY - rect.top;

    state.inspectSelectionBox.style.left = state.inspectStartX + 'px';
    state.inspectSelectionBox.style.top = state.inspectStartY + 'px';
    state.inspectSelectionBox.style.width = '0px';
    state.inspectSelectionBox.style.height = '0px';
    state.inspectSelectionBox.classList.remove('hidden');
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isSelectingArea || !state.isInspectMode) return;
    const rect = state.docContainer.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = Math.abs(currentX - state.inspectStartX);
    const height = Math.abs(currentY - state.inspectStartY);

    state.inspectSelectionBox.style.left = Math.min(state.inspectStartX, currentX) + 'px';
    state.inspectSelectionBox.style.top = Math.min(state.inspectStartY, currentY) + 'px';
    state.inspectSelectionBox.style.width = width + 'px';
    state.inspectSelectionBox.style.height = height + 'px';
  });
  window.addEventListener('mouseup', (e) => {
    if (!state.isSelectingArea || !state.isInspectMode) return;
    state.isSelectingArea = false;
    handleInspectSelectionEnd();
  });
  state.docContainer.addEventListener(
    'touchstart',
    (e) => {
      if (!state.isInspectMode || e.target.closest('button') || e.target.closest('#chat-panel'))
        return;
      e.preventDefault();
      state.isSelectingArea = true;
      const rect = state.docContainer.getBoundingClientRect();
      const touch = e.touches[0];
      state.inspectStartX = touch.clientX - rect.left;
      state.inspectStartY = touch.clientY - rect.top;
      state.inspectSelectionBox.style.left = state.inspectStartX + 'px';
      state.inspectSelectionBox.style.top = state.inspectStartY + 'px';
      state.inspectSelectionBox.style.width = '0px';
      state.inspectSelectionBox.style.height = '0px';
      state.inspectSelectionBox.classList.remove('hidden');
    },
    { passive: false },
  );
  window.addEventListener(
    'touchmove',
    (e) => {
      if (!state.isSelectingArea || !state.isInspectMode) return;
      e.preventDefault();
      const rect = state.docContainer.getBoundingClientRect();
      const touch = e.touches[0];
      const currentX = touch.clientX - rect.left;
      const currentY = touch.clientY - rect.top;
      const width = Math.abs(currentX - state.inspectStartX);
      const height = Math.abs(currentY - state.inspectStartY);
      state.inspectSelectionBox.style.left = Math.min(state.inspectStartX, currentX) + 'px';
      state.inspectSelectionBox.style.top = Math.min(state.inspectStartY, currentY) + 'px';
      state.inspectSelectionBox.style.width = width + 'px';
      state.inspectSelectionBox.style.height = height + 'px';
    },
    { passive: false },
  );
  window.addEventListener('touchend', (e) => {
    if (!state.isSelectingArea || !state.isInspectMode) return;
    state.isSelectingArea = false;
    handleInspectSelectionEnd();
  });
}
