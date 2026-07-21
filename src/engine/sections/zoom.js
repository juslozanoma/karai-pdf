// ===============================================================================================
// SECCIÓN: Zoom estilo pdf-kimi
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { rebuildGlobalSentences } from './ignoreFigures.js';
import {
  buildTextLayerAndSentences,
  refreshPageCanvas,
  resizePageContainers,
} from './pdfDocxRenderer.js';
import { speakNextSentence } from './subtitleHighlight.js';
import { syncTopBar } from './topToolbarSync.js';

export function clampScale(s) {
  return Math.min(Math.max(s, state.MIN_SCALE), state.MAX_SCALE);
}

export function findAnchorAtPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  const pageEl = el ? el.closest('[data-page-num]') : null;
  if (!pageEl) return null;
  const pRect = pageEl.getBoundingClientRect();
  if (pRect.width === 0 || pRect.height === 0) return null;
  return {
    wrapperEl: pageEl,
    fractionX: (clientX - pRect.left) / pRect.width,
    fractionY: (clientY - pRect.top) / pRect.height,
  };
}

export function zoomAtPoint(newScale, clientX, clientY) {
  if (!state.documentObj) return;
  newScale = clampScale(newScale);
  if (Math.abs(newScale - state.pendingScale) < 0.001) return;

  if (state.documentObj.isDocx) {
    state.pendingScale = newScale;
    state.currentScale = state.pendingScale;
    document
      .querySelectorAll('.docx-page')
      .forEach((w) => (w.style.fontSize = `${16 * state.currentScale}px`));
    syncTopBar();
    return;
  }

  const anchor = findAnchorAtPoint(clientX, clientY);

  state.pendingScale = newScale;
  resizePageContainers(state.pendingScale);

  state.preventScrollObserver = true;
  if (anchor && anchor.wrapperEl.isConnected) {
    const newRect = anchor.wrapperEl.getBoundingClientRect();
    const targetX = newRect.left + anchor.fractionX * newRect.width;
    const targetY = newRect.top + anchor.fractionY * newRect.height;
    state.mainScroll.scrollLeft += targetX - clientX;
    state.mainScroll.scrollTop += targetY - clientY;
  }
  setTimeout(() => (state.preventScrollObserver = false), 60);

  syncTopBar();

  if (state.zoomCommitTimer) clearTimeout(state.zoomCommitTimer);
  state.zoomCommitTimer = setTimeout(() => {
    state.zoomCommitTimer = null;
    commitZoom();
  }, 400);
}

export function zoomAtCenter(newScale) {
  const rect = state.mainScroll.getBoundingClientRect();
  zoomAtPoint(newScale, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

export function changeZoom(delta) {
  if (!state.documentObj) return;
  const factor = delta > 0 ? 1.25 : 1 / 1.25;
  zoomAtCenter(state.pendingScale * factor);
}

export async function commitZoom() {
  if (!state.documentObj) return;
  state.currentScale = state.pendingScale;
  if (state.documentObj.isDocx) {
    document
      .querySelectorAll('.docx-page')
      .forEach((w) => (w.style.fontSize = `${16 * state.currentScale}px`));
    syncTopBar();
    return;
  }
  await refreshVisiblePagesPreservingPlayback();
  syncTopBar();
}

export async function refreshVisiblePagesPreservingPlayback() {
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

  const jobs = [];
  for (let num = 1; num <= (state.documentObj ? state.documentObj.numPages : 0); num++) {
    const st = state.pageState[num];
    const w = st && st.wrapperEl;
    if (
      st &&
      w &&
      st.visible &&
      w.getAttribute('data-rendered') === 'true' &&
      st.renderedScale !== state.currentScale
    ) {
      jobs.push(
        refreshPageCanvas(num, w).then(() => {
          // Reconstruir la capa de texto a la escala final para que la selección y el
          // clic-para-leer coincidan exactamente con el nuevo tamaño del canvas.
          if (!state.documentObj || !st.pdfPage) return;
          const viewport = st.pdfPage.getViewport({ scale: state.currentScale });
          return st.pdfPage
            .getTextContent()
            .then((tc) => buildTextLayerAndSentences(tc, viewport, w, num));
        }),
      );
    }
  }
  await Promise.all(jobs);

  if (savedPageNum === null || savedLocalIdx === null) return;

  const maxWaitMs = 3000;
  const stepMs = 80;
  let waited = 0;
  while (waited < maxWaitMs) {
    if (state.pageSentences[savedPageNum] && state.pageSentences[savedPageNum][savedLocalIdx])
      break;
    await state.delay(stepMs);
    waited += stepMs;
  }

  const restoredSentence =
    state.pageSentences[savedPageNum] && state.pageSentences[savedPageNum][savedLocalIdx];
  if (!restoredSentence) return;

  rebuildGlobalSentences();
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

export async function fitToWidth() {
  if (!state.documentObj) return;
  const rect = state.mainScroll.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const availableWidth = Math.max(200, state.mainScroll.clientWidth);

  if (state.documentObj.isDocx) {
    const targetScale = clampScale(availableWidth / 800);
    state.pendingScale = targetScale;
    state.currentScale = targetScale;
    document
      .querySelectorAll('.docx-page')
      .forEach((w) => (w.style.fontSize = `${16 * state.currentScale}px`));
    syncTopBar();
    return;
  }

  const currentPageNum = parseInt(state.pageInput.value) || 1;
  const st = state.pageState[currentPageNum] || state.pageState[1];
  const nativeW = st
    ? st.nativeW
    : (await state.documentObj.getPage(1)).getViewport({ scale: 1 }).width;
  zoomAtPoint(availableWidth / nativeW, centerX, centerY);
}

export async function fitToHeight() {
  if (!state.documentObj) return;
  const availableHeight = Math.max(300, state.mainScroll.clientHeight - 32);

  if (state.documentObj.isDocx) {
    const targetScale = clampScale(availableHeight / 800);
    state.pendingScale = targetScale;
    state.currentScale = targetScale;
    document
      .querySelectorAll('.docx-page')
      .forEach((w) => (w.style.fontSize = `${16 * state.currentScale}px`));
    syncTopBar();
    return;
  }

  const currentPageNum = parseInt(state.pageInput.value) || 1;
  const st = state.pageState[currentPageNum] || state.pageState[1];
  const nativeH = st
    ? st.nativeH
    : (await state.documentObj.getPage(1)).getViewport({ scale: 1 }).height;

  // A diferencia del zoom normal (que ancla un punto del documento bajo el cursor/centro
  // de la pantalla), Ajuste de alto SIEMPRE debe mostrar la página actual completa, de
  // principio a fin, ocupando todo el alto disponible entre la barra superior y la
  // inferior, sin dejar ver fragmentos de la página anterior ni de la siguiente. Por eso
  // aquí no se usa zoomAtPoint (que ancla por un punto arbitrario): en vez de eso, tras
  // cambiar la escala, se alinea directamente el borde SUPERIOR de la página actual con
  // el borde superior del área visible.
  const targetScale = clampScale(availableHeight / nativeH);
  state.pendingScale = targetScale;
  resizePageContainers(state.pendingScale);

  state.preventScrollObserver = true;
  const wrapperEl = st ? st.wrapperEl : null;
  if (wrapperEl && wrapperEl.isConnected) {
    const containerRect = state.mainScroll.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();
    state.mainScroll.scrollTop += wrapperRect.top - containerRect.top;
  }
  setTimeout(() => (state.preventScrollObserver = false), 60);

  syncTopBar();

  if (state.zoomCommitTimer) clearTimeout(state.zoomCommitTimer);
  state.zoomCommitTimer = setTimeout(() => {
    state.zoomCommitTimer = null;
    commitZoom();
  }, 400);
}
