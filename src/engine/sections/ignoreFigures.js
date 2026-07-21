// ===============================================================================================
// SECCIÓN: Botón ignorar figuras y texto pequeño
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { hideMarginGuides } from './autoTrackSend.js';
import { updateMenuButtonState } from './buttonStyles.js';
import { buildDocxTextLayerAndSentences, buildTextLayerAndSentences } from './pdfDocxRenderer.js';
import { speakNextSentence } from './subtitleHighlight.js';

export function toggleReadFigures() {
  state.readFiguresActive = !state.readFiguresActive;
  if (state.readFiguresActive) {
    state.btnFigures.className =
      'p-2 text-gray-400 bg-white hover:bg-[#F8F7FF] hover:text-[#7C3AED] rounded-full transition shrink-0 flex items-center justify-center w-10 h-10';
    state.btnFigures.title = '(G) Leer figuras y texto pequeño (Activo)';
    state.btnFigures.innerHTML = '<i data-lucide="eye" class="w-5 h-5"></i>';
  } else {
    state.btnFigures.className =
      'p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10';
    state.btnFigures.title = '(G) Omitir figuras y texto pequeño (Inactivo)';
    state.btnFigures.innerHTML = '<i data-lucide="eye-off" class="w-5 h-5"></i>';
  }

  const mBtn = document.getElementById('btn-figures-mobile');
  if (mBtn) {
    if (state.readFiguresActive) {
      mBtn.innerHTML = '<i data-lucide="eye" class="w-5 h-5"></i>';
      mBtn.className =
        'p-2 text-gray-400 bg-transparent hover:bg-[#F8F7FF] hover:text-[#7C3AED] rounded-full transition shadow-sm items-center justify-center w-10 h-10';
    } else {
      mBtn.innerHTML = '<i data-lucide="eye-off" class="w-5 h-5"></i>';
      mBtn.className =
        'p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-full transition shadow-sm items-center justify-center w-10 h-10';
    }
  }
  lucide.createIcons();
  recalculateSentencesOnly();
}

export function rebuildGlobalSentences() {
  state.sentences = [];
  const sortedPages = Object.keys(state.pageSentences)
    .map(Number)
    .sort((a, b) => a - b);
  for (let p of sortedPages) {
    state.sentences.push(...state.pageSentences[p]);
  }
}

export async function recalculateSentencesOnly() {
  if (!state.documentObj) return;

  state.isMarginsActive = document.getElementById('enable-margins-toggle').checked;
  if (state.isMarginsActive) {
    state.savedMargins.top = parseInt(state.topMarginSlider.value);
    state.savedMargins.bot = parseInt(state.botMarginSlider.value);
    state.savedMargins.left = parseInt(state.leftMarginSlider.value);
    state.savedMargins.right = parseInt(state.rightMarginSlider.value);
  }

  // Los cambios (p. ej. activar/desactivar "No leer figuras", o aplicar nuevos márgenes)
  // se aplican en SEGUNDO PLANO: ya no se llama a stopSpeech(), que detenía por completo
  // la lectura en curso. En vez de eso, se recuerda la oración y palabra exactas donde iba
  // la lectura, se reconstruyen las oraciones, y al terminar se retoma justo desde ahí.
  const wasPlaying = state.isPlaying && !state.isPaused;
  let savedPageNum = null,
    savedLocalIdx = null;
  const savedWordOffset = state.currentWordOffset;
  if (state.currentSentenceIndex >= 0 && state.currentSentenceIndex < state.sentences.length) {
    const curS = state.sentences[state.currentSentenceIndex];
    savedPageNum = curS.pageNum;
    savedLocalIdx = state.pageSentences[curS.pageNum]
      ? state.pageSentences[curS.pageNum].indexOf(curS)
      : null;
  }
  if (wasPlaying) state.synth.cancel(); // solo detiene el audio actual, no el estado de la lectura

  state.pageSentences = {};

  const wrappers = document.querySelectorAll('[data-page-num]');
  for (let wrapper of wrappers) {
    const num = parseInt(wrapper.getAttribute('data-page-num'));
    if (wrapper.getAttribute('data-rendered') === 'true') {
      if (state.documentObj.isDocx) {
        buildDocxTextLayerAndSentences(state.documentObj.docxHtml, wrapper, num);
      } else {
        const page = await state.documentObj.getPage(num);
        const viewport = page.getViewport({ scale: state.currentScale });
        const textContent = await page.getTextContent();
        buildTextLayerAndSentences(textContent, viewport, wrapper, num);
      }
    }
  }

  rebuildGlobalSentences();

  if (savedPageNum === null || savedLocalIdx === null) return;
  const restoredSentence =
    state.pageSentences[savedPageNum] && state.pageSentences[savedPageNum][savedLocalIdx];
  if (!restoredSentence) return;

  const newGlobalIdx = state.sentences.indexOf(restoredSentence);
  if (newGlobalIdx === -1) return;

  state.currentSentenceIndex = newGlobalIdx;
  state.currentWordOffset = savedWordOffset;

  if (wasPlaying) {
    state.isPlaying = true;
    state.isPaused = false;
    speakNextSentence();
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initIgnoreFiguresSection() {
  state.btnFigures.addEventListener('click', toggleReadFigures);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#margins-panel') && !e.target.closest('#btn-margins')) {
      document.getElementById('margins-panel').classList.add('hidden');
      hideMarginGuides();
    }
    if (
      !e.target.closest('#mobile-lang-panel') &&
      !e.target.closest('#btn-mobile-lang-menu') &&
      !e.target.closest('#voice-dropdown-menu')
    )
      document.getElementById('mobile-lang-panel').classList.add('hidden');
    if (
      !e.target.closest('#voice-dropdown-menu') &&
      !e.target.closest('#voice-selector-wrapper') &&
      !e.target.closest('#voice-selector-btn-mobile') &&
      !e.target.closest('#btn-multilang-wrapper')
    ) {
      document.getElementById('voice-dropdown-menu').classList.add('hidden');
      document.getElementById('voice-dropdown-menu').classList.remove('flex');
    }
    if (!e.target.closest('#toc-panel') && !e.target.closest('#btn-toc')) {
      document.getElementById('toc-panel').classList.add('hidden');
      document.getElementById('toc-panel').classList.remove('flex');
    }
    if (!e.target.closest('#figures-panel') && !e.target.closest('#btn-figures-index')) {
      document.getElementById('figures-panel').classList.add('hidden');
      document.getElementById('figures-panel').classList.remove('flex');
    }
    if (!e.target.closest('#shortcuts-panel') && !e.target.closest('#topbar-btn-shortcuts')) {
      document.getElementById('shortcuts-panel').classList.add('hidden');
    }
    if (!e.target.closest('#help-panel') && !e.target.closest('#topbar-btn-help')) {
      document.getElementById('help-panel').classList.add('hidden');
      document.getElementById('help-panel').classList.remove('flex');
    }
    updateMenuButtonState();
  });
}
