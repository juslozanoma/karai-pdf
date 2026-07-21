// ===============================================================================================
// SECCIÓN: Conversación en vivo (Gemini Live API, voz a voz)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import {
  addVolumeButtonToAssistantBubble,
  attachEarlyVoiceMsgButton,
  createAssistantBubble,
  createChatStreamCursor,
  createUserBubble,
  resetMsgBtnIcon,
  searchLocalRAGChunks,
  setMsgBtnToStop,
  smartBuildRagContextAndPrompt,
  wrapBubbleInWordSpansAndGetTailMap,
} from './chat.js';
import { startRecognitionSafe } from './compassNavigation.js';
import { fetchGemini, logApiUsage } from './geminiConfig.js';
import { getReadingLanguageName } from './i18nRuntime.js';
import { updatePipUI } from './pictureInPicture.js';
import {
  expandGreekLettersInMap,
  expandUnitsInMap,
  showStatus,
  stopSpeech,
} from './subtitleHighlight.js';
import { updateVoiceSelectorUI } from './tts.js';

export function buildLiveDocumentContext(maxChars = 50000) {
  if (!state.documentObj) return '';
  const numPages = state.documentObj.numPages || 0;
  let combined = '';
  for (let p = 1; p <= numPages; p++) {
    if (state.fullDocTextContext[p])
      combined += `\n\n[Página ${p}]\n${state.fullDocTextContext[p]}`;
    if (combined.length >= maxChars) {
      combined +=
        '\n\n[...el documento continúa. Usa la función buscar_en_documento para consultar el resto...]';
      break;
    }
  }
  return combined.trim();
}

export function buildLiveSystemInstruction() {
  const context = buildLiveDocumentContext();
  return `Eres un tutor experto que conversa por VOZ con un estudiante sobre un documento (PDF/DOCX) que tiene abierto.
            Responde siempre en ${getReadingLanguageName()}, de forma natural, conversacional y CONCISA: son respuestas HABLADAS, no un texto para leer, así que evita listas largas, markdown o símbolos.
            NUNCA uses paréntesis en tus respuestas, para nada: habla como si lo estuvieras explicando de corrido, en oraciones fluidas.
            Toda unidad de medida del Sistema Internacional debe decirse siempre con su nombre completo, nunca con la sigla (di "nanómetros" en vez de "nm", "kilogramos" en vez de "kg", "grados Celsius" en vez de "°C", "metros por segundo" en vez de "m/s").
            Cuando cites datos del documento, menciona brevemente la página si la conoces (por ejemplo "en la página 4...").
            Si necesitas información de una parte del documento que no aparece en el contexto de abajo, usa la función buscar_en_documento con palabras clave relevantes antes de responder.
            Si la pregunta no tiene relación directa con el documento, igual puedes responder con tu conocimiento general, pero acláralo brevemente.

            CONTEXTO INICIAL DEL DOCUMENTO (puede estar incompleto; usa buscar_en_documento para el resto):
            ${context || 'El documento aún se está indexando, usa buscar_en_documento para consultar su contenido'}`;
}

export function runLiveDocumentSearch(consulta) {
  const chunks = searchLocalRAGChunks(consulta, 6);
  if (chunks.length === 0) return 'No se encontró información relacionada en el documento.';
  return chunks.map((c) => `[Páginas ${c.startPage}-${c.endPage}]: ${c.text}`).join('\n\n');
}

export function floatTo16BitPCMBase64(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0, offset = 0; i < float32Array.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize)
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  return btoa(binary);
}

export function resampleFloat32(input, inputSampleRate, outputSampleRate) {
  if (!input.length || inputSampleRate === outputSampleRate) return input;
  const ratio = inputSampleRate / outputSampleRate;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const idxLow = Math.floor(srcIndex);
    const idxHigh = Math.min(idxLow + 1, input.length - 1);
    const frac = srcIndex - idxLow;
    result[i] = input[idxLow] * (1 - frac) + input[idxHigh] * frac;
  }
  return result;
}

export function base64PCM16ToFloat32(base64Data) {
  const binary = atob(base64Data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const sampleCount = bytes.length / 2;
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    const int16 = view.getInt16(i * 2, true);
    float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

export function playLiveAudioChunk(base64Data) {
  if (!state.livePlaybackContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    try {
      state.livePlaybackContext = new AudioContextClass({ sampleRate: 24000 });
    } catch (e) {
      state.livePlaybackContext = new AudioContextClass();
    }
  }
  if (state.livePlaybackContext.state === 'suspended')
    state.livePlaybackContext.resume().catch(() => {});
  const float32 = base64PCM16ToFloat32(base64Data);
  if (float32.length === 0) return;
  const audioBuffer = state.livePlaybackContext.createBuffer(1, float32.length, 24000);
  audioBuffer.getChannelData(0).set(float32);
  const source = state.livePlaybackContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(state.livePlaybackContext.destination);
  const now = state.livePlaybackContext.currentTime;
  const startAt = Math.max(now, state.liveNextPlayTime);
  source.start(startAt);
  state.liveNextPlayTime = startAt + audioBuffer.duration;
  state.livePlayingSources.push(source);
  source.onended = () => {
    state.livePlayingSources = state.livePlayingSources.filter((s) => s !== source);
  };
  updateLiveStatus('Hablando...', 'speaking');
}

export function clearLiveAudioQueue() {
  state.livePlayingSources.forEach((s) => {
    try {
      s.stop();
    } catch (e) {}
  });
  state.livePlayingSources = [];
  if (state.livePlaybackContext) state.liveNextPlayTime = state.livePlaybackContext.currentTime;
}

export async function startLiveMicCapture() {
  try {
    // Constraints "ideales" en vez de exigidas: algunos celulares (sobre todo Android
    // con hardware/WebView menos comunes) rechazan la captura entera si no pueden
    // cumplir exactamente con echoCancellation/noiseSuppression/channelCount.
    state.liveMicStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: { ideal: 1 },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
      },
    });
  } catch (e) {
    let msg = 'No se pudo acceder al micrófono';
    if (e && e.name === 'NotAllowedError')
      msg = 'Permiso de micrófono denegado. Revisa los permisos del sitio en tu navegador.';
    else if (e && e.name === 'NotFoundError')
      msg = 'No se encontró ningún micrófono en este dispositivo.';
    else if (e && e.name === 'NotReadableError')
      msg = 'El micrófono está siendo usado por otra app.';
    updateLiveStatus(msg, 'error');
    return;
  }
  if (!state.liveSessionActive) {
    state.liveMicStream.getTracks().forEach((t) => t.stop());
    return;
  }

  // No se fuerza una frecuencia de muestreo concreta: se deja que el contexto use la
  // nativa del dispositivo (muchos navegadores móviles ignoran o rechazan un valor
  // distinto) y se remuestrea manualmente a 16000 Hz antes de enviar cada bloque de audio.
  state.liveMicContext = new (window.AudioContext || window.webkitAudioContext)();
  if (state.liveMicContext.state === 'suspended') {
    try {
      await state.liveMicContext.resume();
    } catch (e) {}
  }
  const nativeSampleRate = state.liveMicContext.sampleRate;

  const source = state.liveMicContext.createMediaStreamSource(state.liveMicStream);
  state.liveMicProcessor = state.liveMicContext.createScriptProcessor(4096, 1, 1);
  source.connect(state.liveMicProcessor);
  state.liveMicProcessor.connect(state.liveMicContext.destination);
  state.liveMicProcessor.onaudioprocess = (e) => {
    if (
      !state.liveSessionActive ||
      !state.liveSetupComplete ||
      !state.liveWs ||
      state.liveWs.readyState !== WebSocket.OPEN
    )
      return;
    const resampled = resampleFloat32(e.inputBuffer.getChannelData(0), nativeSampleRate, 16000);
    const base64Audio = floatTo16BitPCMBase64(resampled);
    state.liveWs.send(
      JSON.stringify({
        realtimeInput: { audio: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' } },
      }),
    );
  };
  updateLiveStatus('Escuchando...', 'listening');
}

export function stopLiveMicCapture() {
  if (state.liveMicProcessor) {
    state.liveMicProcessor.disconnect();
    state.liveMicProcessor.onaudioprocess = null;
    state.liveMicProcessor = null;
  }
  if (state.liveMicContext) {
    state.liveMicContext.close().catch(() => {});
    state.liveMicContext = null;
  }
  if (state.liveMicStream) {
    state.liveMicStream.getTracks().forEach((t) => t.stop());
    state.liveMicStream = null;
  }
}

export function addLiveTranscriptBubble(role) {
  const container = document.getElementById('chat-history');
  const bubble = document.createElement('div');
  bubble.className =
    'flex flex-col gap-1 w-full animate-fade-in ' + (role === 'user' ? 'items-end' : 'items-start');
  const inner = document.createElement('div');
  inner.className =
    role === 'user'
      ? 'bg-[#7C3AED] text-white px-3 py-2 rounded-lg rounded-br-none max-w-[85%] text-sm'
      : 'bg-white border px-3 py-2 rounded-lg rounded-bl-none max-w-[85%] text-sm text-gray-700';
  bubble.appendChild(inner);
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;
  return inner;
}

export function updateLiveStatus(text, state) {
  const btn = document.getElementById('btn-start-live-from-chat');
  if (btn) {
    if (state === 'connecting') {
      btn.innerHTML = '<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i> Conectando...';
      btn.classList.add('opacity-75', 'cursor-wait');
    } else if (state === 'listening') {
      btn.innerHTML = '<i data-lucide="mic" class="w-3 h-3"></i> Escuchando...';
      btn.classList.remove('opacity-75', 'cursor-wait');
      btn.classList.add('bg-red-600', 'hover:bg-red-700');
      btn.classList.remove('bg-[#7C3AED]', 'hover:bg-[#6D28D9]');
      btn.onclick = closeLiveConversation;
    } else if (state === 'speaking') {
      btn.innerHTML =
        '<i data-lucide="volume-2" class="w-3 h-3"></i> Clic para finalizar conversación';
    } else if (state === 'error') {
      btn.innerHTML = '<i data-lucide="alert-circle" class="w-3 h-3"></i> Error. Reintentar';
      btn.classList.remove('opacity-75', 'cursor-wait', 'bg-red-600', 'hover:bg-red-700');
      btn.classList.add('bg-[#7C3AED]', 'hover:bg-[#6D28D9]');
      btn.onclick = () => openLiveConversation();
      btn.title = text || '';
      // El motivo específico (p.ej. "permiso de micrófono denegado") se muestra en el
      // aviso flotante, visible también en el celular, no solo como tooltip de escritorio.
      if (text) {
        showStatus(text, true);
        setTimeout(() => showStatus('', false), 3500);
      }
    }
    lucide.createIcons();
  }
}

export function handleLiveServerMessage(data) {
  if (data.setupComplete) {
    state.liveSetupComplete = true;
    startLiveMicCapture();
    return;
  }

  if (data.serverContent) {
    const sc = data.serverContent;

    if (sc.interrupted) {
      clearLiveAudioQueue();
      state.liveCurrentAssistantBubble = null;
      state.liveCurrentUserBubble = null;
    }

    if (sc.inputTranscription && sc.inputTranscription.text) {
      if (!state.liveCurrentUserBubble)
        state.liveCurrentUserBubble = addLiveTranscriptBubble('user');
      state.liveCurrentUserBubble.textContent += sc.inputTranscription.text;
      document.getElementById('chat-history').scrollTop =
        document.getElementById('chat-history').scrollHeight;
    }

    if (sc.outputTranscription && sc.outputTranscription.text) {
      if (!state.liveCurrentAssistantBubble)
        state.liveCurrentAssistantBubble = addLiveTranscriptBubble('assistant');
      state.liveCurrentAssistantBubble.textContent += sc.outputTranscription.text;
      document.getElementById('chat-history').scrollTop =
        document.getElementById('chat-history').scrollHeight;
      updateLiveStatus('Hablando...', 'speaking');
    }

    if (sc.modelTurn && sc.modelTurn.parts) {
      sc.modelTurn.parts.forEach((part) => {
        if (part.inlineData && part.inlineData.data) playLiveAudioChunk(part.inlineData.data);
      });
    }

    if (sc.turnComplete) {
      if (state.liveCurrentUserBubble && state.liveCurrentUserBubble.textContent.trim()) {
        addVolumeButtonToAssistantBubble(
          state.liveCurrentUserBubble,
          state.liveCurrentUserBubble.textContent.trim(),
        );
      }
      if (state.liveCurrentAssistantBubble && state.liveCurrentAssistantBubble.textContent.trim()) {
        addVolumeButtonToAssistantBubble(
          state.liveCurrentAssistantBubble,
          state.liveCurrentAssistantBubble.textContent.trim(),
        );
      }
      state.liveCurrentUserBubble = null;
      state.liveCurrentAssistantBubble = null;
      updateLiveStatus('Escuchando...', 'listening');
    }
  }

  if (data.toolCall && data.toolCall.functionCalls) {
    const responses = data.toolCall.functionCalls.map((call) => {
      const consulta = call.args && call.args.consulta ? call.args.consulta : '';
      return {
        id: call.id,
        name: call.name,
        response: { result: runLiveDocumentSearch(consulta) },
      };
    });
    if (state.liveWs && state.liveWs.readyState === WebSocket.OPEN) {
      state.liveWs.send(JSON.stringify({ toolResponse: { functionResponses: responses } }));
    }
  }
}

export function connectLiveWebSocket() {
  if (!state.apiKey) {
    updateLiveStatus('Falta configurar la API key', 'error');
    return;
  }
  const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${state.apiKey}`;
  state.liveWs = new WebSocket(wsUrl);

  state.liveWs.onopen = () => {
    logApiUsage(state.GEMINI_LIVE_MODEL, null, false);
    state.liveWs.send(
      JSON.stringify({
        setup: {
          model: `models/${state.GEMINI_LIVE_MODEL}`,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: state.userSelectedLiveVoice,
                },
              },
            },
          },
          systemInstruction: { parts: [{ text: buildLiveSystemInstruction() }] },
          tools: [{ functionDeclarations: [state.liveFunctionDeclaration] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
              endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
              prefixPaddingMs: 300,
              silenceDurationMs: 1500,
            },
          },
        },
      }),
    );
  };

  state.liveWs.onmessage = async (event) => {
    let raw = event.data;
    if (raw instanceof Blob) raw = await raw.text();
    try {
      handleLiveServerMessage(JSON.parse(raw));
    } catch (e) {}
  };

  state.liveWs.onerror = () => {
    logApiUsage(state.GEMINI_LIVE_MODEL, null, true, 'Error de conexión WebSocket');
    updateLiveStatus('Error de conexión', 'error');
  };

  state.liveWs.onclose = () => {
    state.liveSetupComplete = false;
    if (state.liveSessionActive) {
      updateLiveStatus('Conexión finalizada', 'error');
      closeLiveConversation();
    }
  };
}

export async function restartLiveWithNewVoice() {
  if (!state.liveSessionActive) return;

  // Cerrar silenciosamente SIN restaurar la UI (mantiene controles Live visibles)
  closeLiveConversation(true, false);

  // Pequeña pausa para limpiar el WebSocket
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Reiniciar silenciosamente (sin mensaje de "Modo Live activado")
  openLiveConversation(true);
}

export function openLiveConversation(silent = false) {
  if (!state.documentObj) {
    showStatus('Primero sube un Documento', true);
    setTimeout(() => showStatus('', false), 2000);
    return;
  }
  if (state.liveSessionActive) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    showStatus('Tu navegador no admite audio en tiempo real (Modo Live)', true);
    setTimeout(() => showStatus('', false), 3000);
    return;
  }

  state.liveSessionActive = true;
  state.liveSetupComplete = false;
  state.liveNextPlayTime = 0;
  state.liveCurrentUserBubble = null;
  state.liveCurrentAssistantBubble = null;

  if (state.livePlaybackContext) {
    try {
      state.livePlaybackContext.close();
    } catch (e) {}
  }
  try {
    state.livePlaybackContext = new AudioContextClass({ sampleRate: 24000 });
  } catch (e) {
    // Algunos navegadores móviles no permiten fijar una frecuencia de muestreo concreta
    // al crear el AudioContext: se usa la nativa del dispositivo. El buffer de
    // reproducción se sigue creando a 24000 Hz y el navegador lo reajusta
    // automáticamente al reproducirlo, sin distorsión.
    state.livePlaybackContext = new AudioContextClass();
  }
  state.livePlaybackContext.resume().catch(() => {});
  state.liveNextPlayTime = 0;

  // Abrir panel de chat si está cerrado
  if (state.chatPanel.classList.contains('hidden')) {
    state.chatPanel.classList.remove('hidden');
    state.chatPanel.classList.add('flex');
    state.btnToggleChat.classList.add('bg-[#7C3AED]', 'text-white');
  }

  // Mostrar controles Live, ocultar input normal
  document.getElementById('live-chat-controls').classList.remove('hidden');
  document.getElementById('live-chat-controls').classList.add('flex');
  document.getElementById('normal-chat-input').classList.add('hidden');
  document.getElementById('normal-chat-input').classList.remove('flex');

  // Solo mostrar mensaje inicial si NO es silencioso
  if (!silent) {
    if (state.chatHistory.querySelector('.text-center.text-xs')) state.chatHistory.innerHTML = '';
    const introWrap = document.createElement('div');
    introWrap.className = 'flex flex-col gap-1 items-center w-full animate-fade-in';
    introWrap.innerHTML =
      '<div class="bg-[#F8F7FF] text-[#7C3AED] text-xs p-2 rounded-lg text-center max-w-[90%]">Modo Live activado. Habla cuando quieras. El asistente conoce todo el documento.</div>';
    state.chatHistory.appendChild(introWrap);
    state.chatHistory.scrollTop = state.chatHistory.scrollHeight;
  }

  updateLiveStatus('Conectando...', 'connecting');

  connectLiveWebSocket();
  if (typeof updatePipUI === 'function') updatePipUI();
}

export function closeLiveConversation(silent = false, restoreUI = true) {
  state.liveSessionActive = false;
  state.liveSetupComplete = false;

  stopLiveMicCapture();
  clearLiveAudioQueue();

  if (state.liveWs) {
    try {
      state.liveWs.close();
    } catch (e) {}
    state.liveWs = null;
  }
  if (state.livePlaybackContext) {
    state.livePlaybackContext.close().catch(() => {});
    state.livePlaybackContext = null;
  }

  // Solo restaurar la UI si se pide explícitamente (no en reinicio silencioso por cambio de voz)
  if (restoreUI) {
    document.getElementById('live-chat-controls').classList.add('hidden');
    document.getElementById('live-chat-controls').classList.remove('flex');
    document.getElementById('normal-chat-input').classList.remove('hidden');
    document.getElementById('normal-chat-input').classList.add('flex');
  }
  if (typeof updatePipUI === 'function') updatePipUI();
}

export function populateLiveVoices() {
  if (!state.liveVoiceSelect) return;

  state.liveVoiceSelect.innerHTML = '';

  state.GEMINI_LIVE_VOICES.forEach((name) => {
    const option = document.createElement('option');

    option.value = name;
    option.textContent = name;

    state.liveVoiceSelect.appendChild(option);
  });

  state.liveVoiceSelect.value = state.userSelectedLiveVoice;
}

export async function classifyIntentAsNavigation(transcript) {
  // Atajo rápido: si menciona directamente un número de página, es navegación segura
  if (/(?:p[áa]gina|pag\.?)\s*\d+/i.test(transcript) || /^\d+$/.test(transcript.trim()))
    return true;

  const prompt = `Clasifica la siguiente instrucción de voz de un usuario que interactúa con un lector de documentos.
            Instrucción: "${transcript}"

            Decide si es:
            A) NAVEGACION → el usuario quiere IR, SALTAR o MOVERSE a una parte específica del documento (un capítulo, sección, página, figura, tabla, gráfico, imagen, "el inicio", "el final", "la primera/última figura", "el índice", etc.)
            B) PREGUNTA → el usuario está preguntando algo, pidiendo una explicación, definición, resumen, opinión o cualquier información sobre el CONTENIDO del documento.

            Responde ÚNICAMENTE con una palabra: NAVEGACION o PREGUNTA. Sin puntos, comillas ni texto adicional.`;

  const result = await fetchGemini(prompt, true);
  return !!(result && result.toUpperCase().includes('NAVEGACION'));
}

export async function routeMicCommand(transcript) {
  if (!state.documentObj) {
    showStatus('Primero sube un Documento', true);
    setTimeout(() => showStatus('', false), 2500);
    return;
  }
  if (state.isDocumentIndexing) {
    showStatus('Documento aún no indexado', true);
    setTimeout(() => showStatus('', false), 2000);
    return;
  }

  // El micrófono ya solo pregunta sobre el documento; navegar por voz ("brújula") es
  // función exclusiva de su propio botón (btn-compass), para no tener que adivinar la
  // intención del usuario.
  if (state.documentRAGChunks.length > 0) {
    processVoiceQueryStreaming(transcript);
  } else {
    showStatus('No se encontró contenido indexado', true);
    setTimeout(() => showStatus('', false), 2000);
  }
}

export async function processVoiceQueryStreaming(questionText) {
  stopSpeech();

  const cleanQuestion = questionText.trim();
  if (!cleanQuestion) {
    showStatus('', false);
    return;
  }

  // Guardar en contexto antes de enviar
  state.chatContext.push({ role: 'user', text: cleanQuestion });
  if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();

  // Crear burbujas en el chat (aunque el panel esté cerrado)
  createUserBubble(cleanQuestion, null, () => processVoiceQueryStreaming(cleanQuestion));
  const bubbleEl = createAssistantBubble('Analizando documento...');

  // --- ANIMACIÓN DE ESPERA ROTATIVA (Chat + Flotante) ---
  const waitingMessages = [
    'Analizando documento...',
    'Buscando en el contenido...',
    'Procesando la información...',
    'Consultando fuentes...',
    'Organizando la respuesta...',
    'Casi listo...',
  ];
  let msgIndex = 0;
  bubbleEl.dataset.waiting = 'true';
  showStatus(waitingMessages[0], true);

  const waitingInterval = setInterval(() => {
    if (bubbleEl.dataset.waiting !== 'true') {
      clearInterval(waitingInterval);
      return;
    }
    msgIndex = (msgIndex + 1) % waitingMessages.length;
    bubbleEl.textContent = waitingMessages[msgIndex];
    showStatus(waitingMessages[msgIndex], true);
  }, 3000);
  // --------------------------------------------------------

  try {
    const { prompt: fullPrompt, needsSearch } = await smartBuildRagContextAndPrompt(cleanQuestion);

    // Construir historial de contexto para Gemini
    const historyParts = [];
    for (let i = 0; i < state.chatContext.length - 1; i++) {
      const entry = state.chatContext[i];
      if (entry.role === 'user') {
        historyParts.push({ role: 'user', parts: [{ text: entry.text }] });
      } else {
        historyParts.push({ role: 'model', parts: [{ text: entry.text }] });
      }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${state.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }],
        ...(needsSearch ? { tools: [{ google_search: {} }] } : {}),
      }),
    });
    if (!response.ok || !response.body) throw new Error(`API: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponseCache = '';
    let sentenceBufferForVoice = '';
    let lastUsageMetadata = null;

    // PRIMER CHUNK REAL: detener animación de espera
    bubbleEl.dataset.waiting = 'false';
    clearInterval(waitingInterval);
    showStatus('', false);
    const streamCursor = createChatStreamCursor(bubbleEl);
    attachEarlyVoiceMsgButton(bubbleEl);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.usageMetadata) lastUsageMetadata = data.usageMetadata;
            const chunk = data.candidates?.[0]?.content?.parts?.[0].text || '';
            if (!chunk) continue;
            fullResponseCache += chunk;
            streamCursor.append(chunk);
            state.chatHistory.scrollTop = state.chatHistory.scrollHeight;

            if (state.isChatSoundEnabled) {
              sentenceBufferForVoice += chunk;
              if (sentenceBufferForVoice.match(/[.!?\n]/)) {
                const { text: chunkText, map: chunkMap } = streamCursor.finalizeSentence();
                if (chunkText.trim().length > 0)
                  speakAIResponse(chunkText, null, { map: chunkMap });
                sentenceBufferForVoice = '';
              }
            }
          } catch (e) {}
        }
      }
    }

    logApiUsage(state.GEMINI_MODEL, lastUsageMetadata, false);
    // Guardar respuesta en contexto
    const assistantResponse = fullResponseCache.replace(/[*#_`~]/g, '').trim();
    if (assistantResponse) {
      state.chatContext.push({ role: 'model', text: assistantResponse });
      if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();
    }

    if (state.isChatSoundEnabled && sentenceBufferForVoice.trim().length > 0) {
      const { text: chunkText, map: chunkMap } = streamCursor.finalizeSentence();
      speakAIResponse(chunkText, null, { map: chunkMap });
    }

    // Agregar botón de volumen
    // Red de seguridad: si se activó el botón temprano en modo "detener" pero al
    // final no se llegó a poner en cola ningún audio (ej. respuesta vacía o error),
    // lo regresamos a su estado normal para que no quede trabado.
    if (state.isChatSoundEnabled && state.autoVoiceQueueCount === 0) {
      const earlyBtn = bubbleEl.querySelector('.btn-voice-msg');
      if (earlyBtn && state.autoVoiceMsgBtn === earlyBtn) {
        resetMsgBtnIcon(earlyBtn);
        state.currentPlayingMsgBtn = null;
        state.autoVoiceMsgBtn = null;
      }
    }
    addVolumeButtonToAssistantBubble(bubbleEl, assistantResponse);
  } catch (error) {
    logApiUsage(state.GEMINI_MODEL, null, true, error.message);
    bubbleEl.dataset.waiting = 'false';
    clearInterval(waitingInterval);
    showStatus('', false);
    const errorMsg = 'Ocurrió un error al procesar tu pregunta.';
    bubbleEl.textContent = errorMsg;
    addVolumeButtonToAssistantBubble(bubbleEl, errorMsg);
    state.chatContext.pop(); // Remover mensaje de usuario si falló
  }
}

export function speakAIResponse(text, btnEl = null, highlightInfo = null) {
  if (btnEl) {
    // Reproducción manual (clic en el botón de un mensaje ya terminado): si hay OTRO
    // botón sonando, lo reiniciamos visualmente antes de tomar el control.
    if (state.currentPlayingMsgBtn && state.currentPlayingMsgBtn !== btnEl) {
      resetMsgBtnIcon(state.currentPlayingMsgBtn);
    }
    state.currentPlayingMsgBtn = btnEl;
    setMsgBtnToStop(btnEl);
  } else {
    // Lectura automática en streaming (btnEl aún no existe: se llama una vez por cada
    // oración/trozo). Sumamos al contador de trozos pendientes; NO tocamos
    // currentPlayingMsgBtn aquí para no interferir con una reproducción manual en
    // curso de OTRO mensaje.
    state.autoVoiceQueueCount++;
  }

  let cleanText = text
    .replace(/\([^)]*\)/g, '')
    .replace(/\(|\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Mapa char→palabra para el resaltado: viene ya armado (fragmento en vivo del
  // streaming) o se arma aquí mismo a partir de la burbuja completa (reproducir un
  // mensaje ya terminado). Si el recorte de paréntesis/espacios de arriba cambió el
  // largo del texto, preferimos NO resaltar antes que resaltar mal.
  let wordMap = null;
  if (highlightInfo) {
    wordMap =
      highlightInfo.map ||
      (highlightInfo.bubbleEl
        ? wrapBubbleInWordSpansAndGetTailMap(highlightInfo.bubbleEl, text.length)
        : null);
    if (wordMap && wordMap.length !== cleanText.length) wordMap = null;
  }

  // Unidades del Sistema Internacional con su nombre completo (red de seguridad; el
  // prompt ya le pide a la IA que las escriba así). Reutiliza el mismo mecanismo del
  // lector de PDF para no desalinear el mapa de resaltado.
  if (wordMap) {
    const expanded = expandUnitsInMap(cleanText, wordMap);
    cleanText = expanded.text;
    wordMap = expanded.map;
    const expandedGreek = expandGreekLettersInMap(cleanText, wordMap);
    cleanText = expandedGreek.text;
    wordMap = expandedGreek.map;
  } else {
    cleanText = expandUnitsInMap(cleanText, new Array(cleanText.length).fill(null)).text;
    cleanText = expandGreekLettersInMap(cleanText, new Array(cleanText.length).fill(null)).text;
  }

  state.aiUtterance = new SpeechSynthesisUtterance(cleanText);
  const selectedVoice =
    state.synth.getVoices().find((v) => v.voiceURI === state.userSelectedVoiceURI) ||
    state.synth.getVoices()[0];
  if (selectedVoice) state.aiUtterance.voice = selectedVoice;
  state.aiUtterance.rate = parseFloat(state.rateSliderDesk.value);

  let lastHighlighted = null;
  if (wordMap) {
    state.aiUtterance.onboundary = (event) => {
      const el = wordMap[event.charIndex];
      if (el && el !== lastHighlighted) {
        if (lastHighlighted) lastHighlighted.classList.remove('chat-word-active');
        el.classList.add('chat-word-active');
        lastHighlighted = el;
      }
    };
  }
  const clearChatHighlight = () => {
    if (lastHighlighted) {
      lastHighlighted.classList.remove('chat-word-active');
      lastHighlighted = null;
    }
  };

  // Cuando el audio termine (o se cancele), volvemos al icono de volumen
  const finishThisUtterance = () => {
    clearChatHighlight();
    if (btnEl) {
      if (state.currentPlayingMsgBtn === btnEl) {
        resetMsgBtnIcon(btnEl);
        state.currentPlayingMsgBtn = null;
      }
    } else {
      state.autoVoiceQueueCount = Math.max(0, state.autoVoiceQueueCount - 1);
      // Solo volvemos el botón del mensaje a "reproducir" cuando YA NO quedan más
      // trozos pendientes/sonando de la lectura automática (evita que el ícono
      // parpadee a "play" entre una oración y la siguiente).
      if (state.autoVoiceQueueCount === 0 && state.autoVoiceMsgBtn) {
        resetMsgBtnIcon(state.autoVoiceMsgBtn);
        if (state.currentPlayingMsgBtn === state.autoVoiceMsgBtn) state.currentPlayingMsgBtn = null;
        state.autoVoiceMsgBtn = null;
      }
    }
  };
  state.aiUtterance.onend = finishThisUtterance;
  // Si hay un error, también restauramos el botón
  state.aiUtterance.onerror = finishThisUtterance;

  state.synth.speak(state.aiUtterance);
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initLiveConversationSection() {
  document.getElementById('btn-mic').addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openLiveConversation();
  });
  document.getElementById('btn-live-launch').addEventListener('click', openLiveConversation);
  document.getElementById('btn-chat-live').addEventListener('click', openLiveConversation);
  document
    .getElementById('btn-close-live-chat-controls')
    .addEventListener('click', () => closeLiveConversation(false, true));
  document
    .getElementById('btn-start-live-from-chat')
    .addEventListener('click', openLiveConversation);
  populateLiveVoices();
  if (state.liveVoiceSelect) {
    state.liveVoiceSelect.addEventListener('change', (e) => {
      const previousVoice = state.userSelectedLiveVoice;
      state.userSelectedLiveVoice = e.target.value;
      updateVoiceSelectorUI(state.userSelectedLiveVoice, 'Gemini Live');

      // Si hay sesión activa y cambió la voz, reiniciar silenciosamente
      if (state.liveSessionActive && previousVoice !== state.userSelectedLiveVoice) {
        restartLiveWithNewVoice();
      }
    });
  }
  if (state.voiceAssistantRecognition) {
    state.voiceAssistantRecognition.lang = 'es-ES';
    state.voiceAssistantRecognition.continuous = false;
    state.voiceAssistantRecognition.interimResults = true;

    state.voiceAssistantRecognition.onstart = () => {
      showStatus('Escuchando...', true);
      // Activar sonido por defecto al usar el micrófono
      if (!state.isChatSoundEnabled) {
        state.isChatSoundEnabled = true;
        state.btnChatSound.classList.add('text-[#7C3AED]');
        state.btnChatSound.classList.remove('text-gray-400');
        state.iconChatSound.setAttribute('data-lucide', 'volume-2');
        lucide.createIcons();
      }
    };

    state.voiceAssistantRecognition.onresult = (e) => {
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript) state.voiceTranscriptBuffer += finalTranscript;
    };

    state.voiceAssistantRecognition.onend = () => {
      if (state.voiceTranscriptBuffer.trim()) {
        routeMicCommand(state.voiceTranscriptBuffer.trim());
      } else {
        showStatus('', false);
      }
      state.voiceTranscriptBuffer = '';
    };

    state.voiceAssistantRecognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      showStatus('Error de micrófono (' + e.error + ')', true);
      setTimeout(() => showStatus('', false), 2000);
    };
  }
  state.btnMic.addEventListener('click', () => {
    if (!state.isDocumentIndexing)
      startRecognitionSafe(
        state.voiceAssistantRecognition,
        'Este navegador no admite dictado por voz (en iPhone/iPad usa Chrome o Safari más reciente, o revisa el permiso de micrófono).',
      );
  });
}
