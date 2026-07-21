// ===============================================================================================
// SECCIÓN: Modo estudio y explicaciones (tutor IA)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { applyActiveStyle } from './buttonStyles.js';
import { fetchGeminiWithModel } from './geminiConfig.js';
import { showStatus } from './subtitleHighlight.js';

export function getTutorExplanation(paragraphId, text) {
  if (!state.tutorPromises[paragraphId]) {
    let targetLang = 'español';
    if (state.userSelectedVoiceURI) {
      const selectedVoice = state.synth
        .getVoices()
        .find((v) => v.voiceURI === state.userSelectedVoiceURI);
      if (selectedVoice && selectedVoice.lang) {
        targetLang = `idioma con código ${selectedVoice.lang}`;
      }
    }
    const prompt = `Actúa como un tutor excelente. Explica el siguiente párrafo a tu estudiante de forma muy clara, pedagógica y conversacional, respondiendo COMPLETAMENTE en ${targetLang}. Ve directo al grano sin saludos, ni preámbulos. Responde en máximo 100 palabras. Solo responde la explicación hablada, sin formatos:\n\n"${text}"`;
    state.tutorPromises[paragraphId] = fetchGeminiWithModel(
      prompt,
      false,
      state.GEMINI_STUDY_MODEL,
    );
  }
  return state.tutorPromises[paragraphId];
}

export function toggleTutorMode() {
  state.tutorModeActive = !state.tutorModeActive;
  applyActiveStyle('btn-tutor-mode', state.tutorModeActive);
  applyActiveStyle('btn-tutor-mode-mobile', state.tutorModeActive);

  if (state.tutorModeActive) {
    showStatus('Modo Estudio activado. Haz clic en un párrafo.', true);
    setTimeout(() => showStatus('', false), 3000);
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initTutorModeSection() {
  state.btnTutorMode.addEventListener('click', toggleTutorMode);
}
