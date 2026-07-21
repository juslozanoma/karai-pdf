// ===============================================================================================
// SECCIÓN: Eventos y atajos de teclado + barra de atajos
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { openShortcutsPanel } from './anchoredPanels.js';
import { renderDynamicIndex } from './customScrollbar.js';
import { openHelpPanel, toggleFullscreen } from './helpPanelData.js';
import { t } from './i18nRuntime.js';
import { toggleReadFigures } from './ignoreFigures.js';
import { closeLiveConversation, openLiveConversation } from './liveConversation.js';
import { skipSentence, stopSpeech, togglePlayPause } from './subtitleHighlight.js';
import { openVoiceSelector, updateRate } from './tts.js';
import { toggleTutorMode } from './tutorMode.js';
import { fitToHeight, fitToWidth } from './zoom.js';

export function announceShortcut(message) {
  let toast = document.getElementById('shortcut-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'shortcut-toast';
    toast.className =
      'fixed top-20 left-1/2 z-[2000] bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none transition-all duration-150';
    toast.style.transform = 'translate(-50%, -8px)';
    toast.style.opacity = '0';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(toast._hideTimer);
  clearTimeout(toast._removeTimer);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translate(-50%, 0)';
  });
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translate(-50%, -8px)';
  }, 1400);
}

export function positionShortcutHints() {
  const bar = document.getElementById('shortcuts-hint-bar');
  if (!bar) return;
  const barRect = bar.getBoundingClientRect();
  bar.innerHTML = '';
  state.SHORTCUT_HINTS.forEach(({ id, key, big }) => {
    const btn = document.getElementById(id);
    if (!btn || btn.offsetParent === null) return; // no visible en este tamaño de pantalla
    const r = btn.getBoundingClientRect();
    const centerX = r.left + r.width / 2 - barRect.left;
    const badge = document.createElement('div');
    badge.textContent = typeof key === 'function' ? key() : key;
    badge.className = big
      ? 'absolute top-0 -translate-x-1/2 text-base font-bold text-white/90 bg-white/10 rounded px-1.5 py-0.5 leading-[22px]'
      : 'absolute top-0 -translate-x-1/2 text-[10px] font-bold text-white/90 bg-white/10 rounded px-1.5 py-0.5 leading-[22px]';
    badge.style.left = `${centerX}px`;
    bar.appendChild(badge);
  });
}

export function showShortcutsBarTemporarily() {
  const bar = document.getElementById('shortcuts-hint-bar');
  if (!bar) return;
  bar.classList.remove('hidden');
  positionShortcutHints();
  requestAnimationFrame(() => {
    bar.style.height = '22px';
  });
  clearTimeout(state.shortcutsBarTimer);
  state.shortcutsBarTimer = setTimeout(() => {
    bar.style.height = '0px';
    setTimeout(() => bar.classList.add('hidden'), 320);
  }, 10000);
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initKeyboardShortcutsSection() {
  document.getElementById('doc-upload').addEventListener('change', state.handleFileUpload);
  document.getElementById('doc-upload-main').addEventListener('change', state.handleFileUpload);
  state.btnPlayPause.addEventListener('click', togglePlayPause);
  window.addEventListener('resize', () => {
    if (state.isVisible(document.getElementById('shortcuts-hint-bar'))) positionShortcutHints();
  });
  window.addEventListener('keydown', (e) => {
    if (
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT'
    ) {
      if (e.code === 'Escape') e.target.blur();
      return;
    }
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        if (state.liveSessionActive) {
          closeLiveConversation();
          announceShortcut('Conversación en vivo detenida');
        } else {
          togglePlayPause();
          announceShortcut(
            state.isPlaying && !state.isPaused ? 'Reproducción iniciada' : 'Reproducción en pausa',
          );
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        skipSentence(-1);
        announceShortcut('Oración anterior');
        break;
      case 'ArrowRight':
        e.preventDefault();
        skipSentence(1);
        announceShortcut('Oración siguiente');
        break;
      case 'ArrowUp':
        e.preventDefault();
        state.rateSliderDesk.value = Math.min(
          3,
          parseFloat(state.rateSliderDesk.value) + 0.1,
        ).toFixed(1);
        updateRate(state.rateSliderDesk.value);
        announceShortcut(`Velocidad: ${state.rateSliderDesk.value}x`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        state.rateSliderDesk.value = Math.max(
          0.5,
          parseFloat(state.rateSliderDesk.value) - 0.1,
        ).toFixed(1);
        updateRate(state.rateSliderDesk.value);
        announceShortcut(`Velocidad: ${state.rateSliderDesk.value}x`);
        break;
      case 'Escape': {
        e.preventDefault();
        const wasLive = state.liveSessionActive;
        if (wasLive) closeLiveConversation();
        stopSpeech();
        state.synth.cancel();
        if (state.isInspectMode) state.btnChatInspect.click();
        announceShortcut(wasLive ? 'Conversación en vivo detenida' : 'Lectura detenida');
        break;
      }
      case 'KeyH':
        e.preventDefault();
        state.btnToggleChat.click();
        announceShortcut(state.isVisible(state.chatPanel) ? 'Chat abierto' : 'Chat cerrado');
        break;
      case 'KeyT':
        e.preventDefault();
        document.getElementById('btn-translate-wrapper').click();
        announceShortcut(
          state.isTranslatingEnabled ? 'Traducción activada' : 'Traducción desactivada',
        );
        break;
      case 'KeyU':
        e.preventDefault();
        document.getElementById('btn-subtitles-wrapper').click();
        announceShortcut(
          state.isTranscriptionEnabled ? 'Subtítulos activados' : 'Subtítulos desactivados',
        );
        break;
      case 'KeyS':
        e.preventDefault();
        document.getElementById('autoscroll-toggle').click();
        announceShortcut(
          document.getElementById('autoscroll-toggle').checked
            ? 'Autoscroll activado'
            : 'Autoscroll desactivado',
        );
        break;
      case 'KeyP':
        e.preventDefault();
        document.getElementById('skip-parens-toggle').click();
        announceShortcut(
          document.getElementById('skip-parens-toggle').checked
            ? 'Omitir paréntesis activado'
            : 'Omitir paréntesis desactivado',
        );
        break;
      case 'KeyL':
        e.preventDefault();
        document.getElementById('skip-links-toggle').click();
        announceShortcut(
          document.getElementById('skip-links-toggle').checked
            ? 'Omitir enlaces activado'
            : 'Omitir enlaces desactivado',
        );
        break;
      case 'KeyD':
        e.preventDefault();
        document.getElementById('doc-upload').click();
        announceShortcut('Cargar documento');
        break;
      case 'KeyE':
        e.preventDefault();
        toggleTutorMode();
        announceShortcut(
          state.tutorModeActive ? 'Modo estudio activado' : 'Modo estudio desactivado',
        );
        break;
      case 'KeyG':
        e.preventDefault();
        toggleReadFigures();
        announceShortcut(
          state.readFiguresActive ? 'Leer gráficos activado' : 'Omitir gráficos activado',
        );
        break;
      case 'KeyM':
        e.preventDefault();
        document.getElementById('btn-mic').click();
        announceShortcut('Escuchando pregunta...');
        break;
      case 'KeyN':
        e.preventDefault();
        document.getElementById('btn-compass').click();
        announceShortcut('Escuchando destino...');
        break;
      case 'KeyK':
        e.preventDefault();
        if (state.liveSessionActive) {
          closeLiveConversation();
          announceShortcut('Conversación en vivo detenida');
        } else {
          openLiveConversation();
          announceShortcut('Conversación en vivo iniciada');
        }
        break;
      case 'KeyA':
        e.preventDefault();
        state.btnMargins.click();
        announceShortcut(
          state.isVisible(document.getElementById('margins-panel'))
            ? 'Ajustes abiertos'
            : 'Ajustes cerrados',
        );
        break;
      case 'KeyO':
        e.preventDefault();
        document.getElementById('btn-mobile-lang-menu').click();
        announceShortcut(
          state.isVisible(document.getElementById('mobile-lang-panel'))
            ? 'Opciones de audio abiertas'
            : 'Opciones de audio cerradas',
        );
        break;
      case 'KeyB':
        e.preventDefault();
        document.getElementById('enable-margins-toggle').click();
        announceShortcut(
          document.getElementById('enable-margins-toggle').checked
            ? 'Márgenes activados'
            : 'Márgenes desactivados',
        );
        break;
      case 'KeyC':
        e.preventDefault();
        state.btnToc.click();
        announceShortcut(
          state.isVisible(document.getElementById('toc-panel'))
            ? 'Índice abierto'
            : 'Índice cerrado',
        );
        break;
      case 'KeyF':
        e.preventDefault();
        state.btnFiguresIndex.click();
        announceShortcut(
          state.isVisible(document.getElementById('figures-panel'))
            ? 'Índice de figuras abierto'
            : 'Índice de figuras cerrado',
        );
        break;
      case 'KeyI':
        e.preventDefault();
        const dToggle = document.getElementById('dynamic-index-toggle');
        dToggle.checked = !dToggle.checked;
        renderDynamicIndex();
        announceShortcut(
          dToggle.checked ? 'Índice dinámico activado' : 'Índice dinámico desactivado',
        );
        break;
      case 'KeyW':
        e.preventDefault();
        if (!state.multiLangEnabled) document.getElementById('btn-multilang-wrapper').click();
        openVoiceSelector();
        announceShortcut(
          state.multiLangEnabled ? 'Multilingüe activado' : 'Multilingüe desactivado',
        );
        break;
      case 'KeyV':
        e.preventDefault();
        openVoiceSelector();
        announceShortcut('Selector de voz abierto');
        break;
      case 'KeyJ':
        e.preventDefault();
        openShortcutsPanel(document.getElementById('topbar-btn-shortcuts'));
        showShortcutsBarTemporarily();
        announceShortcut('Atajos abiertos');
        break;
      case 'KeyQ':
        e.preventDefault();
        openHelpPanel(document.getElementById('topbar-btn-help'));
        announceShortcut('Ayuda abierta');
        break;
      case 'KeyX':
        e.preventDefault();
        fitToWidth();
        announceShortcut('Ajustado al ancho');
        break;
      case 'KeyY':
        e.preventDefault();
        fitToHeight();
        announceShortcut('Ajustado al alto');
        break;
      case 'KeyR':
        e.preventDefault();
        state.btnChatInspect.click();
        announceShortcut(
          state.isInspectMode ? 'Modo inspección activado' : 'Modo inspección desactivado',
        );
        break;
      case 'KeyZ':
        e.preventDefault();
        toggleFullscreen();
        announceShortcut(
          document.fullscreenElement
            ? 'Pantalla completa activada'
            : 'Pantalla completa desactivada',
        );
        break;
    }
  });
}
