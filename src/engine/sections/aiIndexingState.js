// ===============================================================================================
// SECCIÓN: Estado global de IA y extracción/indexación
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { updateMenuButtonState } from './buttonStyles.js';
import { renderDynamicIndex } from './customScrollbar.js';
import { scrollToPage } from './pageNavigation.js';
import { showStatus } from './subtitleHighlight.js';

export function updateAIActionsState(indexing) {
  state.isDocumentIndexing = indexing;
  const btnChat = document.getElementById('btn-toggle-chat');
  const btnMic = document.getElementById('btn-mic');
  if (indexing) {
    btnChat.classList.add('btn-disabled-indexing');
    btnMic.classList.add('btn-disabled-indexing');
    btnChat.title = 'Cargando documento...';
    btnMic.title = 'Cargando documento...';
  } else {
    btnChat.classList.remove('btn-disabled-indexing');
    btnMic.classList.remove('btn-disabled-indexing');
    btnChat.title = 'Abrir Panel de IA (H)';
    btnMic.title = 'Micrófono IA (M)';
    showStatus('', false);
  }
}

export async function loadOutlineNativelyPDF() {
  try {
    const outline = await state.documentObj.getOutline();
    if (!outline || outline.length === 0) return false;
    state.tableOfContents = [];
    await processOutlineItemsPDF(outline, 1);
    state.tableOfContents.sort((a, b) => a.page - b.page);
    return state.tableOfContents.length > 0;
  } catch (e) {
    return false;
  }
}

export async function processOutlineItemsPDF(items, level) {
  for (const item of items) {
    let pageNum = null;
    try {
      let dest = item.dest;
      if (typeof dest === 'string') {
        dest = await state.documentObj.getDestination(dest);
      }
      if (Array.isArray(dest) && dest.length > 0) {
        const ref = dest[0];
        if (typeof ref === 'object' && ref !== null) {
          const pageIndex = await state.documentObj.getPageIndex(ref);
          pageNum = pageIndex + 1;
        } else if (typeof ref === 'number') {
          pageNum = ref + 1;
        }
      }
    } catch (e) {}

    if (pageNum !== null && item.title) {
      let safeTitle = item.title
        .replace(/[\x00-\x1F\x7F-\x9F\uFFFD\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (safeTitle) state.tableOfContents.push({ title: safeTitle, page: pageNum, level: level });
    }
    if (item.items && item.items.length > 0) await processOutlineItemsPDF(item.items, level + 1);
  }
}

export async function extractFullTextInBackground() {
  if (state.isExtractingText || !state.documentObj) return;
  state.isExtractingText = true;
  updateAIActionsState(true);

  state.fullDocTextContext = {};
  state.documentRAGChunks = [];
  state.tableOfContents = [];
  state.figuresIndex = [];

  if (state.documentObj.isDocx) {
    let currentChunkText = '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = state.documentObj.docxHtml;
    const cleanPageText = tempDiv.innerText.replace(/\s+/g, ' ').trim();
    state.fullDocTextContext[1] = cleanPageText;

    if (cleanPageText.length > 0) {
      let sentencesToChunk = cleanPageText.match(/[^.!?]+[.!?]+/g) || [cleanPageText];
      for (let sentence of sentencesToChunk) {
        currentChunkText += sentence + ' ';
        if (currentChunkText.length > 1000) {
          state.documentRAGChunks.push({ text: currentChunkText.trim(), startPage: 1, endPage: 1 });
          currentChunkText = '';
        }
      }
    }
    if (currentChunkText.trim().length > 0)
      state.documentRAGChunks.push({ text: currentChunkText.trim(), startPage: 1, endPage: 1 });

    state.isExtractingText = false;
    updateAIActionsState(false);
    renderTOCMenu();
    renderFiguresMenu();
    renderDynamicIndex();
    return;
  }

  const hasOutline = await loadOutlineNativelyPDF();
  let currentChunkText = '';
  let currentChunkStartPage = 1;

  for (let i = 1; i <= state.documentObj.numPages; i++) {
    try {
      const page = await state.documentObj.getPage(i);
      const textContent = await page.getTextContent();

      let pageRawText = '';
      let currentLine = '';
      let lineMaxFont = 0;
      let lastY = null;
      let pageLines = [];
      let pageFontSizes = [];

      textContent.items.forEach((item) => {
        pageRawText += item.str + (item.hasEOL ? '\n' : ' ');
        const fontHeight = Math.sqrt(
          item.transform[2] * item.transform[2] + item.transform[3] * item.transform[3],
        );
        if (item.str.trim()) pageFontSizes.push(fontHeight);

        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageLines.push({ text: currentLine.trim(), font: lineMaxFont, y: lastY });
          currentLine = '';
          lineMaxFont = 0;
        }
        currentLine += item.str;
        lineMaxFont = Math.max(lineMaxFont, fontHeight);
        lastY = item.transform[5];
      });

      if (currentLine.trim())
        pageLines.push({ text: currentLine.trim(), font: lineMaxFont, y: lastY });
      const cleanPageText = pageRawText.replace(/\s+/g, ' ').trim();
      state.fullDocTextContext[i] = cleanPageText;

      if (cleanPageText.length > 0) {
        let sentencesToChunk = cleanPageText.match(/[^.!?]+[.!?]+/g) || [cleanPageText];
        for (let sentence of sentencesToChunk) {
          if (currentChunkText.length === 0) currentChunkStartPage = i;
          currentChunkText += sentence + ' ';
          if (currentChunkText.length > 800) {
            state.documentRAGChunks.push({
              text: currentChunkText.trim(),
              startPage: currentChunkStartPage,
              endPage: i,
            });
            currentChunkText = sentence + ' ';
            currentChunkStartPage = i;
          }
        }
      }

      if (pageLines.length > 0) {
        pageFontSizes.sort((a, b) => a - b);
        const medianFont = pageFontSizes[Math.floor(pageFontSizes.length / 2)] || 10;
        let isIndexPage = /^\s*(?:índice|contenido)\b/i.test(cleanPageText.substring(0, 100));

        for (let j = 0; j < pageLines.length; j++) {
          let line = pageLines[j];
          let text = line.text.trim();
          if (!text) continue;

          if (line.font <= medianFont * 1.1 && !isIndexPage) {
            const figRegex =
              /^\W*(Figura|Fig\.?|Figure|Image|Illustration|Photograph|Photo|Graphic|Diagram|Map|Plate|SmartFigure|Smart\s+Figure|Supplementary\s+Figure|Supplementary\s+Fig\.?|Tabla|Table|Cuadro|Gr[áa]fico|Gr[áa]fica|Chart|Esquema)\s*([A-Z]?\d+(?:[.\-–—\u2212\u2010\u2011\u2012]\s*\d+)*(?:[.\-–—\u2212\u2010\u2011\u2012]\s*[A-Z](?![a-z]))?)?[\s:\.\-–—\u2212\u2010\u2011\u2012]*(.*)$/i;
            const figMatch = text.match(figRegex);

            if (figMatch) {
              let figType = figMatch[1].trim();
              let figNum = figMatch[2] ? figMatch[2].trim() : '';
              let captionText = figMatch[3] ? figMatch[3].trim() : '';
              const fullMatch = figMatch[0];
              const matchStart = text.indexOf(fullMatch);
              const typeInMatch = fullMatch.toLowerCase().indexOf(figType.toLowerCase());
              const typeStart = matchStart + typeInMatch;
              const prefixBeforeType = text.substring(0, typeStart);

              if (prefixBeforeType.includes('(')) continue;
              const suffix = text.substring(matchStart + fullMatch.length);
              if (suffix.trim().startsWith(')')) continue;

              if (!figNum) {
                const numMatch = text.match(
                  /\W*(Figura|Fig\.?|Figure|Image|Illustration|Photograph|Photo|Graphic|Diagram|Map|Plate|SmartFigure|Smart\s+Figure|Supplementary\s+Figure|Supplementary\s+Fig\.?|Tabla|Table|Cuadro|Gr[áa]fico|Gr[áa]fica|Chart|Esquema)\s*([A-Z]?\d+(?:[.\-–—\u2212\u2010\u2011\u2012]\s*\d+)*(?:[.\-–—\u2212\u2010\u2011\u2012]\s*[A-Z](?![a-z]))?)/i,
                );
                if (numMatch) {
                  figNum = numMatch[2].trim();
                  captionText = text.replace(numMatch[0], '').trim();
                }
              }

              if (figNum) figNum = figNum.replace(/\s+/g, '');
              if (!figNum) continue;

              let lookahead = j + 1;
              while (
                lookahead < pageLines.length &&
                pageLines[lookahead].font <= medianFont * 1.1
              ) {
                const nextText = pageLines[lookahead].text.trim();
                if (
                  /^\W*(Figura|Fig\.?|Figure|SmartFigure|Smart\s+Figure|Supplementary\s+Figure|Supplementary\s+Fig\.?|Tabla|Table|Cuadro|Gr[áa]fico|Gr[áa]fica|Chart|Graphic)/i.test(
                    nextText,
                  )
                )
                  break;
                captionText += ' ' + nextText;
                lookahead++;
              }

              captionText = captionText.replace(/\s+/g, ' ').trim();
              const descWords = captionText.split(/\s+/);
              const shortDesc =
                descWords.slice(0, 25).join(' ') + (descWords.length > 25 ? '...' : '');
              if (/^Fig\.?$/i.test(figType)) figType = 'Figura';

              state.figuresIndex.push({
                type: figType,
                number: figNum,
                caption: captionText,
                descripcion: shortDesc || 'Sin descripción.',
                page: i,
              });
              j = lookahead - 1;
            }
          }

          if (!hasOutline) {
            let cleanTextForTOC = text
              .replace(/[\x00-\x1F\x7F-\x9F\uFFFD\u200B-\u200D\uFEFF]/g, '')
              .replace(/\s+/g, ' ')
              .trim();
            let words = cleanTextForTOC.split(/\s+/).filter(Boolean);
            let wordCount = words.length;
            let isLarge = line.font > medianFont * 1.15;
            let isMedium = line.font > medianFont * 1.05;
            let isCaps =
              cleanTextForTOC === cleanTextForTOC.toUpperCase() &&
              /[A-ZÁÉÍÓÚÑ]/.test(cleanTextForTOC);
            let isChapOrNum =
              /^(cap[ií]tulo|chapter|parte|secci[óo]n|[\dIVXLCDM]+\.)\s/i.test(cleanTextForTOC) ||
              /^(\d+|[IVXLCDM]+)$/i.test(cleanTextForTOC);
            const alreadyExists = (title) =>
              state.tableOfContents.some(
                (item) =>
                  item.title.toLowerCase().replace(/\s+/g, ' ') ===
                  title.toLowerCase().replace(/\s+/g, ' '),
              );

            if (wordCount > 0 && wordCount < 15) {
              if (isLarge || isCaps || isChapOrNum) {
                if (
                  !/^(como|véase|según|ver|referencia|figura|tabla|gráfico|imagen)/i.test(
                    cleanTextForTOC,
                  ) &&
                  !isIndexPage
                ) {
                  let level = 1;
                  if (!isLarge && !isChapOrNum && isCaps && isMedium) level = 2;
                  if (!alreadyExists(cleanTextForTOC))
                    state.tableOfContents.push({ title: cleanTextForTOC, page: i, level: level });
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('Error en página', i);
    }
  }

  if (currentChunkText.trim().length > 0)
    state.documentRAGChunks.push({
      text: currentChunkText.trim(),
      startPage: currentChunkStartPage,
      endPage: state.documentObj.numPages,
    });

  state.isExtractingText = false;
  updateAIActionsState(false);

  if (!hasOutline) {
    state.tableOfContents.sort((a, b) => a.page - b.page);
    let uniqueToc = [];
    let lastTitle = '';
    for (let item of state.tableOfContents) {
      if (item.title !== lastTitle) {
        uniqueToc.push(item);
        lastTitle = item.title;
      }
    }
    state.tableOfContents = uniqueToc;
  }

  renderTOCMenu();
  renderFiguresMenu();
  renderDynamicIndex();
}

export function renderTOCMenu() {
  const list = document.getElementById('toc-list');
  list.innerHTML = '';
  if (state.tableOfContents.length === 0) {
    list.innerHTML =
      '<p class="text-xs text-gray-500 text-center py-4">No se detectó un índice estructurado.</p>';
    return;
  }
  state.tableOfContents.forEach((item) => {
    const btn = document.createElement('button');
    const paddingLeft = item.level > 1 ? `${(item.level - 1) * 12 + 10}px` : '10px';
    btn.className =
      'text-left text-xs py-2.5 pr-2 rounded hover:bg-[#F8F7FF] transition w-full border-b border-gray-100 last:border-0 text-gray-700 font-medium truncate flex justify-between items-center';
    btn.style.paddingLeft = paddingLeft;
    btn.innerHTML = `<span class="truncate pr-2">${item.title}</span> <span class="text-[#7C3AED] font-bold bg-[#F8F7FF] px-2 py-0.5 rounded text-[10px] shrink-0">Pág ${item.page}</span>`;
    btn.onclick = () => {
      scrollToPage(item.page, true);
      document.getElementById('toc-panel').classList.add('hidden');
      document.getElementById('toc-panel').classList.remove('flex');
      updateMenuButtonState();
    };
    list.appendChild(btn);
  });
}

export function renderFiguresMenu() {
  const list = document.getElementById('figures-list');
  list.innerHTML = '';
  if (state.figuresIndex.length === 0) {
    list.innerHTML =
      '<p class="text-xs text-gray-500 text-center py-4">No se detectaron figuras o tablas.</p>';
    return;
  }
  state.figuresIndex.forEach((item) => {
    const btn = document.createElement('button');
    btn.className =
      'text-left text-xs py-2.5 pr-2 rounded hover:bg-[#F8F7FF] transition w-full border-b border-gray-100 last:border-0 text-gray-700 font-medium truncate flex justify-between items-center';
    btn.style.paddingLeft = '10px';
    const typeStr = item.type.charAt(0).toUpperCase() + item.type.slice(1).toLowerCase();
    const displayTitle = item.number ? `${typeStr} ${item.number}` : typeStr;
    btn.innerHTML = `<span class="truncate pr-2">${displayTitle}</span><span class="text-[#7C3AED] font-bold bg-[#F8F7FF] px-2 py-0.5 rounded text-[10px] shrink-0">Pág ${item.page}</span>`;
    btn.onclick = () => {
      scrollToPage(item.page, true);
      document.getElementById('figures-panel').classList.add('hidden');
      document.getElementById('figures-panel').classList.remove('flex');
      updateMenuButtonState();
    };
    list.appendChild(btn);
  });
}
