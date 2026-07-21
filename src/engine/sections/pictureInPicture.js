// ===============================================================================================
// SECCIÓN: Ventana flotante (Picture-in-Picture)
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { openShortcutsPanel } from './anchoredPanels.js';
import { openHelpPanel, toggleFullscreen } from './helpPanelData.js';
import { showShortcutsBarTemporarily } from './keyboardShortcuts.js';
import { closeLiveConversation, openLiveConversation } from './liveConversation.js';
import { skipSentence, togglePlayPause } from './subtitleHighlight.js';
import { changeZoom, fitToHeight, fitToWidth, zoomAtCenter, zoomAtPoint } from './zoom.js';

export function buildPipContent(doc) {
  const style = doc.createElement('style');
  style.textContent = `
                html, body { margin:0; padding:0; height:100%; background:#fff; color:#374151;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                #pip-root { display:flex; flex-direction:column; height:100%; box-sizing:border-box; padding:14px 16px; }
                #pip-page { font-size:12px; color:#6b7280; text-align:center; margin-bottom:8px; }
                #pip-bar-track { height:6px; background:#eee; border-radius:3px; overflow:hidden; margin-bottom:16px; flex-shrink:0; }
                #pip-bar-fill { height:100%; width:0%; background:#7C3AED; transition:width .2s; }
                #pip-controls { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:12px; }
                #pip-controls button { border:none; cursor:pointer; border-radius:999px; display:flex; align-items:center; justify-content:center; }
                #pip-prev, #pip-next { width:38px; height:38px; font-size:16px; background:#F1EEFF; color:#7C3AED; }
                #pip-play { width:50px; height:50px; font-size:20px; background:#7C3AED; color:#fff; }
                #pip-controls button:hover { filter:brightness(0.95); }
                #pip-live { border:1px solid #E5DEFF; width:100%; padding:9px; border-radius:8px; background:#fff;
                    color:#7C3AED; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center;
                    justify-content:center; gap:6px; }
                #pip-live:hover { background:#F8F7FF; }
                #pip-live.on { background:#EF4444; color:#fff; border-color:#EF4444; }
            `;
  doc.head.appendChild(style);

  const root = doc.createElement('div');
  root.id = 'pip-root';
  root.innerHTML = `
                <div id="pip-page">–</div>
                <div id="pip-bar-track"><div id="pip-bar-fill"></div></div>
                <div id="pip-controls">
                    <button id="pip-prev" title="Oración anterior">⏮</button>
                    <button id="pip-play" title="Reproducir / Pausar">▶</button>
                    <button id="pip-next" title="Siguiente oración">⏭</button>
                </div>
                <button id="pip-live">🎙️ Conversación en vivo</button>
            `;
  doc.body.appendChild(root);

  return {
    page: root.querySelector('#pip-page'),
    fill: root.querySelector('#pip-bar-fill'),
    play: root.querySelector('#pip-play'),
    prev: root.querySelector('#pip-prev'),
    next: root.querySelector('#pip-next'),
    live: root.querySelector('#pip-live'),
  };
}

export function updatePipUI() {
  if (!state.pipEls) return;
  const total = state.documentObj ? state.documentObj.numPages || 0 : 0;
  state.pipEls.page.textContent = total
    ? `Página ${state.pageInput.value || 1} / ${total}`
    : 'Sin documento';
  const scrollable = state.mainScroll.scrollHeight - state.mainScroll.clientHeight;
  const pct = scrollable > 0 ? Math.round((state.mainScroll.scrollTop / scrollable) * 100) : 0;
  state.pipEls.fill.style.width = Math.min(100, Math.max(0, pct)) + '%';
  state.pipEls.play.textContent = state.isPlaying && !state.isPaused ? '⏸' : '▶';
  state.pipEls.live.classList.toggle('on', !!state.liveSessionActive);
  state.pipEls.live.textContent = state.liveSessionActive
    ? '🎙️ Terminar conversación'
    : '🎙️ Conversación en vivo';
}

export async function openFloatingPlayer() {
  if (!('documentPictureInPicture' in window)) return;
  if (window.documentPictureInPicture.window) {
    window.documentPictureInPicture.window.focus();
    return;
  }

  state.pipWindow = await window.documentPictureInPicture.requestWindow({
    width: 280,
    height: 210,
  });
  state.pipEls = buildPipContent(state.pipWindow.document);

  state.pipEls.prev.addEventListener('click', () => skipSentence(-1));
  state.pipEls.next.addEventListener('click', () => skipSentence(1));
  state.pipEls.play.addEventListener('click', () => togglePlayPause());
  state.pipEls.live.addEventListener('click', () => {
    if (state.liveSessionActive) closeLiveConversation(false, true);
    else openLiveConversation();
    updatePipUI();
  });

  state.pipWindow.addEventListener(
    'pagehide',
    () => {
      state.pipWindow = null;
      state.pipEls = null;
    },
    { once: true },
  );

  updatePipUI();
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initPictureInPictureSection() {
  if ('documentPictureInPicture' in window) {
    state.btnFloatingPlayer.classList.remove('hidden');
    state.btnFloatingPlayer.addEventListener('click', openFloatingPlayer);
  }
  state.mainScroll.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey || !state.documentObj || state.isInspectMode) return;
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      zoomAtPoint(state.pendingScale * factor, e.clientX, e.clientY);
    },
    { passive: false },
  );
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || !state.documentObj) return;
    if (
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'SELECT'
    )
      return;
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      changeZoom(1);
    } else if (e.key === '-') {
      e.preventDefault();
      changeZoom(-1);
    } else if (e.key === '0') {
      e.preventDefault();
      zoomAtCenter(1);
    }
  });
  document.getElementById('topbar-btn-open').addEventListener('click', () => {
    document.getElementById('doc-upload-main').click();
  });
  document.getElementById('topbar-btn-zoom-out').addEventListener('click', () => changeZoom(-1));
  document.getElementById('topbar-btn-zoom-in').addEventListener('click', () => changeZoom(1));
  state.topbarZoomPct.addEventListener('click', () => zoomAtCenter(1));
  document.getElementById('topbar-btn-fit-width').addEventListener('click', () => fitToWidth());
  document.getElementById('topbar-btn-fit-height').addEventListener('click', () => fitToHeight());
  state.topbarProgress.addEventListener('click', () =>
    state.mainScroll.scrollTo({ top: 0, behavior: 'smooth' }),
  );
  document
    .getElementById('topbar-btn-fullscreen')
    .addEventListener('click', () => toggleFullscreen());
  document.getElementById('topbar-btn-help').addEventListener('click', (e) => {
    e.stopPropagation();
    openHelpPanel(e.currentTarget);
  });
  document.getElementById('topbar-btn-shortcuts').addEventListener('click', (e) => {
    e.stopPropagation();
    openShortcutsPanel(e.currentTarget);
    showShortcutsBarTemporarily();
  });
}
