// ===============================================================================================
// SECCIÓN: Navegación instantánea entre páginas
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';

export function updateScrollTooltip() {
  const val = Math.round(parseFloat(state.horizScroll.value));
  const max = Math.max(1, parseFloat(state.horizScroll.max) - 1);
  const percent = (parseFloat(state.horizScroll.value) - 1) / max;
  state.scrollTooltip.textContent = `p. ${val}`;
  const offsetPx = 6 - 12 * percent;
  state.scrollTooltip.style.left = `calc(${percent * 100}% + ${offsetPx}px)`;
}

export function getScrollAnchor(clientY = null) {
  let refScrollY;
  if (clientY !== null) {
    const mainRect = state.mainScroll.getBoundingClientRect();
    refScrollY = state.mainScroll.scrollTop + (clientY - mainRect.top);
  } else {
    refScrollY = state.mainScroll.scrollTop;
  }
  const wrappers = state.docContainer.querySelectorAll('[data-page-num]');
  let anchorPage = parseInt(state.pageInput.value) || 1;
  let fraction = 0;
  for (const el of wrappers) {
    const top = el.offsetTop;
    const height = el.offsetHeight || 1;
    if (refScrollY < top + height) {
      anchorPage = parseInt(el.getAttribute('data-page-num'));
      fraction = (refScrollY - top) / height;
      break;
    }
  }
  return { anchorPage, fraction: Math.max(0, Math.min(1, fraction)), clientY };
}

export function scrollToPage(num, highlight = false) {
  const pageEl = document.getElementById(`page-${num}`);
  if (pageEl) {
    state.preventScrollObserver = true;
    state.mainScroll.scrollTop = pageEl.offsetTop - 20;
    state.pageInput.value = num;
    state.pageInputMobile.value = num;
    if (document.activeElement !== state.topbarPageInput) state.topbarPageInput.value = num;
    if (highlight) {
      pageEl.classList.add('ring-4', 'ring-[#8B5CF6]', 'transition-all', 'duration-500');
      setTimeout(() => pageEl.classList.remove('ring-4', 'ring-[#8B5CF6]'), 1500);
    }
    setTimeout(() => (state.preventScrollObserver = false), 150);
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initPageNavigationSection() {
  state.horizScroll.addEventListener('input', () => {
    updateScrollTooltip();
    const scrollRatio =
      (parseFloat(state.horizScroll.value) - 1) /
      Math.max(1, parseFloat(state.horizScroll.max) - 1);
    const totalScrollHeight = state.mainScroll.scrollHeight - state.mainScroll.clientHeight;
    state.mainScroll.scrollTop = scrollRatio * totalScrollHeight;
  });
  state.mainScroll.addEventListener('scroll', () => {
    if (state.preventScrollObserver) return;
    const totalScrollHeight = state.mainScroll.scrollHeight - state.mainScroll.clientHeight;
    if (totalScrollHeight <= 0) return;
    const scrollRatio = state.mainScroll.scrollTop / totalScrollHeight;
    const maxPage = Math.max(1, parseFloat(state.horizScroll.max) - 1);
    const currentVal = 1 + scrollRatio * maxPage;
    state.horizScroll.value = currentVal;
    updateScrollTooltip();
  });
  state.horizScroll.addEventListener('mouseenter', () => {
    state.scrollTooltip.classList.remove('hidden');
    updateScrollTooltip();
  });
  state.horizScroll.addEventListener('mousemove', updateScrollTooltip);
  state.horizScroll.addEventListener('mouseleave', () =>
    state.scrollTooltip.classList.add('hidden'),
  );
}
