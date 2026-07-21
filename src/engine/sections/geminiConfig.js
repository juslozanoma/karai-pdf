// ===============================================================================================
// SECCIÓN: Configuración de Gemini API + estadísticas de uso/errores
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { showStatus } from './subtitleHighlight.js';

export function loadApiUsageStats() {
  try {
    return JSON.parse(localStorage.getItem(state.API_USAGE_STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

export function saveApiUsageStatsObj(stats) {
  try {
    localStorage.setItem(state.API_USAGE_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {}
}

export function logApiUsage(model, usageMetadata, isError, errorMessage) {
  const stats = loadApiUsageStats();
  const statsKey = `${state.apiKey}::${model}`;
  if (!stats[statsKey])
    stats[statsKey] = {
      model,
      calls: 0,
      errors: 0,
      promptTokens: 0,
      responseTokens: 0,
      totalTokens: 0,
      lastError: null,
      lastErrorAt: null,
    };
  const entry = stats[statsKey];
  entry.calls++;
  if (isError) {
    entry.errors++;
    entry.lastError = (errorMessage || 'Error desconocido').toString().slice(0, 200);
    entry.lastErrorAt = new Date().toLocaleString('es-CO');
  }
  if (usageMetadata) {
    entry.promptTokens += usageMetadata.promptTokenCount || 0;
    entry.responseTokens += usageMetadata.candidatesTokenCount || 0;
    entry.totalTokens +=
      usageMetadata.totalTokenCount ||
      (usageMetadata.promptTokenCount || 0) + (usageMetadata.candidatesTokenCount || 0);
  }
  saveApiUsageStatsObj(stats);
}

export function renderApiUsagePanel() {
  const stats = loadApiUsageStats();
  const container = document.getElementById('api-usage-content');
  const entries = Object.entries(stats).filter(([k]) => k.startsWith(`${state.apiKey}::`));
  if (entries.length === 0) {
    container.innerHTML = `<p class="text-xs text-gray-500 text-center py-6">Todavía no hay llamadas registradas con la clave de API actual.</p>`;
    return;
  }
  container.innerHTML = entries
    .map(
      ([, e]) => `
                <div class="border rounded-lg p-3 mb-2">
                    <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold text-gray-800">${e.model}</span>
                        <span class="text-xs ${e.errors > 0 ? 'text-red-500' : 'text-gray-400'}">${e.errors} error${e.errors === 1 ? '' : 'es'}</span>
                    </div>
                    <div class="text-xs text-gray-600 grid grid-cols-2 gap-1">
                        <span>Llamadas: <b>${e.calls}</b></span>
                        <span>Tokens totales: <b>${e.totalTokens.toLocaleString('es-CO')}</b></span>
                        <span>Tokens de entrada: <b>${e.promptTokens.toLocaleString('es-CO')}</b></span>
                        <span>Tokens de salida: <b>${e.responseTokens.toLocaleString('es-CO')}</b></span>
                    </div>
                    ${e.lastError ? `<div class="mt-2 text-xs text-red-500 bg-red-50 rounded p-2">Último error (${e.lastErrorAt}): ${e.lastError}</div>` : ''}
                </div>
            `,
    )
    .join('');
}

export async function fetchGemini(prompt, isTranslation = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.GEMINI_MODEL}:generateContent?key=${state.apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: isTranslation ? 0.2 : 0.7 },
  };

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API: ${response.status}`);
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        logApiUsage(state.GEMINI_MODEL, data.usageMetadata, false);
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error('Formato de respuesta inesperado');
    } catch (error) {
      if (i === 2) {
        logApiUsage(state.GEMINI_MODEL, null, true, error.message);
        return isTranslation ? null : 'Ocurrió un error.';
      }
      await state.delay(1000 * (i + 1));
    }
  }
}

export async function fetchGeminiWithModel(
  prompt,
  isTranslation = false,
  modelName = state.GEMINI_MODEL,
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${state.apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: isTranslation ? 0.2 : 0.7 },
  };

  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API: ${response.status}`);
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        logApiUsage(modelName, data.usageMetadata, false);
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error('Formato de respuesta inesperado');
    } catch (error) {
      if (i === 2) {
        logApiUsage(modelName, null, true, error.message);
        return isTranslation ? null : 'Ocurrió un error.';
      }
      await state.delay(1000 * (i + 1));
    }
  }
}

export async function translateTextWithGemini(text) {
  if (!text || text.trim() === '') return '';
  if (!/[a-zA-Z]/.test(text)) return text;

  showStatus('Traduciendo...', true);

  let targetLang = 'español';
  if (state.userSelectedVoiceURI) {
    const selectedVoice = state.synth
      .getVoices()
      .find((v) => v.voiceURI === state.userSelectedVoiceURI);
    if (selectedVoice && selectedVoice.lang) {
      targetLang = `idioma con código ${selectedVoice.lang}`;
    }
  }

  const prompt = `Eres un traductor. Traduce el siguiente texto al ${targetLang} de forma natural. Solo proporciona la traducción directa, sin comillas ni comentarios.\n\nTexto original:\n${text}`;
  const result = await fetchGeminiWithModel(prompt, true, state.GEMINI_STUDY_MODEL);

  // Pequeña pausa para que la burbuja no parpadee si la traducción es instantánea
  setTimeout(() => showStatus('', false), 400);

  return result || text;
}
