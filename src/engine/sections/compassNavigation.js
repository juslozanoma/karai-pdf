// ===============================================================================================
// SECCIÓN: Navegación por brújula (comandos de voz + IA semántica)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { scrollToPage } from './pageNavigation.js';
import { showStatus } from './subtitleHighlight.js';

export function startRecognitionSafe(recognition, unsupportedMessage) {
  if (!recognition) {
    // En iPhone/iPad (Safari) esta función del navegador no existe: no hay forma de
    // activarla desde JavaScript. Se avisa de forma clara y no bloqueante (un alert()
    // puede no mostrarse bien en algunos navegadores móviles).
    showStatus(unsupportedMessage, true);
    setTimeout(() => showStatus('', false), 3500);
    return;
  }
  try {
    recognition.start();
  } catch (error) {
    try {
      recognition.stop();
    } catch (e) {}
    setTimeout(() => {
      try {
        recognition.start();
      } catch (e) {}
    }, 250);
  }
}

export function speakAndMaybeListenAgain(text, listenAgain = false) {
  state.synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice =
    state.synth.getVoices().find((v) => v.voiceURI === state.userSelectedVoiceURI) ||
    state.synth.getVoices()[0];
  if (selectedVoice) utterance.voice = selectedVoice;
  utterance.rate = parseFloat(state.rateSliderDesk.value);
  utterance.onend = () => {
    if (listenAgain && state.navRecognition)
      startRecognitionSafe(state.navRecognition, 'Navegador no soportado');
  };
  // Pequeña pausa tras cancel() para que el motor de voz no recorte las primeras palabras.
  setTimeout(() => state.synth.speak(utterance), 120);
}

export function finishCompassNavigation(result) {
  const page = Math.max(1, Math.min(state.documentObj.numPages, parseInt(result.page)));
  if (!page) {
    showStatus('Destino fuera del rango', true);
    setTimeout(() => showStatus('', false), 2500);
    return;
  }
  scrollToPage(page, true);
  const message = `Navegando a página ${page}`;
  showStatus(message, true);
  setTimeout(() => showStatus('', false), 2500);
}

export async function handleCompassCommand(transcript) {
  if (!state.documentObj) {
    showStatus('Primero sube un Documento', true);
    setTimeout(() => showStatus('', false), 2500);
    return;
  }
  showStatus('Buscando destino con IA...', true);

  // 1. Verificación directa (Ej. "ve a la página 10")
  const directPageMatch =
    transcript.match(/(?:p[áa]gina|pag|ir a|ll[ée]vame a(?: la)?|ve a(?: la)?)\s*(\d+)/i) ||
    transcript.match(/^(\d+)$/);
  if (directPageMatch && directPageMatch[1]) {
    finishCompassNavigation({ page: parseInt(directPageMatch[1], 10) });
    return;
  }

  // 2. Mapeamos la lista de índices disponibles para que la IA los evalúe semánticamente
  const searchItems = [
    ...state.tableOfContents.map((item) => ({ title: item.title, page: item.page, type: 'toc' })),
    ...state.figuresIndex.map((item) => ({
      title: `${item.type} ${item.number} ${item.caption}`,
      page: item.page,
      type: 'figure',
    })),
  ];

  const prompt = `Actúa como un enrutador de navegación para un lector de documentos.
El usuario quiere navegar. Dijo exactamente: "${transcript}".
Aquí tienes el índice del documento disponible en formato JSON:
${JSON.stringify(searchItems)}

Instrucciones CRÍTICAS:
1. Encuentra la página que mejor coincida semánticamente con la petición.
2. IMPORTANTE: El usuario puede hablar en español, pero los títulos del índice pueden estar en inglés u otro idioma (ej. si pide "metodología", busca "methodology"). Haz la traducción semántica mentalmente para emparejar.
3. Si el usuario pide el "último" o "última" (capítulo, figura, imagen, tabla, etc.), debes devolver el elemento de ese tipo que tenga el número de página MÁS ALTO (el último que aparece en el documento).
4. Si pide el "primer" o "primera" elemento de algún tipo, devuelve el que tenga la página menor.
5. Devuelve ÚNICAMENTE un JSON válido con formato {"page": numero_de_pagina}. No uses backticks, ni variables, ni texto adicional.
6. Si definitivamente no hay ninguna coincidencia ni aproximada, devuelve {"page": null}.`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${state.GEMINI_MODEL}:generateContent?key=${state.apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        const result = JSON.parse(data.candidates[0].content.parts[0].text.trim());
        if (result && result.page) {
          finishCompassNavigation({ page: result.page });
          return;
        }
      }
    }
  } catch (e) {
    console.error('Error semántico brújula:', e);
  }

  showStatus('Destino no encontrado', true);
  setTimeout(() => showStatus('', false), 3000);
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initCompassNavigationSection() {
  if (state.navRecognition) {
    state.navRecognition.lang = 'es-ES';
    state.navRecognition.continuous = false;
    state.navRecognition.interimResults = true;
    state.navRecognition.onstart = () => showStatus('Escuchando orden...', true);
    state.navRecognition.onresult = async (e) => {
      let finalStr = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalStr += e.results[i][0].transcript;
      }
      const transcript = finalStr.trim();
      if (transcript) {
        state.navRecognition.stop();
        await handleCompassCommand(transcript);
      }
    };
    state.navRecognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      showStatus('Error al escuchar (' + e.error + ')', true);
      setTimeout(() => showStatus('', false), 2000);
    };
  }
  document.getElementById('btn-compass').addEventListener('click', () => {
    if (!state.documentObj) {
      showStatus('Primero sube un Documento', true);
      setTimeout(() => showStatus('', false), 2500);
      return;
    }
    startRecognitionSafe(
      state.navRecognition,
      'Este navegador no admite dictado por voz (en iPhone/iPad usa Chrome o Safari más reciente, o revisa el permiso de micrófono).',
    );
  });
  window.addEventListener('beforeunload', () => state.synth.cancel());
}
