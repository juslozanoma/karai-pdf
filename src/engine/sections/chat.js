// ===============================================================================================
// SECCIÓN: Chat de IA (RAG inteligente + internet) y resaltado de palabra
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { logApiUsage } from './geminiConfig.js';
import { getReadingLanguageName, t } from './i18nRuntime.js';
import { speakAIResponse } from './liveConversation.js';
import { stopSpeech } from './subtitleHighlight.js';

export function createChatStreamCursor(bubbleEl) {
  bubbleEl.innerHTML = '';
  let node = document.createTextNode('');
  bubbleEl.appendChild(node);
  return {
    bubbleEl,
    append(rawChunk) {
      node.textContent += rawChunk.replace(/[*#_`~]/g, '');
    },
    finalizeSentence() {
      const text = node.textContent;
      const map = [];
      bubbleEl.removeChild(node);
      text.split(/(\s+)/).forEach((tok) => {
        if (tok.length === 0) return;
        if (/^\s+$/.test(tok)) {
          bubbleEl.appendChild(document.createTextNode(tok));
          for (let i = 0; i < tok.length; i++) map.push(null);
        } else {
          const span = document.createElement('span');
          span.className = 'chat-word';
          span.textContent = tok;
          bubbleEl.appendChild(span);
          for (let i = 0; i < tok.length; i++) map.push(span);
        }
      });
      node = document.createTextNode('');
      bubbleEl.appendChild(node);
      return { text, map };
    },
  };
}

export function wrapBubbleInWordSpansAndGetTailMap(bubbleEl, tailLength) {
  const fullText = bubbleEl.textContent;
  bubbleEl.innerHTML = '';
  const map = [];
  fullText.split(/(\s+)/).forEach((tok) => {
    if (tok.length === 0) return;
    if (/^\s+$/.test(tok)) {
      bubbleEl.appendChild(document.createTextNode(tok));
      for (let i = 0; i < tok.length; i++) map.push(null);
    } else {
      const span = document.createElement('span');
      span.className = 'chat-word';
      span.textContent = tok;
      bubbleEl.appendChild(span);
      for (let i = 0; i < tok.length; i++) map.push(span);
    }
  });
  const tailStart = Math.max(0, fullText.length - tailLength);
  return map.slice(tailStart);
}

export function resetMsgBtnIcon(btn) {
  if (!btn) return;
  btn.innerHTML = '<i data-lucide="volume-2" class="w-3.5 h-3.5"></i>';
  lucide.createIcons();
  btn.title = t('msg_btn_play_title');
}

export function setMsgBtnToStop(btn) {
  btn.innerHTML = '<i data-lucide="square" class="w-3.5 h-3.5"></i>';
  lucide.createIcons();
  btn.title = t('msg_btn_stop_title');
}

export function addVolumeButtonToAssistantBubble(bubbleEl, text) {
  if (!bubbleEl || bubbleEl.querySelector('.btn-voice-msg')) return;
  bubbleEl.classList.add('pr-8');
  const btn = document.createElement('button');
  btn.className =
    'btn-voice-msg absolute top-1.5 right-1.5 p-1.5 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F8F7FF] rounded-full transition bg-white/80 shadow-sm';
  btn.title = t('msg_btn_play_title');
  btn.innerHTML = '<i data-lucide="volume-2" class="w-3.5 h-3.5"></i>';

  btn.onclick = (e) => {
    e.stopPropagation();
    // Si el botón clickeado es el que está sonando, lo detenemos
    if (state.currentPlayingMsgBtn === btn) {
      state.synth.cancel();
      state.autoVoiceQueueCount = 0;
      state.autoVoiceMsgBtn = null;
      state.currentPlayingMsgBtn = null;
      resetMsgBtnIcon(btn);
    } else {
      // Detenemos cualquier audio en curso (incluido el auto-leído del chat)
      state.synth.cancel();
      state.autoVoiceQueueCount = 0;
      state.autoVoiceMsgBtn = null;
      // Leemos el texto actual de la burbuja (por si el botón se creó de forma
      // temprana, antes de que terminara de llegar el texto completo).
      const cloneEl = bubbleEl.cloneNode(true);
      const ownBtn = cloneEl.querySelector('.btn-voice-msg');
      if (ownBtn) ownBtn.remove();
      const liveText = (cloneEl.textContent || text || '').trim();
      // Pequeña pausa: si se llama a speak() inmediatamente después de cancel(),
      // el motor de voz recorta las primeras palabras (bug conocido de Chrome).
      setTimeout(() => speakAIResponse(liveText, btn, { bubbleEl }), 120);
    }
  };

  bubbleEl.style.position = 'relative';
  bubbleEl.appendChild(btn);
  lucide.createIcons();

  // Si este mensaje ya se está leyendo automáticamente (lectura de respuestas activada),
  // el botón recién creado debe reflejar "detener": el audio ya está sonando aunque el
  // botón acabe de aparecer ahora, al terminar el streaming del texto.
  if (state.autoVoiceQueueCount > 0) {
    state.autoVoiceMsgBtn = btn;
    state.currentPlayingMsgBtn = btn;
    setMsgBtnToStop(btn);
  }
}

export function attachEarlyVoiceMsgButton(bubbleEl) {
  addVolumeButtonToAssistantBubble(bubbleEl, '');
  if (state.isChatSoundEnabled) {
    const btn = bubbleEl.querySelector('.btn-voice-msg');
    if (btn) {
      state.autoVoiceMsgBtn = btn;
      state.currentPlayingMsgBtn = btn;
      setMsgBtnToStop(btn);
    }
  }
}

export function searchLocalRAGChunks(queryText, topK = 15) {
  const stopWords = new Set([
    'el',
    'la',
    'los',
    'las',
    'un',
    'una',
    'unos',
    'y',
    'o',
    'de',
    'del',
    'a',
    'al',
    'en',
    'por',
    'para',
    'con',
    'sobre',
    'sin',
    'que',
    'quien',
    'como',
    'este',
    'esta',
    'esos',
    'cual',
    'cuales',
    'que',
    'se',
    'lo',
    'su',
    'sus',
    'mas',
    'pero',
  ]);
  const terms = queryText
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  if (terms.length === 0) return [];

  return state.documentRAGChunks
    .map((chunk) => {
      const normChunk = chunk.text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      let score = 0;
      let hits = 0;
      for (const term of terms) {
        if (normChunk.includes(term)) {
          hits++;
          score += (normChunk.match(new RegExp(term, 'g')) || []).length;
        }
      }
      score = score * (hits / terms.length);
      return { ...chunk, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export async function smartBuildRagContextAndPrompt(cleanQuestion) {
  const chunks = searchLocalRAGChunks(cleanQuestion, 15);

  const contextText =
    chunks.length > 0
      ? chunks.map((c, i) => `[Páginas ${c.startPage}-${c.endPage}]:\n${c.text}`).join('\n\n')
      : 'NO HAY INFORMACIÓN EN EL DOCUMENTO SOBRE ESTO.';

  const formatInstruction = state.isChatBriefEnabled
    ? 'REGLA DE ORO INQUEBRANTABLE: RESPONDE EN MÁXIMO 50 PALABRAS TOTALES. Ve directo al grano sin saludos, ni preámbulos. Solo la información concreta. Menciona las páginas de referencia con el formato (p. 7) o (p. 7 y p. 8), pegado a la parte de la respuesta a la que corresponde.'
    : 'Responde de forma clara y normal. Sé detallado y preciso, estructurando bien tus ideas.';

  // needsSearch: SOLO se activa la herramienta de Google Search (y por lo tanto solo en
  // ese caso el modelo puede llegar a citar "(web)") cuando el usuario tiene el botón de
  // Búsqueda Web activado Y ADEMÁS el documento no contiene la respuesta. Antes se
  // activaba cada vez que el RAG local no encontraba nada, sin importar si el botón de
  // búsqueda web estaba prendido, así que TODAS las respuestas terminaban citando "(web)"
  // incluso con la búsqueda apagada.
  const needsSearch = state.isChatWebEnabled && chunks.length === 0;

  const thirdRule = needsSearch
    ? 'TERCERO: Si el contexto local dice "NO HAY INFORMACIÓN" o tú deduces que la respuesta no está ahí, DEBES responder usando Google Search (la tienes activa en esta consulta) o tu base de conocimiento. En ese caso, y SOLO en ese caso, marca esa parte de la respuesta con (web) en vez de un número de página, pegado igual que las referencias de página. Si la respuesta combina documento e internet, usa (p. N) para lo primero y (web) para lo segundo, cada uno junto a la parte que corresponde.'
    : 'TERCERO: Si el contexto local dice "NO HAY INFORMACIÓN" o tú deduces que la respuesta no está ahí, responde con lo mejor de tu base de conocimiento general, PERO NO tienes búsqueda web activa en esta consulta: NUNCA marques ninguna parte de la respuesta con (web), ya que no hiciste ninguna búsqueda en internet real. Simplemente responde sin usar esa marca.';

  let finalPrompt = `Pregunta del usuario: "${cleanQuestion}"\nContexto extraído del documento local:\n${contextText}\n\nInstrucciones de comportamiento ESTRICTO:\n- ERES UN ASISTENTE EXPERTO.\n- PRIMERO: Intenta responder EXCLUSIVAMENTE basándote en el Contexto del documento de arriba. La prioridad SIEMPRE es citar el documento con (p. N); usa (web) únicamente como último recurso, jamás como primera opción.\n- SEGUNDO: Cada vez que uses información del documento, indica la página exacta con el formato (p. 20), pegado inmediatamente después de esa parte de la respuesta. Si son varias páginas seguidas de un mismo dato, usa (p. 7 y p. 8). Este es el ÚNICO estilo de referencia permitido: nunca escribas "Fuente:", "según la página" ni nada similar, solo (p. N).\n- ${thirdRule}\n- CUARTO: PROHIBIDO usar paréntesis en toda la respuesta para cualquier cosa que no sea una referencia (p. N) o (web) como se explicó arriba. Escribe como si estuvieras explicando en voz alta: todo el texto debe ir fluido, en oraciones completas, sin acotaciones entre paréntesis ni corchetes, salvo esa única excepción.\n- QUINTO: Toda unidad de medida del Sistema Internacional debe escribirse siempre con su nombre completo, nunca con la sigla o abreviatura. Por ejemplo escribe "nanómetros" en vez de "nm", "kilogramos" en vez de "kg", "grados Celsius" en vez de "°C", "metros por segundo" en vez de "m/s".\n- SEXTO: Responde en ${getReadingLanguageName()}, salvo que el usuario haya escrito su pregunta claramente en otro idioma, en cuyo caso respóndele en ese idioma.\n\n${formatInstruction}`;

  return { prompt: finalPrompt, needsSearch };
}

export function createUserBubble(text, imageBase64 = null, onRegenerate = null) {
  if (state.chatHistory.querySelector('.text-center.text-xs')) state.chatHistory.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-1 items-end w-full animate-fade-in';

  if (imageBase64) {
    const img = document.createElement('img');
    img.src = imageBase64;
    img.className = 'max-w-[90%] max-h-48 rounded-lg border border-[#EDE9FE] mb-1 object-contain';
    wrap.appendChild(img);
  }

  // Botón de "regenerar respuesta": vuelve a llamar exactamente a la misma función de
  // envío que se usó la primera vez, así que respeta automáticamente los ajustes
  // ACTUALES del chat (breve, lectura en voz, búsqueda web, modelo, etc). No borra nada
  // del historial: simplemente añade una nueva respuesta al final de la conversación.
  // Vive DENTRO de la burbuja del mensaje (esquina inferior derecha), no debajo de ella.
  if (text) {
    const bubble = document.createElement('div');
    bubble.className =
      'relative bg-[#F1EEFF] text-[#5B21B6] text-sm p-3 rounded-xl rounded-tr-none shadow-sm max-w-[90%] whitespace-pre-wrap' +
      (typeof onRegenerate === 'function' ? ' pb-7' : '');
    bubble.textContent = text;

    if (typeof onRegenerate === 'function') {
      const regenBtn = document.createElement('button');
      regenBtn.className =
        'btn-regenerate-msg absolute bottom-1 right-1 text-[#8B5CF6]/50 hover:text-[#7C3AED] p-1 rounded-full hover:bg-white/50 transition';
      regenBtn.title = t('msg_btn_regenerate_title');
      regenBtn.innerHTML = '<i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>';
      regenBtn.onclick = (e) => {
        e.stopPropagation();
        onRegenerate();
      };
      bubble.appendChild(regenBtn);
    }
    wrap.appendChild(bubble);
  }

  state.chatHistory.appendChild(wrap);
  state.chatHistory.scrollTop = state.chatHistory.scrollHeight;
  if (typeof onRegenerate === 'function') lucide.createIcons();
}

export function createAssistantBubble(prefix = 'Analizando...') {
  if (state.chatHistory.querySelector('.text-center.text-xs')) state.chatHistory.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'flex flex-col gap-1 items-start w-full animate-fade-in';
  const bubble = document.createElement('div');
  bubble.className =
    'bg-white border border-gray-200 text-gray-800 text-sm p-3 rounded-xl rounded-tl-none shadow-sm max-w-[90%] whitespace-pre-wrap';
  bubble.innerHTML = `<div style="display:flex;align-items:center;gap:6px;color:#9ca3af;font-style:italic;">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin" style="flex-shrink:0;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                <span>${prefix}</span>
            </div>`;
  wrap.appendChild(bubble);
  state.chatHistory.appendChild(wrap);
  state.chatHistory.scrollTop = state.chatHistory.scrollHeight;
  return bubble;
}

export async function processChatQueryWithImage(base64Img, questionText = '') {
  stopSpeech();
  const msg = questionText.trim()
    ? questionText.trim()
    : 'Por favor, analiza y explica la imagen o área que acabo de seleccionar del documento. Responde en párrafos sin titulos, sin usar paréntesis, sin resumen al final y en texto sin formto. Escribe siempre las unidades de medida del Sistema Internacional con su nombre completo, nunca con siglas (ejemplo: nanómetros en vez de nm).';
  const langInstruction = `\n\n(Responde en ${getReadingLanguageName()}, salvo que el usuario haya escrito claramente en otro idioma).`;
  const msgForModel = msg + langInstruction;

  const userMsg = { role: 'user', text: msg, hasImage: true };
  state.chatContext.push(userMsg);
  if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();

  createUserBubble(msg, base64Img, () => processChatQueryWithImage(base64Img, msg));
  const bubbleEl = createAssistantBubble('Analizando imagen...');

  const historyParts = [];
  for (let i = 0; i < state.chatContext.length - 1; i++) {
    const entry = state.chatContext[i];
    if (entry.role === 'user') {
      historyParts.push({ role: 'user', parts: [{ text: entry.text }] });
    } else {
      historyParts.push({ role: 'model', parts: [{ text: entry.text }] });
    }
  }

  const payloadContent = {
    contents: [
      ...historyParts,
      {
        role: 'user',
        parts: [
          { inlineData: { data: base64Img.split(',')[1], mimeType: 'image/jpeg' } },
          { text: msgForModel },
        ],
      },
    ],
  };

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${state.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadContent),
    });
    if (!response.ok) throw new Error('API Error');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponseCache = '';
    let sentenceBufferForVoice = '';
    let lastUsageMetadata = null;
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
            const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    const assistantResponse = fullResponseCache.replace(/[*#_`~]/g, '').trim();
    if (assistantResponse) {
      state.chatContext.push({ role: 'model', text: assistantResponse });
      if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();
    }

    if (state.isChatSoundEnabled && sentenceBufferForVoice.trim().length > 0) {
      const { text: chunkText, map: chunkMap } = streamCursor.finalizeSentence();
      speakAIResponse(chunkText, null, { map: chunkMap });
    }

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
    const errorMsg = 'Error al conectar con la IA visual.';
    bubbleEl.textContent = errorMsg;
    addVolumeButtonToAssistantBubble(bubbleEl, errorMsg);
    state.chatContext.pop();
  }
}

export async function processChatQueryStreaming(questionText) {
  stopSpeech();
  const cleanQuestion = questionText.trim();
  if (!cleanQuestion) return;

  state.chatContext.push({ role: 'user', text: cleanQuestion });
  if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();

  createUserBubble(cleanQuestion, null, () => processChatQueryStreaming(cleanQuestion));
  const bubbleEl = createAssistantBubble('Analizando documento...');

  const { prompt: fullPrompt, needsSearch } = await smartBuildRagContextAndPrompt(cleanQuestion);

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
  const payloadContent = {
    contents: [...historyParts, { role: 'user', parts: [{ text: fullPrompt }] }],
    // Solo pedimos Google Search cuando el documento local no tenía nada relevante:
    // así la mayoría de preguntas (que sí encuentran contexto local) responden mucho más rápido.
    ...(needsSearch ? { tools: [{ google_search: {} }] } : {}),
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadContent),
    });
    if (!response.ok || !response.body) throw new Error(`API: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullResponseCache = '';
    let sentenceBufferForVoice = '';
    let lastUsageMetadata = null;
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
            const chunk = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
    const assistantResponse = fullResponseCache.replace(/[*#_`~]/g, '').trim();
    if (assistantResponse) {
      state.chatContext.push({ role: 'model', text: assistantResponse });
      if (state.chatContext.length > state.MAX_CHAT_HISTORY * 2) state.chatContext.shift();
    }

    if (state.isChatSoundEnabled && sentenceBufferForVoice.trim().length > 0) {
      const { text: chunkText, map: chunkMap } = streamCursor.finalizeSentence();
      speakAIResponse(chunkText, null, { map: chunkMap });
    }

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
    const errorMsg = 'Error al conectar con la IA.';
    bubbleEl.textContent = errorMsg;
    addVolumeButtonToAssistantBubble(bubbleEl, errorMsg);
    state.chatContext.pop();
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initChatSection() {
  document.getElementById('btn-remove-img').addEventListener('click', () => {
    state.pendingImageBase64 = null;
    state.imgPreviewContainer.classList.add('hidden');
    state.imgPreviewImg.src = '';
    state.aiInput.placeholder = 'Escribe tu pregunta aquí';
  });
  state.aiInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (state.pendingImageBase64 && !state.isDocumentIndexing) {
        processChatQueryWithImage(state.pendingImageBase64, state.aiInput.value.trim());
        state.pendingImageBase64 = null;
        state.imgPreviewContainer.classList.add('hidden');
        state.imgPreviewImg.src = '';
        state.aiInput.value = '';
        state.aiInput.placeholder = 'Escribe tu pregunta aquí';
      } else if (state.aiInput.value.trim() && !state.isDocumentIndexing) {
        processChatQueryStreaming(state.aiInput.value.trim());
        state.aiInput.value = '';
      }
    }
  });
  state.aiSubmit.addEventListener('click', () => {
    if (state.pendingImageBase64 && !state.isDocumentIndexing) {
      processChatQueryWithImage(state.pendingImageBase64, state.aiInput.value.trim());
      state.pendingImageBase64 = null;
      state.imgPreviewContainer.classList.add('hidden');
      state.imgPreviewImg.src = '';
      state.aiInput.value = '';
      state.aiInput.placeholder = 'Escribe tu pregunta aquí';
    } else if (state.aiInput.value.trim() && !state.isDocumentIndexing) {
      processChatQueryStreaming(state.aiInput.value.trim());
      state.aiInput.value = '';
    }
  });
}
