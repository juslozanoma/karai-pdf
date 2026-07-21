// ===============================================================================================
// SECCIÓN: Renderizado del PDF y DOCX
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { extractFullTextInBackground } from './aiIndexingState.js';
import { updateCustomScrollbarThumb } from './customScrollbar.js';
import { rebuildGlobalSentences } from './ignoreFigures.js';
import { scrollToPage } from './pageNavigation.js';
import { playFromWord, speakNextSentence, stopSpeech } from './subtitleHighlight.js';
import { syncTopBar } from './topToolbarSync.js';
import { clearHighlights } from './tts.js';
import { clampScale } from './zoom.js';

export function transformMatrix(m1, m2) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ];
}

export function getSafeOutputScale(viewportWidth, viewportHeight) {
  const desiredDpr = Math.min(window.devicePixelRatio || 1, 2);
  const desiredPixels = viewportWidth * desiredDpr * viewportHeight * desiredDpr;
  if (desiredPixels <= state.MAX_CANVAS_PIXELS) return desiredDpr;
  const scaleDown = Math.sqrt(state.MAX_CANVAS_PIXELS / (viewportWidth * viewportHeight));
  return Math.max(0.5, scaleDown);
}

export function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
  canvas.remove();
}

export function unloadPageContent(pageNum, wrapperEl) {
  const st = state.pageState[pageNum];
  if (!st || !state.documentObj || state.documentObj.isDocx) return;
  if (st.visible) return; // volvió a estar cerca antes de que corriera esta limpieza
  if (wrapperEl.getAttribute('data-rendered') !== 'true') return; // nada que descargar

  // No descargar la página que se está leyendo/traduciendo en este momento: rompería
  // la reproducción en curso.
  const isCurrentReadingPage =
    state.isPlaying &&
    state.currentSentenceIndex >= 0 &&
    state.sentences[state.currentSentenceIndex] &&
    state.sentences[state.currentSentenceIndex].pageNum === pageNum;
  if (isCurrentReadingPage) return;

  if (st.canvas) {
    releaseCanvas(st.canvas);
    st.canvas = null;
    st.renderedScale = 0;
  }

  const textLayerDiv = wrapperEl.querySelector('.text-layer');
  if (textLayerDiv) textLayerDiv.remove();

  delete state.pageSentences[pageNum];
  delete state.docTextByPage[pageNum];

  // Libera las estructuras internas que pdf.js guarda en caché para esta página
  // (listas de operadores, fuentes decodificadas, etc.). Es justo lo que hace pesado
  // navegar y hacer zoom en documentos largos si nunca se limpia.
  if (!st.isRendering && st.pdfPage && typeof st.pdfPage.cleanup === 'function') {
    try {
      st.pdfPage.cleanup();
    } catch (e) {
      /* puede fallar si hay un render en curso; se ignora */
    }
  }
  st.pdfPage = null;

  wrapperEl.setAttribute('data-rendered', 'false');
  wrapperEl.innerHTML = `<i data-lucide="loader" class="w-8 h-8 text-gray-300 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>`;
  lucide.createIcons();

  // Mantener sincronizado el índice global de lectura por si apuntaba a una oración
  // posterior en el documento (sus posiciones se recorren al quitar esta página del medio).
  const savedSentence =
    state.currentSentenceIndex >= 0 && state.currentSentenceIndex < state.sentences.length
      ? state.sentences[state.currentSentenceIndex]
      : null;
  rebuildGlobalSentences();
  if (savedSentence) {
    const newIdx = state.sentences.indexOf(savedSentence);
    if (newIdx !== -1) state.currentSentenceIndex = newIdx;
  }
}

export function resizePageContainers(scale) {
  if (!state.documentObj || state.documentObj.isDocx) return;
  for (let num = 1; num <= state.documentObj.numPages; num++) {
    const st = state.pageState[num];
    if (!st || !st.wrapperEl) continue;
    st.wrapperEl.style.width = `${st.nativeW * scale}px`;
    st.wrapperEl.style.height = `${st.nativeH * scale}px`;
  }
}

export async function renderAllPages(targetPage = 1, preserveState = false, scrollAnchor = null) {
  state.farUnloadObserver.disconnect(); // suelta las páginas del documento/zoom anterior antes de crear las nuevas
  state.docContainer.innerHTML = '';
  state.docTextByPage = {};
  state.sentences = [];
  state.pageSentences = {};
  state.pageState = {};

  if (!preserveState) {
    // Limpiar historial de chat al cargar nuevo documento
    state.chatHistory.innerHTML = '';
    state.chatContext = [];

    // Reiniciar contexto de conversación
    state.pendingImageBase64 = null;
    state.imgPreviewContainer.classList.add('hidden');
    state.imgPreviewImg.src = '';
    state.aiInput.placeholder = 'Escribe tu pregunta aquí';
  }

  // Reinsertar el selection box tras limpiar el contenedor
  if (state.inspectSelectionBox && !state.docContainer.contains(state.inspectSelectionBox)) {
    state.docContainer.appendChild(state.inspectSelectionBox);
  }

  if (preserveState) {
    // Al hacer zoom no queremos perder la caché de traducciones ni la posición de lectura:
    // solo detenemos el audio actual sin limpiar traducciones, subtítulos ni índice de lectura.
    state.synth.cancel();
    state.isPlaying = false;
    state.isPaused = false;
    clearHighlights();
  } else {
    stopSpeech();
  }
  state.btnPlayPause.disabled = true;

  try {
    state.mainScroll.classList.remove('overflow-hidden');
    state.mainScroll.classList.add('overflow-y-auto', 'overflow-x-auto');
    state.mainScroll.scrollTop = 0;
    state.pageTotal.textContent = state.documentObj.numPages;
    state.pageTotalMobile.textContent = state.documentObj.numPages;
    state.horizScroll.max = state.documentObj.numPages;
    state.pageInput.value = targetPage;
    state.horizScroll.value = targetPage;
    state.pageInputMobile.value = targetPage;

    let defaultWidth = 800;
    let defaultHeight = 1000;
    let nativeW = 800;
    let nativeH = 1000;
    if (!state.documentObj.isDocx) {
      const page1 = await state.documentObj.getPage(1);
      const nativeVp1 = page1.getViewport({ scale: 1 });
      nativeW = nativeVp1.width;
      nativeH = nativeVp1.height;

      // Al abrir un documento nuevo se ajusta al ancho disponible (sin pasar de 100%),
      // igual que hace pdf kimi al cargar un PDF, en vez de partir de una escala fija.
      if (!preserveState) {
        const availableWidth = Math.max(200, state.mainScroll.clientWidth);
        state.currentScale = clampScale(1.5);
        state.pendingScale = state.currentScale;
      }

      defaultWidth = nativeW * state.currentScale;
      defaultHeight = nativeH * state.currentScale;
    }

    for (let num = 1; num <= state.documentObj.numPages; num++) {
      const pageWrapper = document.createElement('div');
      pageWrapper.id = `page-${num}`;
      pageWrapper.setAttribute('data-page-num', num);
      pageWrapper.setAttribute('data-rendered', 'false');

      pageWrapper.className = `relative bg-white mx-auto flex flex-col justify-start ${state.documentObj.isDocx ? 'docx-page p-8 md:p-14 shadow-md text-justify max-w-[95vw] mb-[2px]' : 'items-center shadow-[0_2px_8px_rgba(0,0,0,0.4)]'}`;

      // Guías rojas de bordes: previsualización en vivo de hasta dónde llega el
      // encabezado/pie/margen que se omite en la lectura. Cada página tiene sus
      // propias 4 barras (empiezan en LOS BORDES DE ESA página), ocultas hasta que
      // el usuario mueve algún slider en el panel de Ajustes.
      const guideTop = document.createElement('div');
      guideTop.className =
        'margin-guide-bar-top hidden absolute left-0 right-0 top-0 border-b-2 border-red-500 bg-red-500/10 pointer-events-none z-[45]';
      const guideBottom = document.createElement('div');
      guideBottom.className =
        'margin-guide-bar-bottom hidden absolute left-0 right-0 bottom-0 border-t-2 border-red-500 bg-red-500/10 pointer-events-none z-[45]';
      const guideLeft = document.createElement('div');
      guideLeft.className =
        'margin-guide-bar-left hidden absolute top-0 bottom-0 left-0 border-r-2 border-red-500 bg-red-500/10 pointer-events-none z-[45]';
      const guideRight = document.createElement('div');
      guideRight.className =
        'margin-guide-bar-right hidden absolute top-0 bottom-0 right-0 border-l-2 border-red-500 bg-red-500/10 pointer-events-none z-[45]';
      pageWrapper.appendChild(guideTop);
      pageWrapper.appendChild(guideBottom);
      pageWrapper.appendChild(guideLeft);
      pageWrapper.appendChild(guideRight);

      if (!state.documentObj.isDocx) {
        pageWrapper.style.width = `${defaultWidth}px`;
        pageWrapper.style.height = `${defaultHeight}px`;
        pageWrapper.style.marginBottom = '4px'; // separación fija entre páginas (no escala con el zoom)
        // Se guarda la referencia al elemento para no tener que volver a consultar el DOM
        // (querySelectorAll) en cada paso del zoom: eso es justamente lo que lo hacía sentir
        // pesado en documentos largos.
        state.pageState[num] = {
          pdfPage: null,
          nativeW,
          nativeH,
          canvas: null,
          isRendering: false,
          renderedScale: 0,
          visible: false,
          wrapperEl: pageWrapper,
        };
      } else {
        pageWrapper.style.width = '800px';
        pageWrapper.style.minHeight = '800px';
        pageWrapper.style.fontSize = `${16 * state.currentScale}px`;
      }

      pageWrapper.innerHTML = `<i data-lucide="loader" class="w-8 h-8 text-gray-300 animate-spin absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></i>`;

      state.docContainer.appendChild(pageWrapper);
      state.lazyRenderObserver.observe(pageWrapper);
      state.pageViewObserver.observe(pageWrapper);
      if (!state.documentObj.isDocx) state.farUnloadObserver.observe(pageWrapper);
    }

    lucide.createIcons();
    state.btnPlayPause.disabled = false;

    if (scrollAnchor) {
      // Restaura el punto exacto donde estaba el usuario (misma página y misma posición relativa).
      // Si el ancla trae clientY (viene de un gesto de zoom), ese contenido vuelve a quedar
      // exactamente bajo ese mismo punto de la pantalla; si no, se coloca en el tope del área visible.
      const anchorEl = document.getElementById(`page-${scrollAnchor.anchorPage}`);
      if (anchorEl) {
        state.preventScrollObserver = true;
        const targetContentY = anchorEl.offsetTop + scrollAnchor.fraction * anchorEl.offsetHeight;
        if (scrollAnchor.clientY !== null && scrollAnchor.clientY !== undefined) {
          const mainRect = state.mainScroll.getBoundingClientRect();
          state.mainScroll.scrollTop = targetContentY - (scrollAnchor.clientY - mainRect.top);
        } else {
          state.mainScroll.scrollTop = targetContentY;
        }
        setTimeout(() => (state.preventScrollObserver = false), 150);
      } else if (targetPage > 1) {
        scrollToPage(targetPage);
      }
    } else if (targetPage > 1) {
      scrollToPage(targetPage);
    }

    extractFullTextInBackground();
    if (typeof syncTopBar === 'function') syncTopBar();
    updateCustomScrollbarThumb();
  } catch (error) {
    console.error(error);
  }
}

export async function refreshPageCanvas(num, wrapperEl) {
  const st = state.pageState[num];
  if (!st || st.isRendering) return;
  if (st.canvas && st.renderedScale === state.currentScale) return;
  st.isRendering = true;
  try {
    const page = st.pdfPage || (await state.documentObj.getPage(num));
    st.pdfPage = page;
    if (!st.visible) return;

    const viewport = page.getViewport({ scale: state.currentScale });
    const outputScale = getSafeOutputScale(viewport.width, viewport.height);
    const newCanvas = document.createElement('canvas');
    newCanvas.className = 'block absolute top-0 left-0 z-0';
    newCanvas.style.width = '100%';
    newCanvas.style.height = '100%';
    newCanvas.width = Math.ceil(viewport.width * outputScale);
    newCanvas.height = Math.ceil(viewport.height * outputScale);

    const renderTransform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    await page.render({
      canvasContext: newCanvas.getContext('2d', { alpha: false }),
      viewport,
      transform: renderTransform,
    }).promise;

    if (!st.visible) {
      releaseCanvas(newCanvas);
      return;
    }

    const oldCanvas = st.canvas;
    wrapperEl.appendChild(newCanvas);
    if (oldCanvas) releaseCanvas(oldCanvas);
    st.canvas = newCanvas;
    st.renderedScale = state.currentScale;
  } catch (e) {
    if (!e || e.name !== 'RenderingCancelledException')
      console.error(`Error redibujando pag ${num}:`, e);
  } finally {
    st.isRendering = false;
  }
}

export async function renderSinglePageCanvasAndText(num, wrapperEl) {
  const existingSt = state.pageState[num];
  if (existingSt && existingSt.isRendering) return; // ya hay un renderizado de esta página en curso
  try {
    const st = (state.pageState[num] = state.pageState[num] || {
      visible: true,
      isRendering: false,
    });
    st.isRendering = true;
    const page = await state.documentObj.getPage(num);
    st.pdfPage = page;
    if (!st.visible) return; // salió de vista antes de empezar a dibujar

    const nativeVp = page.getViewport({ scale: 1 });
    st.nativeW = nativeVp.width;
    st.nativeH = nativeVp.height;
    // El tamaño real de esta página puede diferir levemente del usado como marcador
    // de posición (basado en la página 1); se corrige aquí.
    wrapperEl.style.width = `${st.nativeW * state.currentScale}px`;
    wrapperEl.style.height = `${st.nativeH * state.currentScale}px`;

    const viewport = page.getViewport({ scale: state.currentScale });

    // En pantallas de alta densidad (móviles, retina) hay que renderizar el canvas a más
    // resolución real (devicePixelRatio) y luego "encogerlo" con CSS al tamaño visual deseado;
    // si no, el navegador tiene que estirar una imagen de baja resolución y se ve borrosa.
    // El tope de getSafeOutputScale evita canvases gigantes (y quedarse sin memoria) a
    // niveles de zoom altos, donde de todas formas la nitidez extra ya no se nota.
    const outputScale = getSafeOutputScale(viewport.width, viewport.height);
    const canvas = document.createElement('canvas');
    canvas.className = 'block absolute top-0 left-0 z-0';
    canvas.width = Math.ceil(viewport.width * outputScale);
    canvas.height = Math.ceil(viewport.height * outputScale);
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const renderTransform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;
    await page.render({
      canvasContext: canvas.getContext('2d', { alpha: false }),
      viewport: viewport,
      transform: renderTransform,
    }).promise;

    if (!st.visible) return; // salió de vista mientras se renderizaba

    // Solo tras terminar de dibujar por completo se inserta el canvas y se quita el
    // spinner: así se evita cualquier parpadeo (flash) de lienzo en blanco.
    const spinner = wrapperEl.querySelector('.animate-spin');
    if (spinner) spinner.remove();
    wrapperEl.appendChild(canvas);
    st.canvas = canvas;
    st.renderedScale = state.currentScale;

    const textContent = await page.getTextContent();
    buildTextLayerAndSentences(textContent, viewport, wrapperEl, num);

    wrapperEl.setAttribute('data-rendered', 'true'); // recién ahora: canvas + texto completos
  } catch (e) {
    console.error(`Error pag ${num}:`, e);
  } finally {
    if (state.pageState[num]) state.pageState[num].isRendering = false;
  }
}

export function buildDocxTextLayerAndSentences(html, wrapperDiv, pageNum) {
  wrapperDiv.setAttribute('data-rendered', 'true');
  const spinner = wrapperDiv.querySelector('.animate-spin');
  if (spinner) spinner.remove();

  let contentDiv = document.createElement('div');
  contentDiv.className = 'w-full relative z-10 block docx-content';
  contentDiv.innerHTML = html;
  wrapperDiv.appendChild(contentDiv);

  state.docTextByPage[pageNum] = contentDiv.innerText || '';
  state.pageSentences[pageNum] = [];

  let pIdCounter = state.globalParagraphCounter;

  function wrapWordsInNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      if (!text.trim()) return;

      const fragment = document.createDocumentFragment();
      const tokens = text.split(/(\s+)/);
      let localChunkWords = [];

      tokens.forEach((token) => {
        if (!token) return;
        if (token.trim().length === 0) {
          fragment.appendChild(document.createTextNode(token));
          return;
        }
        const span = document.createElement('span');
        span.textContent = token;
        span.className =
          'hover:bg-[#C4B5FD]/40 transition-colors cursor-pointer doc-word rounded-sm';
        fragment.appendChild(span);

        const wObj = { text: token, element: span, fontHeight: 16 * state.currentScale };
        localChunkWords.push(wObj);

        if (token.match(/[.!?]["']?$/)) {
          state.pageSentences[pageNum].push({
            words: localChunkWords,
            paragraphId: pIdCounter,
            pageNum: pageNum,
          });
          localChunkWords = [];
        }
      });

      if (localChunkWords.length > 0) {
        state.pageSentences[pageNum].push({
          words: localChunkWords,
          paragraphId: pIdCounter,
          pageNum: pageNum,
        });
      }

      node.parentNode.replaceChild(fragment, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const blockTags = [
        'P',
        'DIV',
        'H1',
        'H2',
        'H3',
        'H4',
        'H5',
        'H6',
        'LI',
        'TD',
        'TR',
        'BLOCKQUOTE',
      ];
      if (blockTags.includes(node.tagName.toUpperCase())) pIdCounter++;
      Array.from(node.childNodes).forEach((child) => wrapWordsInNode(child));
    }
  }

  Array.from(contentDiv.childNodes).forEach((child) => wrapWordsInNode(child));
  state.globalParagraphCounter = pIdCounter;

  state.pageSentences[pageNum].forEach((s, localSIndex) => {
    s.words.forEach((wObj, wIndex) => {
      if (wObj.text.trim().length > 0) {
        wObj.element.onclick = (e) => {
          e.stopPropagation();
          playFromWord(pageNum, localSIndex, wIndex);
        };
      }
    });
  });
  rebuildGlobalSentences();
}

export function buildTextLayerAndSentences(textContent, viewport, wrapperDiv, pageNum) {
  let topMargin = 0;
  let bottomMargin = viewport.height;
  let leftMargin = 0;
  let rightMargin = viewport.width;

  if (state.isMarginsActive) {
    topMargin = viewport.height * (state.savedMargins.top / 100);
    bottomMargin = viewport.height * (1 - state.savedMargins.bot / 100);
    leftMargin = viewport.width * (state.savedMargins.left / 100);
    rightMargin = viewport.width * (1 - state.savedMargins.right / 100);
  }

  let textLayerDiv = wrapperDiv.querySelector('.text-layer');
  if (!textLayerDiv) {
    textLayerDiv = document.createElement('div');
    textLayerDiv.className = 'text-layer z-10';
    wrapperDiv.appendChild(textLayerDiv);
  } else textLayerDiv.innerHTML = '';

  state.docTextByPage[pageNum] = '';
  state.pageSentences[pageNum] = [];

  let lastY = null;
  let lastX = null;
  let localPageSentences = [];
  let localChunkWords = [];
  let pageFonts = [];

  function pushLocalChunk() {
    if (localChunkWords.length === 0) return;
    localPageSentences.push({
      words: localChunkWords,
      paragraphId: state.globalParagraphCounter,
      pageNum: pageNum,
    });
    localChunkWords = [];
  }

  textContent.items.forEach((item) => {
    if (!('str' in item)) return;

    const vTransform = viewport.transform || [state.currentScale, 0, 0, state.currentScale, 0, 0];
    const tx = transformMatrix(vTransform, item.transform);
    const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
    const yTop = tx[5] - fontHeight;

    if (yTop < topMargin || yTop > bottomMargin || tx[4] < leftMargin || tx[4] > rightMargin)
      return;
    if (item.str.trim()) pageFonts.push(fontHeight);

    if (
      lastY !== null &&
      (Math.abs(yTop - lastY) > fontHeight * 1.5 || Math.abs(tx[4] - lastX) > viewport.width * 0.5)
    ) {
      pushLocalChunk();
      state.globalParagraphCounter++;
    }
    lastY = yTop;
    lastX = tx[4];

    state.docTextByPage[pageNum] += item.str + ' ';
    if (!item.str.trim() && !item.hasEOL) return;

    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${tx[4]}px`;
    wrapper.style.top = `${yTop}px`;
    wrapper.style.fontSize = `${fontHeight}px`;
    wrapper.style.fontFamily = item.fontName || 'sans-serif';
    wrapper.style.color = 'transparent';
    wrapper.style.whiteSpace = 'pre';
    wrapper.style.pointerEvents = 'none';

    const tokens = item.str.split(/(\s+)/);
    tokens.forEach((token) => {
      if (!token) return;
      const span = document.createElement('span');
      span.textContent = token;
      span.style.pointerEvents = 'auto';
      if (token.trim().length > 0)
        span.classList.add(
          'hover:bg-[#C4B5FD]/40',
          'transition-colors',
          'cursor-pointer',
          'rounded-sm',
        );
      wrapper.appendChild(span);
      localChunkWords.push({ text: token, element: span, fontHeight: fontHeight });
      if (token.match(/[.!?]["']?$/)) pushLocalChunk();
    });

    if (item.hasEOL) {
      const spaceSpan = document.createElement('span');
      spaceSpan.textContent = ' ';
      wrapper.appendChild(spaceSpan);
      localChunkWords.push({ text: ' ', element: spaceSpan, fontHeight: fontHeight });
    }
    textLayerDiv.appendChild(wrapper);
  });
  pushLocalChunk();

  pageFonts.sort((a, b) => a - b);
  const medianFont = pageFonts[Math.floor(pageFonts.length / 2)] || 10;

  if (!state.readFiguresActive) {
    const paras = {};
    localPageSentences.forEach((s) => {
      if (!paras[s.paragraphId]) paras[s.paragraphId] = [];
      paras[s.paragraphId].push(s);
    });

    localPageSentences = [];
    for (let pId in paras) {
      const pSents = paras[pId];
      const fullParaText = pSents
        .map((s) => s.words.map((w) => w.text).join(''))
        .join(' ')
        .trim();
      const isLegend =
        /^(figura|figure|fig\.|tabla|table|gr[áa]fico|gr[áa]fica|chart|esquema|imagen|img)/i.test(
          fullParaText,
        );
      const wordCount = fullParaText.split(/\s+/).filter((w) => w.trim().length > 0).length;
      const withoutPeriod = !/[.!?:]\s*$/.test(fullParaText);
      const isShortWithoutPeriod = wordCount < 7 && withoutPeriod;
      let maxFontInPara = 0;
      pSents.forEach((s) =>
        s.words.forEach((w) => {
          maxFontInPara = Math.max(maxFontInPara, w.fontHeight || 0);
        }),
      );

      const isAllCaps =
        fullParaText === fullParaText.toUpperCase() && /[A-ZÁÉÍÓÚ]/.test(fullParaText);
      const isSubheading = isShortWithoutPeriod && (maxFontInPara > medianFont * 1.15 || isAllCaps);

      let shouldIgnore = false;
      if (isLegend || (isShortWithoutPeriod && !isSubheading)) shouldIgnore = true;
      if (!shouldIgnore && maxFontInPara < medianFont * 0.95) shouldIgnore = true;

      if (!shouldIgnore) {
        localPageSentences.push(...pSents);
      } else {
        pSents.forEach((s) =>
          s.words.forEach((w) => {
            w.element.onclick = null;
            w.element.classList.remove('cursor-pointer', 'hover:bg-[#C4B5FD]/40');
          }),
        );
      }
    }
  }

  localPageSentences.forEach((s, localSIndex) => {
    s.words.forEach((wObj, wIndex) => {
      if (wObj.text.trim().length > 0) {
        wObj.element.onclick = (e) => {
          e.stopPropagation();
          playFromWord(pageNum, localSIndex, wIndex);
        };
      }
    });
    state.pageSentences[pageNum].push(s);
  });
  rebuildGlobalSentences();
}

export async function renderAllPagesPreservingPlayback(targetPage, scrollAnchor = null) {
  const wasPlaying = state.isPlaying && !state.isPaused;
  let savedPageNum = null,
    savedLocalIdx = null;
  const savedWordOffset = state.currentWordOffset;

  if (state.currentSentenceIndex >= 0 && state.currentSentenceIndex < state.sentences.length) {
    const curS = state.sentences[state.currentSentenceIndex];
    savedPageNum = curS.pageNum;
    savedLocalIdx = state.pageSentences[curS.pageNum]
      ? state.pageSentences[curS.pageNum].indexOf(curS)
      : null;
  }

  await renderAllPages(targetPage, true, scrollAnchor);

  if (savedPageNum === null || savedLocalIdx === null) return;

  // Las páginas se reconstruyen de forma diferida (lazy) al entrar en el viewport,
  // así que esperamos a que la página objetivo termine de generar sus frases.
  const maxWaitMs = 5000;
  const stepMs = 100;
  let waited = 0;
  while (waited < maxWaitMs) {
    if (state.pageSentences[savedPageNum] && state.pageSentences[savedPageNum][savedLocalIdx])
      break;
    await state.delay(stepMs);
    waited += stepMs;
  }

  const restoredSentence =
    state.pageSentences[savedPageNum] && state.pageSentences[savedPageNum][savedLocalIdx];
  if (!restoredSentence) return;

  rebuildGlobalSentences();
  const newGlobalIdx = state.sentences.indexOf(restoredSentence);
  if (newGlobalIdx === -1) return;

  state.currentSentenceIndex = newGlobalIdx;
  state.currentWordOffset = savedWordOffset;

  if (wasPlaying) {
    state.isPlaying = true;
    state.isPaused = false;
    speakNextSentence();
  }
}
