// ===============================================================================================
// SECCIÓN: Resaltado de palabra en subtítulos
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { t } from './i18nRuntime.js';
import { rebuildGlobalSentences } from './ignoreFigures.js';
import { announceShortcut } from './keyboardShortcuts.js';
import { updatePipUI } from './pictureInPicture.js';
import { updateTranscriptionVisibility } from './subtitleResize.js';
import {
  clearHighlights,
  getTranslation,
  prefetchTranslations,
  startSpeechKeepAlive,
  stopSpeechKeepAlive,
} from './tts.js';
import { getTutorExplanation } from './tutorMode.js';

export function renderSubtitleContent(text) {
  state.transcriptionText.innerHTML = '';
  state.transcriptionViewport.scrollTop = 0;
  state.currentSubtitleWordSpans = [];
  if (!text) return;
  const tokenRegex = /\S+|\s+/g;
  let match;
  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    if (/^\s+$/.test(token)) {
      state.transcriptionText.appendChild(document.createTextNode(token));
    } else {
      const span = document.createElement('span');
      span.className = 'subtitle-word';
      span.textContent = token;
      span.dataset.start = match.index;
      span.dataset.end = match.index + token.length;
      state.transcriptionText.appendChild(span);
      state.currentSubtitleWordSpans.push(span);
    }
  }
}

export function clearSubtitleWordHighlight() {
  state.currentSubtitleWordSpans.forEach((s) => s.classList.remove('subtitle-word-active'));
}

export function scrollSubtitleToWord(span) {
  const fontSizePx = parseFloat(getComputedStyle(state.transcriptionText).fontSize) || 19;
  const lineHeight = fontSizePx * 1.35;
  const wordTop = span.offsetTop;
  const boxHeight = state.transcriptionViewport.clientHeight;
  const currentScroll = state.transcriptionViewport.scrollTop;

  if (wordTop >= currentScroll && wordTop + lineHeight <= currentScroll + boxHeight + 1) return;

  const targetLine = Math.floor(wordTop / lineHeight);
  const linesPerBox = Math.max(1, Math.floor(boxHeight / lineHeight));
  const newScroll = Math.max(0, (targetLine - linesPerBox + 1) * lineHeight);
  state.transcriptionViewport.scrollTop = newScroll;
}

export function highlightSubtitleWordAt(charIndex) {
  for (const span of state.currentSubtitleWordSpans) {
    const start = parseInt(span.dataset.start, 10);
    const end = parseInt(span.dataset.end, 10);
    if (charIndex >= start && charIndex < end) {
      if (span.classList.contains('subtitle-word-active')) return;
      clearSubtitleWordHighlight();
      span.classList.add('subtitle-word-active');
      if (state.isTranscriptionEnabled) scrollSubtitleToWord(span);
      return;
    }
  }
}

export function showStatus(text, show) {
  const overlay = document.getElementById('status-overlay');
  document.getElementById('status-text').textContent = text;
  show ? overlay.classList.remove('opacity-0') : overlay.classList.add('opacity-0');
}

export function togglePlayPauseIcon(playing) {
  const playWrapper = document.getElementById('play-wrapper');
  const pauseWrapper = document.getElementById('pause-wrapper');
  if (playing && !state.isPaused) {
    playWrapper.classList.add('hidden');
    pauseWrapper.classList.remove('hidden');
  } else {
    pauseWrapper.classList.add('hidden');
    playWrapper.classList.remove('hidden');
  }
  updateTranscriptionVisibility();
  if (typeof updatePipUI === 'function') updatePipUI();
}

export function expandUnitsInMap(text, map) {
  let result = '';
  let resultMap = [];
  let lastIndex = 0;
  let match;
  state.SI_UNIT_REGEX.lastIndex = 0;
  while ((match = state.SI_UNIT_REGEX.exec(text)) !== null) {
    const numStr = match[1];
    const unitSymbol = match[3];
    const matchStart = match.index;

    result += text.slice(lastIndex, matchStart);
    resultMap.push(...map.slice(lastIndex, matchStart));

    const isOne = /^1([.,]0+)?$/.test(numStr.trim());
    const unitNames = state.SI_UNITS[unitSymbol];
    const replacement = `${numStr} ${isOne ? unitNames[0] : unitNames[1]}`;
    result += replacement;
    // Cada carácter nuevo (incluida la parte numérica) se mapea al mismo elemento de
    // origen que ya tenía esa posición en el texto original, para que el resaltado
    // siga marcando la palabra correcta aunque el texto hablado ahora sea más largo.
    const sourceEl = map[matchStart] || map[matchStart - 1] || null;
    for (let i = 0; i < replacement.length; i++) resultMap.push(sourceEl);

    lastIndex = matchStart + match[0].length;
    if (match[0].length === 0) state.SI_UNIT_REGEX.lastIndex++; // por seguridad, evita bucle infinito
  }
  result += text.slice(lastIndex);
  resultMap.push(...map.slice(lastIndex));
  return { text: result, map: resultMap };
}

export function expandGreekLettersInMap(text, map) {
  let result = '';
  let resultMap = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const name = state.GREEK_LETTERS[ch];
    if (name) {
      const replacement = name + ' ';
      result += replacement;
      for (let j = 0; j < replacement.length; j++) resultMap.push(map[i]);
    } else {
      result += ch;
      resultMap.push(map[i]);
    }
  }
  return { text: result, map: resultMap };
}

export async function speakNextSentence() {
  if (!state.isPlaying) return;
  if (state.currentSentenceIndex >= state.sentences.length) {
    stopSpeech();
    return;
  }
  startSpeechKeepAlive();

  clearHighlights();
  let sentenceObj = state.sentences[state.currentSentenceIndex];
  let pId = sentenceObj.paragraphId;
  let wordsToSpeak = [];
  let textToSpeak = '';
  let nextIdxToAdvance = state.currentSentenceIndex + 1;

  if (state.tutorModeActive) {
    let nextIdx = state.currentSentenceIndex;
    while (nextIdx < state.sentences.length && state.sentences[nextIdx].paragraphId === pId) {
      wordsToSpeak.push(...state.sentences[nextIdx].words);
      nextIdx++;
    }
    nextIdxToAdvance = nextIdx;
  } else {
    wordsToSpeak = sentenceObj.words.slice(state.currentWordOffset);
  }

  state.currentWordOffset = 0;
  textToSpeak = wordsToSpeak.map((w) => w.text).join('');

  // Construimos el texto a pronunciar y el mapa char→elemento EN PARALELO, aplicando
  // los mismos filtros (paréntesis, enlaces) a los dos a la vez. Antes el mapa se
  // armaba con el texto ORIGINAL y luego se recortaba `textToSpeak`; en cuanto la frase
  // tenía un paréntesis o un enlace antes de la palabra que se estaba pronunciando, el
  // índice que reporta la síntesis de voz (que ya cuenta sobre el texto recortado) quedaba
  // desalineado respecto al mapa (que seguía contando sobre el texto completo), y el
  // resaltado terminaba marcando una palabra distinta a la que realmente se escuchaba.
  let charToElementMap = [];
  wordsToSpeak.forEach((w) => {
    for (let i = 0; i < w.text.length; i++) charToElementMap.push(w.element);
  });

  if (document.getElementById('skip-parens-toggle').checked) {
    let filteredText = '';
    let filteredMap = [];
    let localParenDepth = 0;
    for (let i = 0; i < textToSpeak.length; i++) {
      const char = textToSpeak[i];
      if (char === '(' || char === '[' || char === '{') localParenDepth++;
      else if ((char === ')' || char === ']' || char === '}') && localParenDepth > 0)
        localParenDepth--;
      else if (localParenDepth === 0) {
        filteredText += char;
        filteredMap.push(charToElementMap[i]);
      }
    }
    textToSpeak = filteredText;
    charToElementMap = filteredMap;
  }

  // Omitir pronunciación de Links
  if (document.getElementById('skip-links-toggle').checked) {
    const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/[^\s]*)?)/gi;
    let filteredText = '';
    let filteredMap = [];
    let lastIndex = 0;
    let match;
    while ((match = linkRegex.exec(textToSpeak)) !== null) {
      filteredText += textToSpeak.slice(lastIndex, match.index);
      filteredMap.push(...charToElementMap.slice(lastIndex, match.index));
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) linkRegex.lastIndex++; // evita bucle infinito ante coincidencias vacías
    }
    filteredText += textToSpeak.slice(lastIndex);
    filteredMap.push(...charToElementMap.slice(lastIndex));
    textToSpeak = filteredText;
    charToElementMap = filteredMap;
  }

  // Unidades del Sistema Internacional con su nombre completo en vez de la sigla (debe
  // ir ANTES de la sustitución de barras de abajo: unidades como "m/s" usan la barra).
  ({ text: textToSpeak, map: charToElementMap } = expandUnitsInMap(textToSpeak, charToElementMap));

  // Letras griegas con su nombre en voz alta (debe ir tras las unidades y antes de la
  // sustitución de barras de abajo, igual que las unidades).
  ({ text: textToSpeak, map: charToElementMap } = expandGreekLettersInMap(
    textToSpeak,
    charToElementMap,
  ));

  // Omitir pronunciación de barras (sustitución 1 a 1, no desplaza índices: el mapa no cambia)
  textToSpeak = textToSpeak.replace(/\//g, ' ');

  if (textToSpeak.trim().length === 0) {
    state.currentSentenceIndex = nextIdxToAdvance;
    return speakNextSentence();
  }

  let explanationPromise = null;
  let currentSObj = state.sentences[state.currentSentenceIndex];
  let currentLocalIdx = state.pageSentences[currentSObj.pageNum].indexOf(currentSObj);

  if (state.isTranslatingEnabled) {
    wordsToSpeak.forEach((w) => {
      if (w.text.trim().length > 0) w.element.classList.add('active-highlight');
    });
    if (document.getElementById('autoscroll-toggle').checked && wordsToSpeak.length > 0)
      wordsToSpeak[0].element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    textToSpeak = await getTranslation(currentSObj.pageNum, currentLocalIdx, textToSpeak);
  }

  if (!state.isPlaying || state.isPaused) return;

  renderSubtitleContent(textToSpeak);
  updateTranscriptionVisibility();

  if (state.tutorModeActive)
    explanationPromise = getTutorExplanation(pId, wordsToSpeak.map((w) => w.text).join(''));
  else if (state.isTranslatingEnabled) prefetchTranslations(state.currentSentenceIndex + 1, 3);

  state.currentUtterance = new SpeechSynthesisUtterance(textToSpeak);
  const selectedVoice =
    state.synth.getVoices().find((v) => v.voiceURI === state.userSelectedVoiceURI) ||
    state.synth.getVoices()[0];
  if (selectedVoice) state.currentUtterance.voice = selectedVoice;
  state.currentUtterance.rate = parseFloat(state.rateSliderDesk.value);

  state.currentUtterance.onboundary = (event) => {
    if (event.name !== 'word') return;
    state.consecutiveSpeechErrors = 0; // el audio sí está sonando: se recupera el contador
    // El resaltado de palabra en la caja de subtítulos sigue siempre el audio,
    // ya sea que se esté leyendo el texto original o su traducción.
    highlightSubtitleWordAt(event.charIndex);

    if (!state.isTranslatingEnabled && !state.tutorModeActive) {
      const el = charToElementMap[event.charIndex];
      if (el) {
        clearHighlights();
        el.classList.add('active-highlight');
        if (document.getElementById('autoscroll-toggle').checked)
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (state.tutorModeActive) {
      wordsToSpeak.forEach((w) => {
        if (w.text.trim().length > 0) w.element.classList.add('active-highlight');
      });
    }
  };

  state.currentUtterance.onend = async () => {
    state.consecutiveSpeechErrors = 0;
    if (state.isPlaying && !state.isPaused) {
      if (state.tutorModeActive) {
        let explanation = await explanationPromise;

        if (explanation && state.isPlaying && !state.isPaused) {
          let cleanExplanation = explanation.replace(/[*#_`~]/g, '');
          renderSubtitleContent(cleanExplanation);
          state.aiUtterance = new SpeechSynthesisUtterance(cleanExplanation);
          if (selectedVoice) state.aiUtterance.voice = selectedVoice;
          state.aiUtterance.rate = parseFloat(state.rateSliderDesk.value);
          state.aiUtterance.onboundary = (event) => {
            if (event.name === 'word') highlightSubtitleWordAt(event.charIndex);
          };

          state.aiUtterance.onend = () => {
            if (state.isPlaying && !state.isPaused) {
              state.currentSentenceIndex = nextIdxToAdvance;
              speakNextSentence();
            }
          };
          state.synth.speak(state.aiUtterance);

          if (nextIdxToAdvance < state.sentences.length) {
            let nextPId = state.sentences[nextIdxToAdvance].paragraphId;
            let nextWords = [];
            let scanIdx = nextIdxToAdvance;
            while (
              scanIdx < state.sentences.length &&
              state.sentences[scanIdx].paragraphId === nextPId
            ) {
              nextWords.push(...state.sentences[scanIdx].words);
              scanIdx++;
            }
            getTutorExplanation(nextPId, nextWords.map((w) => w.text).join(''));
          }
        } else {
          state.currentSentenceIndex = nextIdxToAdvance;
          speakNextSentence();
        }
      } else {
        state.currentSentenceIndex = nextIdxToAdvance;
        speakNextSentence();
      }
    }
  };
  state.currentUtterance.onerror = (e) => {
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      state.consecutiveSpeechErrors++;
      if (state.consecutiveSpeechErrors >= 3) {
        // El motor de voz quedó en un estado roto: en vez de seguir "saltando"
        // frases sin sonido, detenemos la lectura y avisamos al usuario.
        state.consecutiveSpeechErrors = 0;
        stopSpeech();
        announceShortcut(
          t('speech_engine_stalled') || 'La lectura se interrumpió, presiona Reproducir de nuevo',
        );
        return;
      }
      state.currentSentenceIndex = nextIdxToAdvance;
      speakNextSentence();
    }
  };

  state.synth.speak(state.currentUtterance);
  togglePlayPauseIcon(true);
}

export function togglePlayPause() {
  if (state.sentences.length === 0) return;
  if (state.isPlaying && !state.isPaused) {
    state.synth.pause();
    state.isPaused = true;
    togglePlayPauseIcon(false);
  } else if (state.isPlaying && state.isPaused) {
    state.synth.resume();
    state.isPaused = false;
    togglePlayPauseIcon(true);
  } else {
    // No hay una lectura activa (nunca se inició, o se detuvo por completo): en vez de
    // arrancar siempre desde el principio del documento, debe iniciar desde el
    // principio de la página que se está viendo actualmente.
    if (state.currentSentenceIndex === -1 || state.currentSentenceIndex >= state.sentences.length) {
      const currentPageNum = parseInt(state.pageInput.value) || 1;
      const startIdx = state.sentences.findIndex((s) => s.pageNum === currentPageNum);
      state.currentSentenceIndex = startIdx !== -1 ? startIdx : 0;
    }
    state.currentWordOffset = 0;
    state.isPlaying = true;
    state.isPaused = false;
    speakNextSentence();
  }
}

export function stopSpeech() {
  state.synth.cancel();
  state.isPlaying = false;
  state.isPaused = false;
  state.currentSentenceIndex = -1;
  state.currentWordOffset = 0;
  stopSpeechKeepAlive();
  state.consecutiveSpeechErrors = 0;
  state.translationPromises = {};
  state.tutorPromises = {};
  renderSubtitleContent('');
  clearHighlights();
  showStatus('', false);
  togglePlayPauseIcon(false);
}

export function playFromWord(pageNum, localSIndex, wIdx, snapToParagraphStart = true) {
  state.synth.cancel();
  state.isPlaying = true;
  state.isPaused = false;
  rebuildGlobalSentences();
  let globalIndex = 0;
  const sortedPages = Object.keys(state.pageSentences)
    .map(Number)
    .sort((a, b) => a - b);
  for (let p of sortedPages) {
    if (p === pageNum) {
      globalIndex += localSIndex;
      break;
    } else {
      globalIndex += state.pageSentences[p].length;
    }
  }

  state.currentSentenceIndex = globalIndex;
  state.currentWordOffset = wIdx;
  if (state.tutorModeActive && snapToParagraphStart) {
    const pId = state.sentences[state.currentSentenceIndex].paragraphId;
    while (
      state.currentSentenceIndex > 0 &&
      state.sentences[state.currentSentenceIndex - 1].paragraphId === pId
    ) {
      state.currentSentenceIndex--;
    }
    state.currentWordOffset = 0;
  }
  setTimeout(speakNextSentence, 100);
}

export function skipSentence(direction) {
  if (!state.isPlaying && state.currentSentenceIndex === -1) return;
  let newIndex = state.currentSentenceIndex + direction;
  if (newIndex >= 0 && newIndex < state.sentences.length) {
    let targetS = state.sentences[newIndex];
    let pNum = targetS.pageNum;
    let localIdx = state.pageSentences[pNum].indexOf(targetS);
    // snapToParagraphStart = false: al avanzar/retroceder oración por oración (incluso en
    // Modo Estudio) el movimiento debe ser de UNA oración exacta, permitiendo retroceder
    // hasta la última oración del párrafo anterior en vez de saltar siempre al inicio
    // del párrafo.
    playFromWord(pNum, localIdx, 0, false);
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initSubtitleHighlightSection() {
  state.btnNextSentence.addEventListener('click', () => skipSentence(1));
  state.btnPrevSentence.addEventListener('click', () => skipSentence(-1));
}
