// ===============================================================================================
// SECCIÓN: Recordatorios de salud
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { t } from './i18nRuntime.js';

export function updateHealthNextReminderTxt() {
  if (!state.healthNotificationsEnabled) {
    state.healthNextReminderTxt.classList.add('hidden');
    return;
  }
  const nextReminderTime = new Date(
    state.appOpenTime + (state.lastHealthReminderHour + 1) * 60 * 60 * 1000,
  );
  const label = nextReminderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.healthNextReminderTxt.textContent = `${t('health_next_reminder_txt') || 'Próximo aviso'}: ${label}`;
  state.healthNextReminderTxt.classList.remove('hidden');
}

export function showHealthReminder() {
  state.healthReminderModal.classList.remove('hidden');
  state.healthReminderModal.classList.add('flex');
  lucide.createIcons();
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initHealthRemindersSection() {
  state.healthNotificationsToggle.checked = state.healthNotificationsEnabled;
  updateHealthNextReminderTxt();
  document.getElementById('btn-close-health-reminder').addEventListener('click', () => {
    state.healthReminderModal.classList.add('hidden');
    state.healthReminderModal.classList.remove('flex');
  });
  state.healthNotificationsToggle.addEventListener('change', () => {
    state.healthNotificationsEnabled = state.healthNotificationsToggle.checked;
    localStorage.setItem('pdfReaderHealthNotifications', state.healthNotificationsEnabled);
    updateHealthNextReminderTxt();
  });
}
