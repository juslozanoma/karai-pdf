// ===============================================================================================
// SECCIÓN: Síntesis de voz, filtrado interactivo y precarga async
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { applyActiveStyle } from './buttonStyles.js';
import { translateTextWithGemini } from './geminiConfig.js';
import { t } from './i18nRuntime.js';
import { updateSubtitlesUI } from './subtitleResize.js';

export function startSpeechKeepAlive() {
  if (state.speechKeepAliveInterval) return;
  state.speechKeepAliveInterval = setInterval(() => {
    // "Refrescamos" la síntesis de voz periódicamente mientras se está reproduciendo:
    // evita que Chrome la deje muda/pegada tras estar hablando muchos segundos seguidos.
    if (state.isPlaying && !state.isPaused && state.synth.speaking) {
      state.synth.pause();
      state.synth.resume();
    }
  }, 10000);
}

export function stopSpeechKeepAlive() {
  clearInterval(state.speechKeepAliveInterval);
  state.speechKeepAliveInterval = null;
}

export function getFlagForLang(lang) {
  const l = lang.toLowerCase();
  if (l.includes('es')) return '🇪🇸/🇲🇽';
  if (l.includes('en')) return '🇺🇸/🇬🇧';
  return '🏳️';
}

export function updateVoiceSelectorUI(name, lang) {
  const text = `${getFlagForLang(lang)} ${name}`;
  state.voiceSelectorText.textContent = text;
  state.voiceSelectorTextMobile.textContent = text;
}

export function openVoiceDropdownFrom(triggerId) {
  const trigger = document.getElementById(triggerId);
  const menu = document.getElementById('voice-dropdown-menu');

  if (!menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    menu.classList.remove('flex');
    return;
  }
  if (!trigger || trigger.offsetParent === null) return; // El botón disparador no está visible, no hay dónde anclar el menú
  const rect = trigger.getBoundingClientRect();
  menu.style.left = `${Math.max(10, rect.left)}px`;
  menu.style.bottom = `${window.innerHeight - rect.top + 10}px`;
  menu.classList.remove('hidden');
  menu.classList.add('flex');
  document.getElementById('voice-search-input').value = '';
  renderVoiceList();
  document.getElementById('voice-search-input').focus();
}

export function openVoiceSelector() {
  const desktopBtn = document.getElementById('voice-selector-wrapper');
  if (desktopBtn && desktopBtn.offsetParent !== null) {
    openVoiceDropdownFrom('voice-selector-wrapper');
    return;
  }
  const langPanel = document.getElementById('mobile-lang-panel');
  if (langPanel.classList.contains('hidden')) {
    document.getElementById('btn-mobile-lang-menu').click();
  }
  const mobileBtn = document.getElementById('voice-selector-btn-mobile');
  if (mobileBtn && mobileBtn.offsetParent !== null) {
    openVoiceDropdownFrom('voice-selector-btn-mobile');
  }
}

export function renderVoiceList() {
  state.voiceOptionsList.innerHTML = '';
  const filterText = state.voiceSearchInput.value.toLowerCase().trim();

  let displayVoices = state.synth.getVoices().filter((voice) => {
    const lang = voice.lang.toLowerCase();
    // Modo idioma único (multilingüe apagado): TODAS las variantes del idioma de
    // INTERFAZ actual (es-ES, es-MX, en-US, pt-BR, etc., según corresponda), no un
    // idioma fijo.
    if (!state.multiLangEnabled) return lang.startsWith(state.appInterfaceLang || 'es');
    // Modo "Todos los idiomas" (multilingüe encendido): TODAS las voces disponibles,
    // incluyendo español; antes lo excluía por error.
    return true;
  });
  if (filterText)
    displayVoices = displayVoices.filter(
      (v) => v.name.toLowerCase().includes(filterText) || v.lang.toLowerCase().includes(filterText),
    );

  if (displayVoices.length === 0) {
    state.voiceOptionsList.innerHTML = `<div class="p-2 text-sm text-gray-500 text-center">${t('voice_list_no_results')}</div>`;
    return;
  }

  if (!state.userSelectedVoiceURI) {
    const placeholder = t('voice_selector_text_txt');
    state.voiceSelectorText.textContent = placeholder;
    state.voiceSelectorTextMobile.textContent = placeholder;
  }

  displayVoices.forEach((voice, i) => {
    const btn = document.createElement('button');
    const isSelected = state.userSelectedVoiceURI === voice.voiceURI;
    // La primera voz de la lista es la que se usará si el usuario no elige ninguna
    // explícitamente, así que la marcamos como sugerida sin darla por "seleccionada".
    const isDefaultSuggestion = !state.userSelectedVoiceURI && i === 0;

    btn.className = `text-left text-xs p-2 rounded hover:bg-[#F8F7FF] transition w-full whitespace-normal break-words border-b border-gray-100 last:border-0 ${isSelected ? 'bg-[#F8F7FF] font-bold text-[#5B21B6]' : isDefaultSuggestion ? 'text-gray-700 italic' : 'text-gray-700'}`;
    btn.textContent = `${getFlagForLang(voice.lang)} ${voice.name} (${voice.lang})${isDefaultSuggestion ? ` — ${t('voice_default_suggestion_txt')}` : ''}`;

    btn.onclick = (e) => {
      e.stopPropagation();
      const langChanged = state.userSelectedVoiceURI !== voice.voiceURI;
      state.userSelectedVoiceURI = voice.voiceURI;
      updateVoiceSelectorUI(voice.name, voice.lang);
      if (langChanged) {
        // El idioma de destino de la traducción depende de la voz seleccionada,
        // así que al cambiar de voz se debe invalidar la caché de traducciones ya generadas.
        state.translationPromises = {};
        state.tutorPromises = {};
      }
      document.getElementById('voice-dropdown-menu').classList.add('hidden');
      document.getElementById('voice-dropdown-menu').classList.remove('flex');
    };
    state.voiceOptionsList.appendChild(btn);
  });
}

export function updateMultiLangUI() {
  applyActiveStyle('btn-multilang-wrapper', state.multiLangEnabled);

  // Mobile - mismo estilo redondo
  const btnMMob = document.getElementById('btn-multilang-mobile');
  if (btnMMob) {
    btnMMob.classList.remove(
      'bg-[#F1EEFF]',
      'text-[#6D28D9]',
      'bg-gray-50',
      'text-gray-400',
      'bg-transparent',
    );

    if (state.multiLangEnabled) {
      btnMMob.classList.add('bg-[#F1EEFF]', 'text-[#6D28D9]');
    } else {
      btnMMob.classList.add(
        'text-gray-400',
        'bg-transparent',
        'hover:bg-indigo-50',
        'hover:text-indigo-600',
      );
    }
  }
  renderVoiceList();
}

export function updateRate(val) {
  const parsed = parseFloat(val).toFixed(1);
  state.rateSliderDesk.value = parsed;
  state.rateValDesk.textContent = `${parsed}x`;
  state.rateSliderMob.value = parsed;
  state.rateValMob.textContent = `${parsed}x`;
  if (state.isPlaying && state.currentUtterance) state.currentUtterance.rate = parseFloat(parsed);
  if (state.aiUtterance) state.aiUtterance.rate = parseFloat(parsed);
}

export function getTranslation(pageNum, localIdx, text) {
  const key = `${pageNum}_${localIdx}`;
  if (!state.translationPromises[key])
    state.translationPromises[key] = translateTextWithGemini(text);
  return state.translationPromises[key];
}

export function prefetchTranslations(startIndex, count = 2) {
  for (let i = 0; i < count; i++) {
    let idx = startIndex + i;
    if (idx < state.sentences.length) {
      let s = state.sentences[idx];
      let rawText = s.words.map((w) => w.text).join('');
      if (document.getElementById('skip-parens-toggle').checked)
        rawText = rawText.replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, '');
      if (rawText.trim()) {
        let localIdx = state.pageSentences[s.pageNum].indexOf(s);
        getTranslation(s.pageNum, localIdx, rawText);
      }
    }
  }
}

export function clearHighlights() {
  document
    .querySelectorAll('.active-highlight')
    .forEach((span) => span.classList.remove('active-highlight'));
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initTtsSection() {
  updateSubtitlesUI();
  state.voiceListUiReady = true;
  document.getElementById('voice-selector-wrapper').addEventListener('click', (e) => {
    e.stopPropagation();
    openVoiceDropdownFrom('voice-selector-wrapper');
  });
  document.getElementById('voice-selector-btn-mobile').addEventListener('click', (e) => {
    e.stopPropagation();
    openVoiceDropdownFrom('voice-selector-btn-mobile');
  });
  state.voiceSearchInput.addEventListener('input', () => renderVoiceList());
  if (speechSynthesis.onvoiceschanged !== undefined)
    speechSynthesis.onvoiceschanged = () => {
      renderVoiceList();
    };
  setTimeout(renderVoiceList, 100);
  document.getElementById('btn-multilang-wrapper').addEventListener('click', () => {
    state.multiLangEnabled = !state.multiLangEnabled;
    updateMultiLangUI();
  });
  document.getElementById('btn-multilang-mobile').addEventListener('click', () => {
    state.multiLangEnabled = !state.multiLangEnabled;
    updateMultiLangUI();
  });
  state.rateSliderDesk.addEventListener('input', (e) => updateRate(e.target.value));
  state.rateSliderMob.addEventListener('input', (e) => updateRate(e.target.value));
}
