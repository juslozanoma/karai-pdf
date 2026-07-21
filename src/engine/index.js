// ===============================================================================================
// ORQUESTADOR DEL MOTOR DEL LECTOR
// -----------------------------------------------------------------------------------------------
// Punto de entrada único: initReaderEngine() se llama UNA vez desde useReaderEngine() (ver
// src/hooks/useReaderEngine.js), después de que el DOM ya está montado -- igual que el <script>
// original, que corría al final del <body> con el HTML ya parseado.
//
// El motor se separó en archivos por sección (src/engine/sections/*.js) para que cada uno se
// pueda abrir, leer y editar de forma independiente sin tocar un único archivo de miles de
// líneas. El ORDEN de inicialización de abajo es el MISMO orden en que aparecían estas secciones
// en el <script> original: varias secciones dependen de que las anteriores ya hayan corrido
// (por ejemplo, initInterfaceLanguage() -- llamado al final, dentro de la última sección --
// necesita que todo lo demás ya esté definido y conectado).
//
// Todas las secciones comparten el mismo objeto `state` (src/engine/state.js): initState() lo
// completa primero con todas las variables/reference al DOM que antes eran "let"/"const" de
// nivel superior del script.
// ===============================================================================================

import { state, initState } from './state.js';
import { initI18nRuntimeSection } from './sections/i18nRuntime.js';
import './sections/geminiConfig.js';
import { initGlobalConfigSection } from './sections/globalConfig.js';
import { initScrollLockSection } from './sections/scrollLock.js';
import { initChatPanelResizeSection } from './sections/chatPanelResize.js';
import { initButtonStylesSection } from './sections/buttonStyles.js';
import { initImageTrackerModeSection } from './sections/imageTrackerMode.js';
import { initTutorModeSection } from './sections/tutorMode.js';
import { initFloatingMenusSection } from './sections/floatingMenus.js';
import './sections/anchoredPanels.js';
import { initHelpPanelDataSection } from './sections/helpPanelData.js';
import { initAdvancedSettingsSection } from './sections/advancedSettings.js';
import { initHealthRemindersSection } from './sections/healthReminders.js';
import { initAutoTrackSendSection } from './sections/autoTrackSend.js';
import { initTranslateSubtitlesButtonsSection } from './sections/translateSubtitlesButtons.js';
import { initSubtitleResizeSection } from './sections/subtitleResize.js';
import { initIgnoreFiguresSection } from './sections/ignoreFigures.js';
import { initTtsSection } from './sections/tts.js';
import { initSubtitleHighlightSection } from './sections/subtitleHighlight.js';
import { initPageNavigationSection } from './sections/pageNavigation.js';
import { initCustomScrollbarSection } from './sections/customScrollbar.js';
import './sections/aiIndexingState.js';
import './sections/pdfDocxRenderer.js';
import './sections/zoom.js';
import { initTopToolbarSyncSection } from './sections/topToolbarSync.js';
import { initPictureInPictureSection } from './sections/pictureInPicture.js';
import { initKeyboardShortcutsSection } from './sections/keyboardShortcuts.js';
import { initChatSection } from './sections/chat.js';
import { initLiveConversationSection } from './sections/liveConversation.js';
import { initCompassNavigationSection } from './sections/compassNavigation.js';
import { initPinchZoomSection } from './sections/pinchZoom.js';

export function initReaderEngine() {
  lucide.createIcons();
  initState();
  initI18nRuntimeSection();
  initGlobalConfigSection();
  initScrollLockSection();
  initChatPanelResizeSection();
  initButtonStylesSection();
  initImageTrackerModeSection();
  initTutorModeSection();
  initFloatingMenusSection();
  initHelpPanelDataSection();
  initAdvancedSettingsSection();
  initHealthRemindersSection();
  initAutoTrackSendSection();
  initTranslateSubtitlesButtonsSection();
  initSubtitleResizeSection();
  initIgnoreFiguresSection();
  initTtsSection();
  initSubtitleHighlightSection();
  initPageNavigationSection();
  initCustomScrollbarSection();
  initTopToolbarSyncSection();
  initPictureInPictureSection();
  initKeyboardShortcutsSection();
  initChatSection();
  initLiveConversationSection();
  initCompassNavigationSection();
  initPinchZoomSection();
}
