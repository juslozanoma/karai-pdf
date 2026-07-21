// ===============================================================================================
// SECCIÓN: Menús flotantes de la UI y márgenes
// -----------------------------------------------------------------------------------------------
// Migrado tal cual del <script> original de V14_unal.html (misma lógica, mismo comportamiento).
// ===============================================================================================

import { state } from '../state.js';
import { updateMenuButtonState } from './buttonStyles.js';
import { processChatQueryStreaming, processChatQueryWithImage } from './chat.js';
import { showStatus, stopSpeech } from './subtitleHighlight.js';

export function toggleFixedMenu(btnId, menuId, focusInputId = null) {
  const btn = document.getElementById(btnId);
  const menu = document.getElementById(menuId);

  if (!menu.classList.contains('hidden')) {
    menu.classList.add('hidden');
    state.currentMenuBtn = null;
    if (menuId === 'voice-dropdown-menu' || menuId === 'toc-panel' || menuId === 'figures-panel')
      menu.classList.remove('flex');
    updateMenuButtonState();
    return;
  }

  document.getElementById('margins-panel').classList.add('hidden');
  document.getElementById('shortcuts-panel').classList.add('hidden');
  document.getElementById('mobile-lang-panel').classList.add('hidden');
  document.getElementById('voice-dropdown-menu').classList.add('hidden');
  document.getElementById('voice-dropdown-menu').classList.remove('flex');
  document.getElementById('toc-panel').classList.add('hidden');
  document.getElementById('toc-panel').classList.remove('flex');
  document.getElementById('figures-panel').classList.add('hidden');
  document.getElementById('figures-panel').classList.remove('flex');

  state.currentMenuBtn = btn;
  positionMenuOverButton(menu, btn);

  menu.classList.remove('hidden');
  if (menuId === 'voice-dropdown-menu' || menuId === 'toc-panel' || menuId === 'figures-panel') {
    menu.classList.add('flex');
    if (focusInputId) document.getElementById(focusInputId).focus();
  }
  updateMenuButtonState();
}

export function positionMenuOverButton(menu, btn) {
  if (!menu || !btn) return;

  const rect = btn.getBoundingClientRect();
  const menuWidth = menu.offsetWidth || 288;
  const menuHeight = menu.offsetHeight || 400;

  // Eliminar transformaciones previas de Tailwind que puedan interferir
  menu.style.transform = 'none';

  // Calcular posición centrada horizontalmente sobre el botón
  let left = rect.left + rect.width / 2 - menuWidth / 2;
  let bottom = window.innerHeight - rect.top + 10;

  // Ajustar si se sale por la derecha
  if (left + menuWidth > window.innerWidth - 10) {
    left = window.innerWidth - menuWidth - 10;
  }
  // Ajustar si se sale por la izquierda
  if (left < 10) left = 10;

  // Ajustar si se sale por arriba (mostrar hacia abajo)
  if (rect.top - menuHeight < 10) {
    bottom = window.innerHeight - rect.bottom - 10 - menuHeight;
    if (bottom < 10) bottom = 10;
  }

  menu.style.left = `${left}px`;
  menu.style.bottom = `${bottom}px`;
  menu.style.right = 'auto';
  menu.style.top = 'auto';
}

// Código imperativo de configuración de esta sección (listeners, llamadas iniciales, etc.)
// que en el script original corría directamente al cargar la página. Se invoca una sola vez
// desde initReaderEngine() (src/engine/index.js), en el mismo orden que tenía originalmente.
export function initFloatingMenusSection() {
  window.addEventListener('resize', () => {
    if (state.currentMenuBtn) {
      const openMenus = [
        'mobile-lang-panel',
        'margins-panel',
        'voice-dropdown-menu',
        'toc-panel',
        'figures-panel',
        'shortcuts-panel',
      ];
      for (const menuId of openMenus) {
        const menu = document.getElementById(menuId);
        if (menu && !menu.classList.contains('hidden')) {
          positionMenuOverButton(menu, state.currentMenuBtn);
          break;
        }
      }
    }
    requestAnimationFrame(state.adjustNav);
  });
  state.btnToggleChat.addEventListener('click', () => {
    state.chatPanel.classList.toggle('hidden');
    state.chatPanel.classList.toggle('flex');
    state.btnToggleChat.classList.toggle('bg-indigo-100');
    state.btnToggleChat.classList.toggle('text-indigo-600');
  });
  document.getElementById('btn-close-chat').addEventListener('click', () => {
    state.chatPanel.classList.add('hidden');
    state.chatPanel.classList.remove('flex');
    state.btnToggleChat.classList.remove('bg-[#7C3AED]', 'text-white');
  });
  document.getElementById('btn-clear-chat-history').addEventListener('click', () => {
    stopSpeech();
    state.chatContext = [];
    state.chatHistory.innerHTML = '';
    state.pendingImageBase64 = null;
    state.imgPreviewContainer.classList.add('hidden');
    state.imgPreviewImg.src = '';
    state.aiInput.placeholder = 'Escribe tu pregunta aquí';
  });
  state.btnChatBrief.addEventListener('click', () => {
    state.isChatBriefEnabled = !state.isChatBriefEnabled;
    if (state.isChatBriefEnabled) {
      state.btnChatBrief.classList.add('text-[#7C3AED]');
      state.btnChatBrief.classList.remove('text-gray-400');
    } else {
      state.btnChatBrief.classList.remove('text-[#7C3AED]');
      state.btnChatBrief.classList.add('text-gray-400');
    }
  });
  state.btnChatSound.addEventListener('click', () => {
    state.isChatSoundEnabled = !state.isChatSoundEnabled;
    if (state.isChatSoundEnabled) {
      state.btnChatSound.classList.add('text-[#7C3AED]');
      state.btnChatSound.classList.remove('text-gray-400');
      state.iconChatSound.setAttribute('data-lucide', 'volume-2');
    } else {
      state.btnChatSound.classList.remove('text-[#7C3AED]');
      state.btnChatSound.classList.add('text-gray-400');
      state.iconChatSound.setAttribute('data-lucide', 'volume-x');
    }
    lucide.createIcons();
  });
  state.btnChatWeb.addEventListener('click', () => {
    state.isChatWebEnabled = !state.isChatWebEnabled;
    if (state.isChatWebEnabled) {
      state.btnChatWeb.classList.add('text-[#7C3AED]');
      state.btnChatWeb.classList.remove('text-gray-400');
    } else {
      state.btnChatWeb.classList.remove('text-[#7C3AED]');
      state.btnChatWeb.classList.add('text-gray-400');
    }
    lucide.createIcons();
  });
  if (state.chatDictateRecognition) {
    state.chatDictateRecognition.continuous = false;
    state.chatDictateRecognition.interimResults = true;
    state.chatDictateRecognition.onstart = () => {
      state.btnChatDictate.classList.add('text-red-500', 'animate-pulse');
      document.getElementById('ai-input').placeholder = 'Escuchando...';
    };
    state.chatDictateRecognition.onresult = (e) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        else interimTranscript += e.results[i][0].transcript;
      }
      if (finalTranscript)
        document.getElementById('ai-input').value +=
          (document.getElementById('ai-input').value ? ' ' : '') + finalTranscript;
    };
    state.chatDictateRecognition.onend = () => {
      state.btnChatDictate.classList.remove('text-red-500', 'animate-pulse');

      const inputVal = document.getElementById('ai-input').value.trim();

      if (state.pendingImageBase64 && !state.isDocumentIndexing) {
        // Hay una imagen pendiente del Modo Rastreador:
        // la pregunta dictada se envía JUNTO con la imagen (ambos), no solo el texto.
        processChatQueryWithImage(state.pendingImageBase64, inputVal);
        document.getElementById('ai-input').value = '';
        state.pendingImageBase64 = null;
        document.getElementById('img-preview-container').classList.add('hidden');
        document.getElementById('img-preview-img').src = '';
        document.getElementById('ai-input').placeholder = 'Escribe tu pregunta aquí';
      } else if (
        inputVal &&
        (state.documentRAGChunks.length > 0 || state.isChatWebEnabled) &&
        !state.isDocumentIndexing
      ) {
        document.getElementById('ai-input').placeholder = 'Escribe tu pregunta aquí';
        processChatQueryStreaming(inputVal);
        document.getElementById('ai-input').value = '';
      } else {
        document.getElementById('ai-input').placeholder = 'Escribe tu pregunta aquí';
      }
    };
  }
  state.btnChatDictate.addEventListener('click', () => {
    if (state.chatDictateRecognition) {
      // El idioma de dictado debe seguir siempre al idioma de lectura/voz seleccionado
      // actualmente (no quedarse fijo en español), para que la transcripción sea precisa.
      let dictateLang = 'es-ES';
      if (state.userSelectedVoiceURI) {
        const v = state.synth.getVoices().find((v) => v.voiceURI === state.userSelectedVoiceURI);
        if (v && v.lang) dictateLang = v.lang;
      }
      state.chatDictateRecognition.lang = dictateLang;
      try {
        state.chatDictateRecognition.start();
      } catch (e) {}
    } else {
      showStatus('Este navegador no admite dictado por voz.', true);
      setTimeout(() => showStatus('', false), 3500);
    }
  });
}
