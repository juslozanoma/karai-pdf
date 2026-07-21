// ===============================================================================================
// SECCIÓN: Modo rastreador: envío automático
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { updateMenuButtonState } from './buttonStyles.js';
import { toggleFixedMenu } from './floatingMenus.js';
import { showHealthReminder, updateHealthNextReminderTxt } from './healthReminders.js';
import { recalculateSentencesOnly } from './ignoreFigures.js';

export function updateMarginSlidersVisuals() {
  if (state.marginsToggle.checked) {
    state.topMarginSlider.value = state.savedMargins.top;
    state.botMarginSlider.value = state.savedMargins.bot;
    state.leftMarginSlider.value = state.savedMargins.left;
    state.rightMarginSlider.value = state.savedMargins.right;
    state.topMarginSlider.disabled = false;
    state.botMarginSlider.disabled = false;
    state.leftMarginSlider.disabled = false;
    state.rightMarginSlider.disabled = false;
    state.marginContainer.classList.remove('opacity-50');
  } else {
    state.topMarginSlider.value = 0;
    state.botMarginSlider.value = 0;
    state.leftMarginSlider.value = 0;
    state.rightMarginSlider.value = 0;
    state.topMarginSlider.disabled = true;
    state.botMarginSlider.disabled = true;
    state.leftMarginSlider.disabled = true;
    state.rightMarginSlider.disabled = true;
    state.marginContainer.classList.add('opacity-50');
  }
  state.topMarginVal.textContent = state.topMarginSlider.value + '%';
  state.botMarginVal.textContent = state.botMarginSlider.value + '%';
  state.leftMarginVal.textContent = state.leftMarginSlider.value + '%';
  state.rightMarginVal.textContent = state.rightMarginSlider.value + '%';
}

export function showMarginGuides() {
  const topPct = state.topMarginSlider.value + '%',
    botPct = state.botMarginSlider.value + '%';
  const leftPct = state.leftMarginSlider.value + '%',
    rightPct = state.rightMarginSlider.value + '%';
  document.querySelectorAll('.margin-guide-bar-top').forEach((el) => {
    el.classList.remove('hidden');
    el.style.height = topPct;
  });
  document.querySelectorAll('.margin-guide-bar-bottom').forEach((el) => {
    el.classList.remove('hidden');
    el.style.height = botPct;
  });
  document.querySelectorAll('.margin-guide-bar-left').forEach((el) => {
    el.classList.remove('hidden');
    el.style.width = leftPct;
  });
  document.querySelectorAll('.margin-guide-bar-right').forEach((el) => {
    el.classList.remove('hidden');
    el.style.width = rightPct;
  });
  state.btnApplyMargins.classList.remove('hidden');
}

export function hideMarginGuides() {
  document
    .querySelectorAll(
      '.margin-guide-bar-top, .margin-guide-bar-bottom, .margin-guide-bar-left, .margin-guide-bar-right',
    )
    .forEach((el) => el.classList.add('hidden'));
  state.btnApplyMargins.classList.add('hidden');
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initAutoTrackSendSection() {
  state.autoTrackSendToggle.checked = state.autoTrackSendEnabled;
  state.autoTrackSendToggle.addEventListener('change', () => {
    state.autoTrackSendEnabled = state.autoTrackSendToggle.checked;
    localStorage.setItem('pdfReaderAutoTrackSend', state.autoTrackSendEnabled);
  });
  setInterval(() => {
    if (!state.healthNotificationsEnabled) return;
    const elapsedHours = Math.floor((Date.now() - state.appOpenTime) / (60 * 60 * 1000));
    if (elapsedHours > state.lastHealthReminderHour) {
      state.lastHealthReminderHour = elapsedHours;
      showHealthReminder();
      updateHealthNextReminderTxt();
    }
  }, 30000);
  state.marginsToggle.addEventListener('change', updateMarginSlidersVisuals);
  state.topMarginSlider.addEventListener('input', (e) => {
    state.topMarginVal.textContent = e.target.value + '%';
    showMarginGuides();
  });
  state.botMarginSlider.addEventListener('input', (e) => {
    state.botMarginVal.textContent = e.target.value + '%';
    showMarginGuides();
  });
  state.leftMarginSlider.addEventListener('input', (e) => {
    state.leftMarginVal.textContent = e.target.value + '%';
    showMarginGuides();
  });
  state.rightMarginSlider.addEventListener('input', (e) => {
    state.rightMarginVal.textContent = e.target.value + '%';
    showMarginGuides();
  });
  state.btnMargins.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFixedMenu('btn-margins', 'margins-panel');
    hideMarginGuides();
  });
  state.btnApplyMargins.addEventListener('click', () => {
    if (state.marginsToggle.checked) {
      state.savedMargins.top = parseInt(state.topMarginSlider.value);
      state.savedMargins.bot = parseInt(state.botMarginSlider.value);
      state.savedMargins.left = parseInt(state.leftMarginSlider.value);
      state.savedMargins.right = parseInt(state.rightMarginSlider.value);
    }
    state.isMarginsActive = state.marginsToggle.checked;
    document.getElementById('margins-panel').classList.add('hidden');
    hideMarginGuides();
    updateMenuButtonState();
    recalculateSentencesOnly();
  });
}
