// ===============================================================================================
// SECCIÓN: Botones de traducir y subtítulos
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { applyTranslateButtonStyle } from './buttonStyles.js';

export function updateTranslateUI() {
  applyTranslateButtonStyle('btn-translate-wrapper', state.isTranslatingEnabled);

  const btnTMob = document.getElementById('btn-translate-mobile');
  if (btnTMob) {
    btnTMob.classList.remove(
      'bg-[#F1EEFF]',
      'text-[#7C3AED]',
      'bg-gray-50',
      'text-gray-400',
      'bg-transparent',
      'bg-indigo-100',
      'text-indigo-600',
      'hover:bg-indigo-50',
    );

    if (state.isTranslatingEnabled) {
      btnTMob.classList.add('bg-[#F1EEFF]', 'text-[#7C3AED]');
    } else {
      btnTMob.classList.add(
        'text-gray-400',
        'bg-transparent',
        'hover:bg-[#F8F7FF]',
        'hover:text-[#7C3AED]',
      );
    }
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initTranslateSubtitlesButtonsSection() {
  updateTranslateUI();
  document.getElementById('btn-translate-wrapper').addEventListener('click', () => {
    state.isTranslatingEnabled = !state.isTranslatingEnabled;
    state.translationPromises = {};
    updateTranslateUI();
  });
  document.getElementById('btn-translate-mobile').addEventListener('click', () => {
    state.isTranslatingEnabled = !state.isTranslatingEnabled;
    state.translationPromises = {};
    updateTranslateUI();
  });
}
