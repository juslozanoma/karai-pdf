// ===============================================================================================
// SECCIÓN: Traducción de interfaz (t(), idioma de interfaz/lectura, bienvenida)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { TRANSLATIONS, SUPPORTED_LANGS, READING_LANG_NAMES } from '../i18n.js';
import { renderVoiceList, updateMultiLangUI, updateVoiceSelectorUI } from './tts.js';

export function t(key) {
  const dict = TRANSLATIONS[state.appInterfaceLang] || TRANSLATIONS['es'];
  if (dict && dict[key] !== undefined) return dict[key];
  if (TRANSLATIONS['es'][key] !== undefined) return TRANSLATIONS['es'][key];
  return key;
}

export function renderInterfaceLanguage(langCode) {
  state.appInterfaceLang = TRANSLATIONS[langCode] ? langCode : 'es';
  document.documentElement.lang = state.appInterfaceLang;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });

  const interfaceLangSelect = document.getElementById('interface-lang-select');
  if (interfaceLangSelect) interfaceLangSelect.value = state.appInterfaceLang;

  // El botón de reproducir/detener de un mensaje que esté sonando en este momento
  // también debe reflejar el nuevo idioma de inmediato.
  if (state.currentPlayingMsgBtn) state.currentPlayingMsgBtn.title = t('msg_btn_stop_title');

  // Con el multilingüe apagado, la lista de voces se filtra por el idioma de INTERFAZ
  // actual (no siempre español); si el selector de voces ya está listo, se refresca.
  if (state.voiceListUiReady) renderVoiceList();
}

export function applyInterfaceLanguage(langCode) {
  renderInterfaceLanguage(langCode);
  localStorage.setItem('pdfReaderInterfaceLang', state.appInterfaceLang);
}

export function populateInterfaceLangSelect() {
  const select = document.getElementById('interface-lang-select');
  select.innerHTML = '';
  SUPPORTED_LANGS.forEach((l) => {
    const opt = document.createElement('option');
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    select.appendChild(opt);
  });
}

export function applyReadingLanguageDefaults(langCode) {
  state.multiLangEnabled = langCode !== 'es';
  if (typeof updateMultiLangUI === 'function') updateMultiLangUI();

  const tryPickVoice = () => {
    const voices = state.synth.getVoices();
    if (!voices.length) return false;
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(langCode));
    if (match) {
      state.userSelectedVoiceURI = match.voiceURI;
      if (typeof updateVoiceSelectorUI === 'function')
        updateVoiceSelectorUI(match.name, match.lang);
    }
    if (typeof renderVoiceList === 'function') renderVoiceList();
    const recLang = match ? match.lang : langCode;
    if (typeof state.navRecognition !== 'undefined' && state.navRecognition)
      state.navRecognition.lang = recLang;
    if (typeof state.voiceAssistantRecognition !== 'undefined' && state.voiceAssistantRecognition)
      state.voiceAssistantRecognition.lang = recLang;
    return true;
  };
  if (!tryPickVoice()) setTimeout(tryPickVoice, 400);
}

export function getReadingLanguageCode() {
  const v = state.synth.getVoices().find((v) => v.voiceURI === state.userSelectedVoiceURI);
  if (v && v.lang) {
    const code = v.lang.toLowerCase().split('-')[0];
    if (READING_LANG_NAMES[code]) return code;
  }
  return 'es';
}

export function getReadingLanguageName() {
  return READING_LANG_NAMES[getReadingLanguageCode()] || 'español';
}

export function buildLanguageOnboardingGrid() {
  const grid = document.getElementById('language-onboarding-grid');
  grid.innerHTML = '';
  SUPPORTED_LANGS.forEach((l) => {
    const btn = document.createElement('button');
    btn.className =
      'flex flex-col items-center justify-center gap-1 border border-gray-200 rounded-lg py-3 px-2 hover:border-[#7C3AED] hover:bg-[#F8F7FF] transition text-sm font-semibold text-gray-700';
    btn.innerHTML = `<span style="font-size:22px;">${l.flag}</span><span>${l.name}</span>`;
    btn.onclick = () => {
      applyInterfaceLanguage(l.code);
      applyReadingLanguageDefaults(l.code);
      document.getElementById('language-onboarding-modal').classList.add('hidden');
      document.getElementById('language-onboarding-modal').classList.remove('flex');
    };
    grid.appendChild(btn);
  });
}

export function initInterfaceLanguage() {
  if (state.appInterfaceLang) {
    renderInterfaceLanguage(state.appInterfaceLang);
  } else {
    renderInterfaceLanguage('es'); // vista previa; no se guarda hasta que el usuario elija
    const modal = document.getElementById('language-onboarding-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initI18nRuntimeSection() {
  populateInterfaceLangSelect();
  document.getElementById('interface-lang-select').addEventListener('change', (e) => {
    // Cambia SOLO la interfaz: no toca la voz de lectura ni el reconocimiento de voz.
    applyInterfaceLanguage(e.target.value);
  });
  buildLanguageOnboardingGrid();
}
