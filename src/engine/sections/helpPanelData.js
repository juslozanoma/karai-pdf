// ===============================================================================================
// SECCIÓN: Datos estáticos del panel de ayuda sobre botones
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { openAnchoredPanel } from './anchoredPanels.js';
import { updateMenuButtonState } from './buttonStyles.js';
import { toggleFixedMenu } from './floatingMenus.js';
import { updateSubtitleViewportClamp } from './subtitleResize.js';

export function renderHelpList() {
  const list = document.getElementById('help-list');
  list.innerHTML = '';
  state.TOOLBAR_HELP_ITEMS.forEach((item) => {
    const row = document.createElement('div');
    row.className =
      'flex items-start gap-2.5 text-xs border-b border-gray-100 last:border-0 pb-2.5 last:pb-0';
    row.innerHTML = `
                    <div class="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-[#F1EEFF] text-[#7C3AED] flex items-center justify-center">
                        <i data-lucide="${item.icon}" class="w-3.5 h-3.5"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-semibold text-gray-700 mb-0.5">${item.title}</p>
                        <p class="text-gray-500 leading-snug">${item.desc}</p>
                    </div>
                `;
    list.appendChild(row);
  });
  lucide.createIcons();
}

export function openHelpPanel(anchorBtn) {
  const panel = document.getElementById('help-panel');
  if (panel.classList.contains('hidden')) renderHelpList();
  openAnchoredPanel(panel, anchorBtn, 320, true);
}

export function isMobileScreen() {
  // "Smartphone": pantalla angosta y con pantalla táctil (evita disparar esto en un
  // navegador de escritorio simplemente porque la ventana esté angosta).
  return window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

export function autoFullscreenOnMobileUpload() {
  if (isMobileScreen() && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initHelpPanelDataSection() {
  document.addEventListener('fullscreenchange', () => {
    const btn = document.getElementById('topbar-btn-fullscreen');
    const icon = document.getElementById('topbar-icon-fullscreen');
    if (!btn || !icon) return;
    if (document.fullscreenElement) {
      icon.setAttribute('data-lucide', 'shrink');
      btn.title = 'Salir de pantalla completa (Z)';
    } else {
      icon.setAttribute('data-lucide', 'expand');
      btn.title = 'Pantalla completa (Z)';
    }
    lucide.createIcons();
  });
  document.getElementById('btn-close-help').addEventListener('click', () => {
    document.getElementById('help-panel').classList.add('hidden');
    document.getElementById('help-panel').classList.remove('flex');
  });
  document.getElementById('btn-close-shortcuts').addEventListener('click', () => {
    document.getElementById('shortcuts-panel').classList.add('hidden');
  });
  for (let mobileId in state.mobileBtnMapping) {
    const btn = document.getElementById(mobileId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById(state.mobileBtnMapping[mobileId]).click();
      });
    }
  }
  if (state.overflowLeftMenu) {
    state.overflowLeftMenu.addEventListener('click', (e) => {
      e.stopPropagation(); // Evita que cierre el panel de ajustes
    });
  }
  if (state.btnUploadMobile) {
    state.btnUploadMobile.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('doc-upload').click(); // Activa el input file del desktop
      updateMenuButtonState(); // Actualiza estados visuales
    });
  }
  state.btnToc.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFixedMenu('btn-toc', 'toc-panel');
  });
  document.getElementById('btn-close-toc').addEventListener('click', () => {
    document.getElementById('toc-panel').classList.add('hidden');
    document.getElementById('toc-panel').classList.remove('flex');
    updateMenuButtonState();
  });
  state.btnFiguresIndex.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFixedMenu('btn-figures-index', 'figures-panel');
  });
  document.getElementById('btn-close-figures-panel').addEventListener('click', () => {
    document.getElementById('figures-panel').classList.add('hidden');
    document.getElementById('figures-panel').classList.remove('flex');
    updateMenuButtonState();
  });
  state.subtitleSizeSlider.addEventListener('input', (e) => {
    const size = e.target.value + 'px';
    document.getElementById('subtitle-size-val').textContent = size;
    state.transcriptionText.style.fontSize = size;
    updateSubtitleViewportClamp();
  });
}
