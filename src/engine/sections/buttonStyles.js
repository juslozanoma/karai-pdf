// ===============================================================================================
// SECCIÓN: Estilos centralizados de botones activos/inactivos
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';

export function applyActiveStyle(btnId, isActive) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  // Removemos todas las clases relacionadas a estados y colores del botón
  btn.classList.remove(
    'text-gray-400',
    'bg-transparent',
    'bg-[#F1EEFF]',
    'text-[#7C3AED]',
    'hover:bg-[#F8F7FF]',
    'bg-[#F8F7FF]',
    'hover:bg-white',
    'bg-white',
    'bg-[#EDE9FE]',
    'bg-indigo-100',
    'text-indigo-600',
    'hover:bg-indigo-50',
  );

  if (isActive) {
    btn.classList.add('bg-[#F1EEFF]', 'text-[#7C3AED]', 'hover:bg-[#F8F7FF]');
  } else {
    btn.classList.add('text-gray-400', 'bg-transparent', 'hover:bg-[#F8F7FF]');
  }
}

export function applyTranslateButtonStyle(btnId, isActive) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  btn.classList.remove(
    'text-gray-400',
    'bg-transparent',
    'bg-[#F1EEFF]',
    'text-[#7C3AED]',
    'hover:bg-[#F8F7FF]',
    'bg-[#F8F7FF]',
    'hover:bg-white',
    'bg-white',
    'bg-[#EDE9FE]',
    'bg-indigo-100',
    'text-indigo-600',
    'hover:bg-indigo-50',
  );

  if (isActive) {
    btn.classList.add('bg-[#F1EEFF]', 'text-[#7C3AED]', 'hover:bg-[#F8F7FF]');
  } else {
    btn.classList.add('text-gray-400', 'bg-transparent', 'hover:bg-[#F8F7FF]');
  }
}

export function updateMenuButtonState() {
  applyActiveStyle('btn-toc', !document.getElementById('toc-panel').classList.contains('hidden'));
  applyActiveStyle(
    'btn-figures-index',
    !document.getElementById('figures-panel').classList.contains('hidden'),
  );
  applyActiveStyle(
    'btn-margins',
    !document.getElementById('margins-panel').classList.contains('hidden'),
  );
  applyActiveStyle(
    'btn-mobile-lang-menu',
    !document.getElementById('mobile-lang-panel').classList.contains('hidden'),
  );

  applyActiveStyle(
    'btn-toc-mobile',
    !document.getElementById('toc-panel').classList.contains('hidden'),
  );
  applyActiveStyle(
    'btn-figures-index-mobile',
    !document.getElementById('figures-panel').classList.contains('hidden'),
  );
  applyActiveStyle(
    'btn-margins-mobile',
    !document.getElementById('margins-panel').classList.contains('hidden'),
  );

  const voiceOpen = !document.getElementById('voice-dropdown-menu').classList.contains('hidden');
  applyActiveStyle('voice-selector-wrapper', voiceOpen);

  const chatOpen = !document.getElementById('chat-panel').classList.contains('hidden');
  document.getElementById('btn-toggle-chat').classList.toggle('bg-[#F8F7FF]', chatOpen);
  document.getElementById('btn-toggle-chat').classList.toggle('text-[#7C3AED]', chatOpen);
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initButtonStylesSection() {
  if (state.leftWrapper) state.navResizeObserver.observe(state.leftWrapper);
  if (state.rightWrapper) state.navResizeObserver.observe(state.rightWrapper);
}
