// ===============================================================================================
// SECCIÓN: Barra de scroll propia del documento
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { t } from './i18nRuntime.js';
import { scrollToPage } from './pageNavigation.js';

export function getPageNumberAtScrollTop(targetTop) {
  const wrappers = Array.from(document.querySelectorAll('#pdf-container [data-page-num]'));
  if (wrappers.length === 0) return 1;
  const mainRectTop = state.mainScroll.getBoundingClientRect().top;
  let best = wrappers[0];
  for (const w of wrappers) {
    const wTopInScrollCoords =
      w.getBoundingClientRect().top - mainRectTop + state.mainScroll.scrollTop;
    if (wTopInScrollCoords <= targetTop) best = w;
    else break;
  }
  return parseInt(best.getAttribute('data-page-num'));
}

export function updateCustomScrollbarThumb() {
  if (!state.documentObj) {
    state.customScrollbarTrack.classList.add('hidden');
    return;
  }
  const trackHeight = state.mainScroll.clientHeight;
  const scrollable = state.mainScroll.scrollHeight - state.mainScroll.clientHeight;
  if (scrollable <= 0) {
    state.customScrollbarTrack.classList.add('hidden');
    return;
  }
  state.customScrollbarTrack.classList.remove('hidden');
  const thumbHeight = Math.max(
    30,
    (state.mainScroll.clientHeight / state.mainScroll.scrollHeight) * trackHeight,
  );
  const thumbTop = (state.mainScroll.scrollTop / scrollable) * (trackHeight - thumbHeight);
  state.customScrollbarThumb.style.height = `${thumbHeight}px`;
  state.customScrollbarThumb.style.top = `${thumbTop}px`;
}

export function showScrollbarPageTooltip(clientY, pageNum) {
  state.scrollbarPageTooltip.classList.remove('hidden');
  state.scrollbarPageTooltip.textContent = `${t('scrollbar_page_tooltip_txt') || 'Página'} ${pageNum}`;
  // El ancho solo se puede medir con precisión una vez visible (display != none),
  // por eso se mide DESPUÉS de quitar la clase "hidden", no antes.
  const trackRect = state.customScrollbarTrack.getBoundingClientRect();
  state.scrollbarPageTooltip.style.top = `${clientY - 12}px`;
  state.scrollbarPageTooltip.style.left = `${trackRect.left - state.scrollbarPageTooltip.offsetWidth - 10}px`;
}

export function hideScrollbarPageTooltip() {
  state.scrollbarPageTooltip.classList.add('hidden');
}

export function scrollFractionFromClientY(clientY) {
  const trackRect = state.customScrollbarTrack.getBoundingClientRect();
  const fraction = Math.min(1, Math.max(0, (clientY - trackRect.top) / trackRect.height));
  return fraction;
}

export function handleScrollbarHover(e) {
  if (state.isDraggingScrollbar) return;
  const fraction = scrollFractionFromClientY(e.clientY);
  const targetScrollTop =
    fraction * (state.mainScroll.scrollHeight - state.mainScroll.clientHeight);
  showScrollbarPageTooltip(e.clientY, getPageNumberAtScrollTop(targetScrollTop));
}

export function renderDynamicIndex() {
  const container = document.getElementById('dynamic-index-markers');
  container.innerHTML = '';
  if (!state.dynamicIndexToggle.checked || !state.documentObj || state.tableOfContents.length === 0)
    return;

  const total = Math.max(1, state.documentObj.numPages - 1);
  state.tableOfContents.forEach((item) => {
    const percent = (item.page - 1) / total;
    const marker = document.createElement('div');
    marker.className =
      'absolute top-1/2 -translate-y-1/2 w-[4px] h-[10px] bg-[#8B5CF6] rounded-full cursor-pointer hover:bg-[#7C3AED] hover:h-[14px] transition-all z-30 group dynamic-marker pointer-events-auto';
    const offsetPx = 6 - 12 * percent;
    marker.style.left = `calc(${percent * 100}% + ${offsetPx}px)`;

    const tooltip = document.createElement('div');
    tooltip.className =
      'hidden dynamic-tooltip absolute bottom-[160%] left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs py-1.5 px-3 rounded shadow-lg whitespace-nowrap z-[300] pointer-events-none font-medium';
    tooltip.textContent = item.title;

    // Ajustar posición horizontal para que nunca se corte por los bordes
    marker.addEventListener('mouseenter', () => {
      tooltip.classList.remove('hidden');
      const markerRect = marker.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const margin = 8;

      const markerCenter = markerRect.left + markerRect.width / 2;
      const tooltipHalfWidth = tooltipRect.width / 2;

      // Posición ideal: centrada sobre el marcador
      let idealLeft = markerCenter - tooltipHalfWidth;

      // Si se sale por la izquierda: pegar al margen izquierdo
      if (idealLeft < margin) {
        const shift = margin - idealLeft;
        tooltip.style.left = `calc(50% + ${shift}px)`;
      }
      // Si se sale por la derecha: pegar al margen derecho
      else if (idealLeft + tooltipRect.width > viewportWidth - margin) {
        const shift = idealLeft + tooltipRect.width - (viewportWidth - margin);
        tooltip.style.left = `calc(50% - ${shift}px)`;
      }
      // Si cabe centrado: dejar en el centro
      else {
        tooltip.style.left = '50%';
      }
    });

    marker.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
      tooltip.style.left = '50%'; // Reset para la próxima vez
    });

    marker.appendChild(tooltip);

    marker.appendChild(tooltip);
    marker.onclick = (e) => {
      e.stopPropagation();
      scrollToPage(item.page, true);
    };
    container.appendChild(marker);
  });
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initCustomScrollbarSection() {
  state.mainScroll.addEventListener('scroll', updateCustomScrollbarThumb, { passive: true });
  window.addEventListener('resize', updateCustomScrollbarThumb);
  state.customScrollbarTrack.addEventListener('mousemove', handleScrollbarHover);
  state.customScrollbarThumb.addEventListener('mousemove', handleScrollbarHover);
  state.customScrollbarTrack.addEventListener('mouseleave', () => {
    if (!state.isDraggingScrollbar) hideScrollbarPageTooltip();
  });
  state.customScrollbarTrack.addEventListener('mousedown', (e) => {
    e.preventDefault();
    state.isDraggingScrollbar = true;
    document.body.style.userSelect = 'none';
    const fraction = scrollFractionFromClientY(e.clientY);
    state.mainScroll.scrollTop =
      fraction * (state.mainScroll.scrollHeight - state.mainScroll.clientHeight);
    showScrollbarPageTooltip(e.clientY, getPageNumberAtScrollTop(state.mainScroll.scrollTop));
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isDraggingScrollbar) return;
    const fraction = scrollFractionFromClientY(e.clientY);
    state.mainScroll.scrollTop =
      fraction * (state.mainScroll.scrollHeight - state.mainScroll.clientHeight);
    showScrollbarPageTooltip(e.clientY, getPageNumberAtScrollTop(state.mainScroll.scrollTop));
  });
  window.addEventListener('mouseup', () => {
    if (!state.isDraggingScrollbar) return;
    state.isDraggingScrollbar = false;
    document.body.style.userSelect = '';
    hideScrollbarPageTooltip();
  });
  state.pageInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (state.documentObj && val > state.documentObj.numPages) val = state.documentObj.numPages;
    e.target.value = val;
    scrollToPage(val);
  });
  state.pageInput.addEventListener('click', function () {
    this.select();
  });
  state.pageInput.addEventListener('focus', function () {
    this.select();
  });
  state.pageInputMobile.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (state.documentObj && val > state.documentObj.numPages) val = state.documentObj.numPages;
    e.target.value = val;
    state.pageInput.value = val;
    scrollToPage(val);
  });
  state.pageInputMobile.addEventListener('click', function () {
    this.select();
  });
  state.pageInputMobile.addEventListener('focus', function () {
    this.select();
  });
  state.topbarPageInput.addEventListener('change', (e) => {
    let val = parseInt(e.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (state.documentObj && val > state.documentObj.numPages) val = state.documentObj.numPages;
    e.target.value = val;
    scrollToPage(val);
  });
  state.topbarPageInput.addEventListener('click', function (e) {
    e.stopPropagation();
    this.select();
  });
  state.topbarPageInput.addEventListener('focus', function () {
    this.select();
  });
  state.dynamicIndexToggle.addEventListener('change', renderDynamicIndex);
}
