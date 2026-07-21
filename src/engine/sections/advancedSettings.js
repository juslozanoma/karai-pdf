// ===============================================================================================
// SECCIÓN: Ajustes avanzados (modelo / API key / uso)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { renderApiUsagePanel } from './geminiConfig.js';
import { t } from './i18nRuntime.js';
import { announceShortcut } from './keyboardShortcuts.js';

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initAdvancedSettingsSection() {
  state.advancedModelInput.value =
    localStorage.getItem('pdfReaderModelOverride') || state.GEMINI_MODEL;
  state.advancedStudyModelInput.value =
    localStorage.getItem('pdfReaderStudyModelOverride') || state.GEMINI_STUDY_MODEL;
  state.advancedLiveModelInput.value =
    localStorage.getItem('pdfReaderLiveModelOverride') || state.GEMINI_LIVE_MODEL;
  state.advancedApiKeyInput.value = localStorage.getItem('pdfReaderApiKeyOverride') || '';
  state.advancedToggle.addEventListener('change', () => {
    state.advancedContent.classList.toggle('hidden', !state.advancedToggle.checked);
    state.advancedContent.classList.toggle('flex', state.advancedToggle.checked);
    state.advancedToggleLabel.textContent = state.advancedToggle.checked
      ? t('advanced_settings_hide_txt')
      : t('advanced_settings_toggle_txt');
  });
  document.getElementById('btn-save-advanced-settings').addEventListener('click', () => {
    const newModel = state.advancedModelInput.value.trim();
    const newStudyModel = state.advancedStudyModelInput.value.trim();
    const newLiveModel = state.advancedLiveModelInput.value.trim();
    const newKey = state.advancedApiKeyInput.value.trim();
    if (newModel) {
      state.GEMINI_MODEL = newModel;
      localStorage.setItem('pdfReaderModelOverride', newModel);
    } else {
      localStorage.removeItem('pdfReaderModelOverride');
      state.GEMINI_MODEL = state.DEFAULT_GEMINI_MODEL;
    }
    if (newStudyModel) {
      state.GEMINI_STUDY_MODEL = newStudyModel;
      localStorage.setItem('pdfReaderStudyModelOverride', newStudyModel);
    } else {
      localStorage.removeItem('pdfReaderStudyModelOverride');
      state.GEMINI_STUDY_MODEL = state.DEFAULT_GEMINI_STUDY_MODEL;
    }
    if (newLiveModel) {
      state.GEMINI_LIVE_MODEL = newLiveModel;
      localStorage.setItem('pdfReaderLiveModelOverride', newLiveModel);
    } else {
      localStorage.removeItem('pdfReaderLiveModelOverride');
      state.GEMINI_LIVE_MODEL = state.DEFAULT_GEMINI_LIVE_MODEL;
    }
    if (newKey) {
      state.apiKey = newKey;
      localStorage.setItem('pdfReaderApiKeyOverride', newKey);
    } else {
      localStorage.removeItem('pdfReaderApiKeyOverride');
    }
    state.advancedModelInput.value = state.GEMINI_MODEL;
    state.advancedStudyModelInput.value = state.GEMINI_STUDY_MODEL;
    state.advancedLiveModelInput.value = state.GEMINI_LIVE_MODEL;
    announceShortcut('Modelos y clave guardados');
  });
  document.getElementById('btn-open-api-errors').addEventListener('click', () => {
    renderApiUsagePanel();
    document.getElementById('api-usage-panel').classList.remove('hidden');
    document.getElementById('api-usage-panel').classList.add('flex');
  });
  document.getElementById('btn-close-api-usage').addEventListener('click', () => {
    document.getElementById('api-usage-panel').classList.add('hidden');
    document.getElementById('api-usage-panel').classList.remove('flex');
  });
  document.getElementById('btn-reset-api-usage').addEventListener('click', () => {
    localStorage.removeItem(state.API_USAGE_STORAGE_KEY);
    renderApiUsagePanel();
  });
}
