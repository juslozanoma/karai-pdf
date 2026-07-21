// ===============================================================================================
// SECCIÓN: Redimensión de la caja de subtítulos
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { applyActiveStyle } from './buttonStyles.js';
import { toggleFixedMenu } from './floatingMenus.js';

export function updateSubtitleViewportClamp() {
  const barContentHeight = state.transcriptionBar.clientHeight; // ya sin padding, vive en el viewport
  const fontSizePx = parseFloat(getComputedStyle(state.transcriptionText).fontSize) || 19;
  const lineHeight = fontSizePx * 1.35;
  const verticalPadding = 32; // py-4 del viewport (16px arriba + 16px abajo)
  const available = Math.max(lineHeight, barContentHeight - verticalPadding);
  const linesPerBox = Math.max(1, Math.floor(available / lineHeight));
  state.transcriptionViewport.style.maxHeight = `${linesPerBox * lineHeight + verticalPadding}px`;
}

export function applySubtitleHeight(newHeight) {
  newHeight = Math.max(state.SUBTITLE_MIN_HEIGHT, Math.min(state.SUBTITLE_MAX_HEIGHT, newHeight));
  state.transcriptionBar.style.height = `${newHeight}px`;
  // La altura de la caja y el tamaño de letra son controles independientes: arrastrar
  // el borde de la caja solo cambia cuánto espacio ocupa, no la letra (esa se controla
  // aparte con el slider de Ajustes). Como el texto ahora se recorta a las líneas que
  // caben (ver scrollSubtitleToWord), cambiar solo la altura sigue siendo consistente.
  updateSubtitleViewportClamp();
}

export function startSubtitleResize(clientY) {
  state.isResizingSubtitles = true;
  state.subtitleResizeStartY = clientY;
  state.subtitleResizeStartHeight = state.transcriptionBar.getBoundingClientRect().height;
  state.transcriptionBar.classList.remove('transition-all', 'duration-300');
  document.body.style.cursor = 'row-resize';
}

export function moveSubtitleResize(clientY) {
  if (!state.isResizingSubtitles) return;
  // El manejador está en el borde SUPERIOR: arrastrar hacia arriba (clientY menor)
  // debe AGRANDAR la caja; arrastrar hacia abajo debe achicarla.
  const deltaY = state.subtitleResizeStartY - clientY;
  applySubtitleHeight(state.subtitleResizeStartHeight + deltaY);
}

export function endSubtitleResize() {
  if (!state.isResizingSubtitles) return;
  state.isResizingSubtitles = false;
  state.transcriptionBar.classList.add('transition-all', 'duration-300');
  document.body.style.cursor = '';
}

export function updateSubtitlesUI() {
  applyActiveStyle('btn-subtitles-wrapper', state.isTranscriptionEnabled);

  // Mobile - mismo estilo redondo
  const btnSMob = document.getElementById('btn-subtitles-mobile');
  if (btnSMob) {
    btnSMob.classList.remove(
      'bg-[#F1EEFF]',
      'text-[#6D28D9]',
      'bg-gray-50',
      'text-gray-400',
      'bg-transparent',
    );

    if (state.isTranscriptionEnabled) {
      btnSMob.classList.add('bg-[#F1EEFF]', 'text-[#6D28D9]');
    } else {
      btnSMob.classList.add(
        'text-gray-400',
        'bg-transparent',
        'hover:bg-[#F8F7FF]',
        'hover:text-[#7C3AED]',
      );
    }
  }
  updateTranscriptionVisibility();
}

export function updateTranscriptionVisibility() {
  if (state.isTranscriptionEnabled && state.isPlaying) {
    state.transcriptionBar.classList.remove('hidden');
    state.transcriptionBar.classList.add('flex');
    requestAnimationFrame(updateSubtitleViewportClamp);
  } else {
    state.transcriptionBar.classList.add('hidden');
    state.transcriptionBar.classList.remove('flex');
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initSubtitleResizeSection() {
  state.transcriptionBar.style.height = state.transcriptionBar.style.height || '60px';
  window.addEventListener('resize', updateSubtitleViewportClamp);
  state.subtitleResizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startSubtitleResize(e.clientY);
  });
  document.addEventListener('mousemove', (e) => moveSubtitleResize(e.clientY));
  document.addEventListener('mouseup', endSubtitleResize);
  state.subtitleResizer.addEventListener(
    'touchstart',
    (e) => {
      startSubtitleResize(e.touches[0].clientY);
    },
    { passive: true },
  );
  document.addEventListener(
    'touchmove',
    (e) => {
      if (state.isResizingSubtitles) moveSubtitleResize(e.touches[0].clientY);
    },
    { passive: true },
  );
  document.addEventListener('touchend', endSubtitleResize);
  document.getElementById('btn-subtitles-wrapper').addEventListener('click', () => {
    state.isTranscriptionEnabled = !state.isTranscriptionEnabled;
    updateSubtitlesUI();
  });
  document.getElementById('btn-subtitles-mobile').addEventListener('click', () => {
    state.isTranscriptionEnabled = !state.isTranscriptionEnabled;
    updateSubtitlesUI();
  });
  document.getElementById('btn-close-subtitles').addEventListener('click', (e) => {
    e.stopPropagation();
    state.isTranscriptionEnabled = false;
    updateSubtitlesUI();
  });
  document.getElementById('btn-subtitles-open-options').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('btn-mobile-lang-menu').click();
  });
  document.getElementById('btn-mobile-lang-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFixedMenu('btn-mobile-lang-menu', 'mobile-lang-panel');
  });
}
