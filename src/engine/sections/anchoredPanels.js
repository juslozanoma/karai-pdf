// ===============================================================================================
// SECCIÓN: Paneles anclados (atajos/ayuda) a sus botones
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';

export function openAnchoredPanel(panel, anchorBtn, maxWidth, useFlex) {
  const btnRect = anchorBtn.getBoundingClientRect();
  const gap = 12; // espacio entre botón y panel
  const margin = 8; // margen mínimo de pantalla

  const availableWidth = btnRect.left - gap - margin;
  const panelWidth = Math.min(maxWidth, availableWidth, window.innerWidth * 0.95);

  let leftPos = btnRect.left - panelWidth - gap;
  if (leftPos < margin) leftPos = btnRect.right + gap; // si no cabe a la izquierda, abre a la derecha

  panel.style.visibility = 'hidden';
  panel.style.display = 'block';
  const panelHeight = Math.min(panel.scrollHeight, window.innerHeight * 0.8);
  panel.style.display = '';
  panel.style.visibility = '';

  let topPos = btnRect.top + btnRect.height / 2 - panelHeight / 2;
  if (topPos < margin) topPos = margin;
  if (topPos + panelHeight > window.innerHeight - margin)
    topPos = window.innerHeight - panelHeight - margin;

  panel.style.left = leftPos + 'px';
  panel.style.top = topPos + 'px';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
  panel.style.width = panelWidth + 'px';

  panel.classList.toggle('hidden');
  if (useFlex) {
    if (!panel.classList.contains('hidden')) panel.classList.add('flex');
    else panel.classList.remove('flex');
  }
}

export function openShortcutsPanel(anchorBtn) {
  // shortcuts-panel apila su cabecera y su grid en flujo de bloque normal (no necesita flex)
  openAnchoredPanel(document.getElementById('shortcuts-panel'), anchorBtn, 500, false);
}
