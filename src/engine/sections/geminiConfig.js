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

// Traduce un código de estado HTTP de la API de Gemini a un mensaje claro en español,
// agregando el detalle que devuelve el servidor (si lo hay). Así, en vez de ver solo
// "API: 401" o "Ocurrió un error", el usuario entiende qué pasó y qué hacer.
export function describeApiError(status, serverMessage) {
  const detail = serverMessage ? ` Detalle: ${String(serverMessage).trim()}` : '';
  switch (status) {
    case 400:
      return `Solicitud inválida (400). El modelo o los parámetros enviados no son válidos.${detail}`;
    case 401:
      return `Clave de API inválida, revocada o cuenta deshabilitada (401). Configura una API key válida de Gemini en Ajustes avanzados.${detail}`;
    case 403:
      return `Permiso denegado (403). La clave de API no tiene acceso a este recurso o modelo.${detail}`;
    case 404:
      return `Modelo no encontrado (404). El nombre del modelo no existe o no está disponible para tu clave.${detail}`;
    case 429:
      return `Límite de uso excedido (429). Se agotó la cuota o se hicieron demasiadas peticiones seguidas; espera un momento e inténtalo de nuevo.${detail}`;
    case 500:
    case 502:
    case 503:
    case 504:
      return `Error temporal del servidor de Gemini (${status}). Vuelve a intentarlo en unos segundos.${detail}`;
    default:
      return serverMessage
        ? `Error de la API de Gemini (${status}): ${String(serverMessage).trim()}`
        : `Error de la API de Gemini (${status}).${detail}`;
  }
}

// Lee el cuerpo de una respuesta de error de la API y devuelve el mensaje claro ya armado.
export async function apiErrorFromResponse(response) {
  let serverMessage = '';
  try {
    const body = await response.json();
    serverMessage = (body && body.error && body.error.message) || '';
  } catch (e) {}
  return describeApiError(response.status, serverMessage);
}

// Normaliza cualquier error lanzado (red, JSON, etc.) a un mensaje entendible.
export function describeThrownError(error) {
  const raw = error && error.message ? String(error.message) : String(error || '');
  if (!raw || /failed to fetch|networkerror|load failed|fetch failed/i.test(raw)) {
    return 'No se pudo conectar con el servicio de Gemini. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  return raw;
}

// -----------------------------------------------------------------------------------------------
// Contador de advertencias de API (bandeja de errores del botón de la barra superior)
// -----------------------------------------------------------------------------------------------
function renderApiErrorBadge(count) {
  const el = state.topbarApiWarningsCount;
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : String(count);
    el.classList.remove('hidden');
    el.classList.add('flex');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

export function getApiErrorBadgeCount() {
  const n = parseInt(localStorage.getItem(state.API_ERROR_BADGE_STORAGE_KEY) || '0', 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function setApiErrorBadgeCount(count) {
  const val = Math.max(0, Math.floor(count) || 0);
  try {
    if (val > 0) localStorage.setItem(state.API_ERROR_BADGE_STORAGE_KEY, String(val));
    else localStorage.removeItem(state.API_ERROR_BADGE_STORAGE_KEY);
  } catch (e) {}
  renderApiErrorBadge(val);
}

export function clearApiErrorBadge() {
  setApiErrorBadgeCount(0);
}

export function refreshApiErrorBadge() {
  renderApiErrorBadge(getApiErrorBadgeCount());
}

export function apiErrorLegendHtml() {
  return `
    <details class="mb-3 text-xs text-gray-500 bg-gray-50 rounded p-2">
      <summary class="cursor-pointer font-semibold text-gray-600">¿Qué significa cada código?</summary>
      <ul class="mt-2 space-y-1 list-disc pl-4">
        <li><b>400</b> — Solicitud inválida: modelo o parámetros incorrectos.</li>
        <li><b>401</b> — Clave de API inválida, revocada o cuenta deshabilitada.</li>
        <li><b>403</b> — La clave no tiene permiso para ese modelo o recurso.</li>
        <li><b>404</b> — El modelo no existe o no está disponible para tu clave.</li>
        <li><b>429</b> — Cuota o velocidad de peticiones excedida (espera un momento).</li>
        <li><b>5xx</b> — Error temporal del servidor de Gemini (reintenta).</li>
      </ul>
    </details>`;
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
    entry.lastError = (errorMessage || 'Error desconocido').toString().slice(0, 300);
    entry.lastErrorAt = new Date().toLocaleString('es-CO');
    setApiErrorBadgeCount(getApiErrorBadgeCount() + 1);
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
    container.innerHTML = `${apiErrorLegendHtml()}<p class="text-xs text-gray-500 text-center py-6">Todavía no hay llamadas registradas con la clave de API actual.</p>`;
    return;
  }
  container.innerHTML =
    apiErrorLegendHtml() +
    entries
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
      if (!response.ok) {
        const friendly = await apiErrorFromResponse(response);
        // Los errores de cliente (4xx) no se solucionan reintentando: la clave o el
        // modelo no van a cambiar solos, así que se reportan de inmediato.
        if (response.status >= 400 && response.status < 500) {
          logApiUsage(state.GEMINI_MODEL, null, true, friendly);
          return isTranslation ? null : friendly;
        }
        throw new Error(friendly);
      }
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        logApiUsage(state.GEMINI_MODEL, data.usageMetadata, false);
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error('Formato de respuesta inesperado del servidor de Gemini.');
    } catch (error) {
      const friendly = describeThrownError(error);
      if (i === 2) {
        logApiUsage(state.GEMINI_MODEL, null, true, friendly);
        return isTranslation ? null : friendly;
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
      if (!response.ok) {
        const friendly = await apiErrorFromResponse(response);
        if (response.status >= 400 && response.status < 500) {
          logApiUsage(modelName, null, true, friendly);
          return isTranslation ? null : friendly;
        }
        throw new Error(friendly);
      }
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        logApiUsage(modelName, data.usageMetadata, false);
        return data.candidates[0].content.parts[0].text.trim();
      }
      throw new Error('Formato de respuesta inesperado del servidor de Gemini.');
    } catch (error) {
      const friendly = describeThrownError(error);
      if (i === 2) {
        logApiUsage(modelName, null, true, friendly);
        return isTranslation ? null : friendly;
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
