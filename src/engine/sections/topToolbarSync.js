// ===============================================================================================
// SECCIÓN: Barra superior: sincronización + tooltip de progreso
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { t } from './i18nRuntime.js';
import { updatePipUI } from './pictureInPicture.js';

export function formatDurationForTooltip(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60),
    m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m} min`;
}

export function positionProgressTooltip() {
  const rect = state.topbarBtnClock.getBoundingClientRect();
  state.progressTooltipEl.style.left = Math.max(6, rect.left) + 'px';
  state.progressTooltipEl.style.top = rect.bottom + 8 + 'px';
}

export function updateProgressTooltipContent() {
  if (!state.docSessionStartTime) return false;
  const pct = parseInt(state.topbarProgress.textContent, 10) || 0;
  const elapsedMs = Date.now() - state.docSessionStartTime;
  const startLabel = new Date(state.docSessionStartTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  state.progressTooltipStartEl.textContent = `${t('progress_tooltip_start')}: ${startLabel}`;
  if (pct <= 0) {
    state.progressTooltipRemainingEl.textContent = `${t('progress_tooltip_remaining')}: ${t('progress_tooltip_calculating')}`;
  } else {
    const estimatedTotalMs = elapsedMs / (pct / 100);
    const remainingMs = Math.max(0, estimatedTotalMs - elapsedMs);
    state.progressTooltipRemainingEl.textContent = `${t('progress_tooltip_remaining')}: ${formatDurationForTooltip(remainingMs)}`;
  }
  return true;
}

export function showTopToolbar() {
  state.pdfToolbar.classList.remove('hidden');
  state.pdfToolbar.classList.add('flex');
  syncTopBar();
}

export function syncTopBar() {
  if (state.topbarZoomPct)
    state.topbarZoomPct.textContent = Math.round(state.pendingScale * 100) + '%';
  if (state.topbarPageIndicator) {
    const total = state.documentObj ? state.documentObj.numPages : 0;
    if (total) {
      state.topbarPageIndicator.classList.remove('hidden');
      state.topbarPageIndicator.classList.add('flex');
      if (document.activeElement !== state.topbarPageInput)
        state.topbarPageInput.value = state.pageInput.value || 1;
      state.topbarPageTotal.textContent = total;
    } else {
      state.topbarPageIndicator.classList.add('hidden');
      state.topbarPageIndicator.classList.remove('flex');
    }
  }
  // Leer scrollHeight/clientHeight fuerza un recálculo de layout (reflow). Si esto se hace
  // de inmediato justo después de redimensionar páginas (como pasa en cada paso del zoom),
  // el navegador tiene que recalcular todo el layout de forma síncrona ahí mismo: eso es lo
  // que hacía sentir "pesado" el zoom. Se difiere a un requestAnimationFrame para que el
  // reflow ocurra una sola vez por cuadro, no una vez por cada evento.
  if (state.syncTopBarRAF) cancelAnimationFrame(state.syncTopBarRAF);
  state.syncTopBarRAF = requestAnimationFrame(() => {
    state.syncTopBarRAF = null;
    if (!state.topbarProgress) return;
    const scrollable = state.mainScroll.scrollHeight - state.mainScroll.clientHeight;
    const pct = scrollable > 0 ? Math.round((state.mainScroll.scrollTop / scrollable) * 100) : 0;
    state.topbarProgress.textContent = Math.min(100, Math.max(0, pct)) + '%';
  });
  if (typeof updatePipUI === 'function') updatePipUI();
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initTopToolbarSyncSection() {
  state.topbarBtnClock.addEventListener('mouseenter', () => {
    if (!updateProgressTooltipContent()) return;
    positionProgressTooltip();
    state.progressTooltipEl.classList.remove('hidden');
  });
  state.topbarBtnClock.addEventListener('mouseleave', () =>
    state.progressTooltipEl.classList.add('hidden'),
  );
  state.mainScroll.addEventListener('scroll', syncTopBar, { passive: true });
}
