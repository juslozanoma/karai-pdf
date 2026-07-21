// ===============================================================================================
// ESTADO COMPARTIDO DEL MOTOR
// -----------------------------------------------------------------------------------------------
// Centraliza TODAS las variables (antes "let"/"const" de nivel superior del <script> original,
// 213 en total) y referencias al DOM que se comparten entre las distintas secciones del motor
// (src/engine/sections/*.js). Cada sección hace `import { state } from '../state.js'` y lee/
// escribe sus propiedades (state.currentPage, state.synth, state.isPlaying, etc.) en vez de usar
// variables sueltas -- así una mutación hecha en un archivo es visible desde cualquier otro.
//
// `state` en sí NUNCA se reasigna (sigue siendo el mismo objeto todo el tiempo de vida de la
// app); solo se mutan sus propiedades. Eso es justamente lo que permite compartirlo de forma
// segura entre módulos ES sin usar getters/setters: reasignar el *binding* importado no está
// permitido, pero mutar una propiedad del objeto que ya referencia sí lo está.
//
// initState() debe llamarse UNA sola vez, muy al principio de initReaderEngine() (después de que
// el DOM ya está montado, ya que muchas propiedades son referencias document.getElementById).
// Las inicializaciones se conservan en el MISMO ORDEN relativo del script original porque varias
// dependen de otras ya asignadas antes (p. ej. SUBTITLE_MIN_FONT depende de subtitleSizeSlider).
// ===============================================================================================

// Nota: estos imports faltaban por completo en la migración original, lo que provocaba
// ReferenceError en tiempo de ejecución (p. ej. al subir un PDF/DOCX, al redimensionar la
// barra de navegación, o al hacer scroll) porque las funciones se usaban más abajo en este
// mismo archivo sin haber sido importadas. La dependencia circular con `state` en los módulos
// importados es segura: `state` se exporta como el mismo objeto durante todo el ciclo de vida
// de la app y ninguno de estos módulos ejecuta código a nivel superior que lo necesite antes de
// que el árbol de módulos termine de resolverse.
import {
  unloadPageContent,
  releaseCanvas,
  buildDocxTextLayerAndSentences,
  renderSinglePageCanvasAndText,
  renderAllPages,
  refreshPageCanvas,
} from './sections/pdfDocxRenderer.js';
import { updateCustomScrollbarThumb } from './sections/customScrollbar.js';
import { showTopToolbar } from './sections/topToolbarSync.js';
import { updateMenuButtonState } from './sections/buttonStyles.js';
import { t } from './sections/i18nRuntime.js';
import { autoFullscreenOnMobileUpload } from './sections/helpPanelData.js';

export const state = {};

export function initState() {
  state.appInterfaceLang = localStorage.getItem('pdfReaderInterfaceLang') || null;
  state.voiceListUiReady = false;
  state.DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-lite';
  state.DEFAULT_GEMINI_STUDY_MODEL = 'gemini-3.1-flash-lite';
  state.DEFAULT_GEMINI_LIVE_MODEL = 'gemini-3.1-flash-live-preview';
  state.apiKey =
    localStorage.getItem('pdfReaderApiKeyOverride') ||
    'AQ.Ab8RN6J50XweLQmNDAb3B3Dq3GbRZH3iC2w9Fibcdpt0joE92g';
  state.GEMINI_MODEL = localStorage.getItem('pdfReaderModelOverride') || state.DEFAULT_GEMINI_MODEL;
  state.GEMINI_STUDY_MODEL =
    localStorage.getItem('pdfReaderStudyModelOverride') || state.DEFAULT_GEMINI_STUDY_MODEL;
  state.GEMINI_LIVE_MODEL =
    localStorage.getItem('pdfReaderLiveModelOverride') || state.DEFAULT_GEMINI_LIVE_MODEL;
  state.API_USAGE_STORAGE_KEY = 'pdfReaderApiUsageStats_v1';
  state.delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  state.documentObj = null;
  state.currentScale = 1.5;
  state.docTextByPage = {};
  state.fullDocTextContext = {};
  state.documentRAGChunks = [];
  state.liveWs = null;
  state.liveSessionActive = false;
  state.liveSetupComplete = false;
  state.liveMicStream = null;
  state.liveMicContext = null;
  state.liveMicProcessor = null;
  state.livePlaybackContext = null;
  state.liveNextPlayTime = 0;
  state.livePlayingSources = [];
  state.liveCurrentUserBubble = null;
  state.liveCurrentAssistantBubble = null;
  state.isDocumentIndexing = false;
  state.tableOfContents = [];
  state.figuresIndex = [];
  state.sentences = [];
  state.pageSentences = {};
  state.docContainer = document.getElementById('pdf-container');
  state.emptyState = document.getElementById('empty-state');
  state.btnPlayPause = document.getElementById('btn-play-pause');
  state.btnNextSentence = document.getElementById('btn-next-sentence');
  state.btnPrevSentence = document.getElementById('btn-prev-sentence');
  state.mainScroll = document.getElementById('main-scroll');
  state.chatPanel = document.getElementById('chat-panel');
  state.currentSentenceIndex = -1;
  state.currentWordOffset = 0;
  state.globalParagraphCounter = 0;
  state.preventScrollObserver = false;
  state.isInspectMode = false;
  state.inspectScrollY = 0;
  state.chatContext = [];
  state.MAX_CHAT_HISTORY = 50;
  state.pendingImageBase64 = null;
  state.chatResizer = document.getElementById('chat-resizer');
  state.isResizingChat = false;
  state.leftWrapper = document.getElementById('nav-tools-left-wrapper');
  state.rightWrapper = document.getElementById('nav-tools-right-wrapper');
  state.navHideQueueLeft = [
    { id: 'btn-tutor-mode', mobileId: 'btn-tutor-mode-mobile', container: 'overflow-left-menu' },
    { id: 'btn-figures', mobileId: 'btn-figures-mobile', container: 'overflow-left-menu' },
    {
      id: 'btn-figures-index',
      mobileId: 'btn-figures-index-mobile',
      container: 'overflow-left-menu',
    },
    { id: 'btn-toc', mobileId: 'btn-toc-mobile', container: 'overflow-left-menu' },
  ];
  state.navHideQueueRight = [
    {
      id: 'voice-selector-wrapper',
      mobileId: 'voice-selector-btn-mobile-wrapper',
      container: null,
    },
    {
      id: 'btn-multilang-wrapper',
      mobileId: 'btn-multilang-mobile',
      container: 'overflow-lang-menu',
    },
    { id: 'rate-slider-container', mobileId: 'rate-slider-mobile-wrapper', container: null },
    {
      id: 'btn-translate-wrapper',
      mobileId: 'btn-translate-mobile',
      container: 'overflow-lang-menu',
    },
    {
      id: 'btn-subtitles-wrapper',
      mobileId: 'btn-subtitles-mobile',
      container: 'overflow-lang-menu',
    },
  ];
  state.currentHiddenCountLeft = 0;
  state.currentHiddenCountRight = 0;
  state.adjustNav = () => {
    if (!state.leftWrapper || !state.rightWrapper) return;
    const leftNav = document.getElementById('nav-tools-left');

    // --- LADO IZQUIERDO ---
    let isLeftOverflowing =
      leftNav.getBoundingClientRect().width > state.leftWrapper.clientWidth + 1;
    while (isLeftOverflowing && state.currentHiddenCountLeft < state.navHideQueueLeft.length) {
      const item = state.navHideQueueLeft[state.currentHiddenCountLeft];
      const el = document.getElementById(item.id);
      if (el) {
        el.style.display = 'none';
        const mobEl = document.getElementById(item.mobileId);
        if (mobEl) {
          mobEl.classList.remove('hidden');
          if (mobEl.tagName === 'BUTTON' || mobEl.tagName === 'DIV' || mobEl.tagName === 'LABEL')
            mobEl.classList.add('flex');
        }
        if (item.container) {
          const container = document.getElementById(item.container);
          if (container) {
            container.classList.remove('hidden');
            container.classList.add('flex');
          }
        }
      }
      state.currentHiddenCountLeft++;
      isLeftOverflowing = leftNav.getBoundingClientRect().width > state.leftWrapper.clientWidth + 1;
    }

    while (!isLeftOverflowing && state.currentHiddenCountLeft > 0) {
      const item = state.navHideQueueLeft[state.currentHiddenCountLeft - 1];
      const el = document.getElementById(item.id);
      if (el) {
        el.style.display = 'flex';
        if (leftNav.getBoundingClientRect().width > state.leftWrapper.clientWidth + 1) {
          el.style.display = 'none';
          break;
        } else {
          const mobEl = document.getElementById(item.mobileId);
          if (mobEl) {
            mobEl.classList.add('hidden');
            mobEl.classList.remove('flex');
          }
          if (item.container) {
            const container = document.getElementById(item.container);
            if (container) {
              const visibleButtons = container.querySelectorAll(
                'button:not(.hidden), label:not(.hidden)',
              );
              if (visibleButtons.length === 0) {
                container.classList.add('hidden');
                container.classList.remove('flex');
              }
            }
          }
          state.currentHiddenCountLeft--;
        }
      } else {
        state.currentHiddenCountLeft--;
      }
    }

    // --- LADO DERECHO ---
    let isRightOverflowing = state.rightWrapper.scrollWidth > state.rightWrapper.clientWidth + 1;
    while (isRightOverflowing && state.currentHiddenCountRight < state.navHideQueueRight.length) {
      const item = state.navHideQueueRight[state.currentHiddenCountRight];
      const el = document.getElementById(item.id);
      if (el) {
        el.style.display = 'none';
        const mobEl = document.getElementById(item.mobileId);
        if (mobEl) {
          mobEl.classList.remove('hidden');
          if (mobEl.tagName === 'BUTTON' || mobEl.tagName === 'DIV') mobEl.classList.add('flex');
        }
        if (item.container) {
          const container = document.getElementById(item.container);
          if (container) {
            container.classList.remove('hidden');
            container.classList.add('flex');
          }
        }
      }
      state.currentHiddenCountRight++;
      isRightOverflowing = state.rightWrapper.scrollWidth > state.rightWrapper.clientWidth + 1;
    }

    while (!isRightOverflowing && state.currentHiddenCountRight > 0) {
      const item = state.navHideQueueRight[state.currentHiddenCountRight - 1];
      const el = document.getElementById(item.id);
      if (el) {
        el.style.display = 'flex';
        if (state.rightWrapper.scrollWidth > state.rightWrapper.clientWidth + 1) {
          el.style.display = 'none';
          break;
        } else {
          const mobEl = document.getElementById(item.mobileId);
          if (mobEl) {
            mobEl.classList.add('hidden');
            mobEl.classList.remove('flex');
          }
          if (item.container) {
            const container = document.getElementById(item.container);
            if (container) {
              const visibleButtons = container.querySelectorAll('button:not(.hidden)');
              if (visibleButtons.length === 0) {
                container.classList.add('hidden');
                container.classList.remove('flex');
              }
            }
          }
          state.currentHiddenCountRight--;
        }
      } else {
        state.currentHiddenCountRight--;
      }
    }

    // Manejar contenedor de herramientas izquierdas
    const leftMenuWrapper = document.getElementById('overflow-left-menu');
    if (leftMenuWrapper) {
      if (state.currentHiddenCountLeft > 0) {
        leftMenuWrapper.classList.remove('hidden');
        leftMenuWrapper.classList.add('flex');
      } else {
        leftMenuWrapper.classList.add('hidden');
        leftMenuWrapper.classList.remove('flex');
      }
    }

    // Manejar contenedor de herramientas de idioma
    const langMenuWrapper = document.getElementById('overflow-lang-menu');
    if (langMenuWrapper) {
      if (state.currentHiddenCountRight > 0) {
        langMenuWrapper.classList.remove('hidden');
        langMenuWrapper.classList.add('flex');
      } else {
        langMenuWrapper.classList.add('hidden');
        langMenuWrapper.classList.remove('flex');
      }
    }

    updateMenuButtonState();
  };
  state.navResizeObserver = new ResizeObserver(() => requestAnimationFrame(state.adjustNav));
  state.btnChatInspect = document.getElementById('btn-chat-inspect');
  state.btnTrackerMode = document.getElementById('btn-tracker-mode');
  state.isSelectingArea = false;
  state.inspectSelectionBox = document.createElement('div');
  state.btnTutorMode = document.getElementById('btn-tutor-mode');
  state.tutorModeActive = false;
  state.tutorPromises = {};
  state.currentMenuBtn = null;
  state.isChatSoundEnabled = true;
  state.isChatWebEnabled = false;
  state.isChatBriefEnabled = true;
  state.btnToggleChat = document.getElementById('btn-toggle-chat');
  state.btnChatBrief = document.getElementById('btn-chat-brief');
  state.btnChatSound = document.getElementById('btn-chat-sound');
  state.iconChatSound = document.getElementById('icon-chat-sound');
  state.btnChatWeb = document.getElementById('btn-chat-web');
  state.iconChatWeb = document.getElementById('icon-chat-web');
  state.btnChatDictate = document.getElementById('btn-chat-dictate');
  state.chatDictateRecognition = window.SpeechRecognition
    ? new SpeechRecognition()
    : window.webkitSpeechRecognition
      ? new webkitSpeechRecognition()
      : null;
  state.TOOLBAR_HELP_ITEMS = [
    {
      icon: 'play',
      title: 'Reproducir / Pausar',
      desc: 'Reproduce o pausa la lectura en voz alta del documento.',
    },
    {
      icon: 'rewind',
      title: 'Retroceder / Avanzar oración',
      desc: 'Mueve la lectura a la oración anterior o siguiente.',
    },
    {
      icon: 'sparkles',
      title: 'Chat de IA',
      desc: 'Abre un chat lateral para preguntar sobre el documento con inteligencia artificial.',
    },
    {
      icon: 'mic',
      title: 'Micrófono IA',
      desc: 'Permite hablar en voz alta, puedes buscar una página, imagen o sección o preguntar algo sobre el texto en voz alta.',
    },
    {
      icon: 'compass',
      title: 'Brújula',
      desc: 'Navega el documento por voz: pide saltar a una página, sección o figura sin usar las manos.',
    },
    {
      icon: 'radio',
      title: 'Modo Live',
      desc: 'Inicia una conversación de voz continua e interactiva con la inteligencia artificial sobre el documento.',
    },
    {
      icon: 'list',
      title: 'Índice de Capítulos',
      desc: 'Muestra la tabla de contenido para saltar a cualquier sección.',
    },
    {
      icon: 'image',
      title: 'Índice de Figuras',
      desc: 'Muestra la lista de figuras, tablas y gráficos detectados en el documento.',
    },
    {
      icon: 'eye',
      title: 'Omitir lectura de gráficos',
      desc: 'Activa o desactiva la lectura en voz alta de leyendas, pies de figura y texto pequeño.',
    },
    {
      icon: 'book-open',
      title: 'Modo Estudio',
      desc: 'La inteligencia artificial explica cada párrafo de forma pedagógica antes de continuar leyendo.',
    },
    {
      icon: 'settings',
      title: 'Ajustes',
      desc: 'Configura bordes, auto scroll, y si se omiten paréntesis o links al leer.',
    },
    {
      icon: 'languages',
      title: 'Traducir',
      desc: 'Traduce el texto leído al idioma de la voz seleccionada.',
    },
    {
      icon: 'closed-caption',
      title: 'Subtítulos',
      desc: 'Muestra en pantalla el texto que se está leyendo en voz alta.',
    },
    {
      icon: 'earth',
      title: 'Todos los idiomas',
      desc: 'Permite elegir voces de cualquier idioma, no solo español.',
    },
    {
      icon: 'volume-2',
      title: 'Opciones de audio',
      desc: 'Ajusta el tamaño de los subtítulos, la velocidad y la voz de lectura.',
    },
    {
      icon: 'scan',
      title: 'Modo Rastreador',
      desc: 'Permite seleccionar un área o imagen del documento para preguntarle a la inteligencia artificial sobre ella.',
    },
    {
      icon: 'move-horizontal',
      title: 'Ajustar al ancho',
      desc: 'Cambia el zoom para que el documento se ajuste al ancho de la pantalla.',
    },
    {
      icon: 'move-vertical',
      title: 'Ajustar al alto',
      desc: 'Cambia el zoom para que la página completa se ajuste a la altura de la pantalla.',
    },
    { icon: 'zoom-in', title: 'Acercar zoom', desc: 'Aumenta el zoom del documento.' },
    { icon: 'zoom-out', title: 'Alejar zoom', desc: 'Disminuye el zoom del documento.' },
    {
      icon: 'expand',
      title: 'Pantalla completa',
      desc: 'Expande el lector a pantalla completa para una lectura sin distracciones.',
    },
    {
      icon: 'keyboard',
      title: 'Atajos de teclado',
      desc: 'Muestra la lista completa de atajos disponibles.',
    },
    {
      icon: 'picture-in-picture-2',
      title: 'Minimizador',
      desc: 'Minimiza a una ventana flotante y siempre-visible que sigue reproduciendo el audio aunque cambies de pestaña.',
    },
    {
      icon: 'zap',
      title: 'Respuestas breves',
      desc: 'Hace que el chat de IA responda en máximo 50 palabras, directo al grano.',
    },
    {
      icon: 'globe',
      title: 'Búsqueda web',
      desc: 'Permite que el chat de IA complemente sus respuestas con una búsqueda en internet cuando el documento no tenga la información.',
    },
    {
      icon: 'volume-2',
      title: 'Lectura de respuestas en voz alta',
      desc: 'Lee automáticamente en voz alta cada respuesta del chat de IA.',
    },
    {
      icon: 'rotate-ccw',
      title: 'Regenerar respuesta',
      desc: 'Vuelve a generar la respuesta a tu último mensaje, respetando los ajustes actuales del chat.',
    },
    {
      icon: 'trash-2',
      title: 'Borrar historial',
      desc: 'Elimina toda la conversación actual del chat de IA.',
    },
  ];
  state.mobileBtnMapping = {
    'btn-toc-mobile': 'btn-toc',
    'btn-figures-index-mobile': 'btn-figures-index',
    'btn-tutor-mode-mobile': 'btn-tutor-mode',
    'btn-figures-mobile': 'btn-figures',
  };
  state.overflowLeftMenu = document.getElementById('overflow-left-menu');
  state.btnUploadMobile = document.getElementById('btn-upload-mobile');
  state.btnToc = document.getElementById('btn-toc');
  state.btnFiguresIndex = document.getElementById('btn-figures-index');
  state.btnMargins = document.getElementById('btn-margins');
  state.isMarginsActive = true;
  state.savedMargins = { top: 5, bot: 5, left: 3, right: 3 };
  state.topMarginSlider = document.getElementById('top-margin-slider');
  state.botMarginSlider = document.getElementById('bot-margin-slider');
  state.leftMarginSlider = document.getElementById('left-margin-slider');
  state.rightMarginSlider = document.getElementById('right-margin-slider');
  state.topMarginVal = document.getElementById('top-margin-val');
  state.botMarginVal = document.getElementById('bot-margin-val');
  state.leftMarginVal = document.getElementById('left-margin-val');
  state.rightMarginVal = document.getElementById('right-margin-val');
  state.btnApplyMargins = document.getElementById('btn-apply-margins');
  state.marginsToggle = document.getElementById('enable-margins-toggle');
  state.marginContainer = document.getElementById('margin-sliders-container');
  state.subtitleSizeSlider = document.getElementById('subtitle-size-slider');
  state.transcriptionText = document.getElementById('transcription-text');
  state.advancedToggle = document.getElementById('advanced-settings-toggle');
  state.advancedToggleLabel = document.getElementById('advanced-settings-toggle-label');
  state.advancedContent = document.getElementById('advanced-settings-content');
  state.advancedModelInput = document.getElementById('advanced-model-input');
  state.advancedStudyModelInput = document.getElementById('advanced-study-model-input');
  state.advancedLiveModelInput = document.getElementById('advanced-live-model-input');
  state.advancedApiKeyInput = document.getElementById('advanced-apikey-input');
  state.appOpenTime = Date.now();
  state.healthNotificationsEnabled =
    localStorage.getItem('pdfReaderHealthNotifications') !== 'false';
  state.lastHealthReminderHour = 0;
  state.healthReminderModal = document.getElementById('health-reminder-modal');
  state.healthNotificationsToggle = document.getElementById('health-notifications-toggle');
  state.healthNextReminderTxt = document.getElementById('health-next-reminder-txt');
  state.autoTrackSendEnabled = localStorage.getItem('pdfReaderAutoTrackSend') !== 'false';
  state.autoTrackSendToggle = document.getElementById('auto-track-send-toggle');
  state.isTranslatingEnabled = true;
  state.translationPromises = {};
  state.isTranscriptionEnabled = true;
  state.transcriptionBar = document.getElementById('transcription-bar');
  state.transcriptionViewport = document.getElementById('transcription-viewport');
  state.subtitleResizer = document.getElementById('subtitle-resizer');
  state.SUBTITLE_MIN_HEIGHT = 44;
  state.SUBTITLE_MAX_HEIGHT = 260;
  state.SUBTITLE_MIN_FONT = parseInt(state.subtitleSizeSlider.min, 10);
  state.SUBTITLE_MAX_FONT = parseInt(state.subtitleSizeSlider.max, 10);
  state.isResizingSubtitles = false;
  state.subtitleResizeStartY = 0;
  state.subtitleResizeStartHeight = 0;
  state.btnFigures = document.getElementById('btn-figures');
  state.readFiguresActive = true;
  state.synth = window.speechSynthesis;
  state.currentUtterance = null;
  state.aiUtterance = null;
  state.isPlaying = false;
  state.isPaused = false;
  state.consecutiveSpeechErrors = 0;
  state.speechKeepAliveInterval = null;
  state.userSelectedVoiceURI = null;
  state.multiLangEnabled = false;
  state.voiceSearchInput = document.getElementById('voice-search-input');
  state.voiceOptionsList = document.getElementById('voice-options-list');
  state.voiceSelectorText = document.getElementById('voice-selector-text');
  state.voiceSelectorTextMobile = document.getElementById('voice-selector-text-mobile');
  state.rateSliderDesk = document.getElementById('rate-slider');
  state.rateValDesk = document.getElementById('rate-value');
  state.rateSliderMob = document.getElementById('rate-slider-mobile');
  state.rateValMob = document.getElementById('rate-value-mobile');
  state.currentSubtitleWordSpans = [];
  state.SI_UNITS = {
    'km/h': ['kilómetro por hora', 'kilómetros por hora'],
    'm/s': ['metro por segundo', 'metros por segundo'],
    kWh: ['kilovatio hora', 'kilovatios hora'],
    kHz: ['kilohercio', 'kilohercios'],
    MHz: ['megahercio', 'megahercios'],
    GHz: ['gigahercio', 'gigahercios'],
    Hz: ['hercio', 'hercios'],
    km: ['kilómetro', 'kilómetros'],
    cm: ['centímetro', 'centímetros'],
    mm: ['milímetro', 'milímetros'],
    nm: ['nanómetro', 'nanómetros'],
    pm: ['picómetro', 'picómetros'],
    μm: ['micrómetro', 'micrómetros'],
    um: ['micrómetro', 'micrómetros'],
    kg: ['kilogramo', 'kilogramos'],
    mg: ['miligramo', 'miligramos'],
    μg: ['microgramo', 'microgramos'],
    ug: ['microgramo', 'microgramos'],
    mL: ['mililitro', 'mililitros'],
    ml: ['mililitro', 'mililitros'],
    L: ['litro', 'litros'],
    ms: ['milisegundo', 'milisegundos'],
    ns: ['nanosegundo', 'nanosegundos'],
    min: ['minuto', 'minutos'],
    kJ: ['kilojulio', 'kilojulios'],
    kPa: ['kilopascal', 'kilopascales'],
    MPa: ['megapascal', 'megapascales'],
    kcal: ['kilocaloría', 'kilocalorías'],
    cal: ['caloría', 'calorías'],
    kV: ['kilovoltio', 'kilovoltios'],
    mV: ['milivoltio', 'milivoltios'],
    mA: ['miliamperio', 'miliamperios'],
    kW: ['kilovatio', 'kilovatios'],
    MW: ['megavatio', 'megavatios'],
    '°C': ['grado Celsius', 'grados Celsius'],
    '°F': ['grado Fahrenheit', 'grados Fahrenheit'],
    m: ['metro', 'metros'],
    g: ['gramo', 'gramos'],
    s: ['segundo', 'segundos'],
    h: ['hora', 'horas'],
    K: ['kelvin', 'kelvin'],
    A: ['amperio', 'amperios'],
    V: ['voltio', 'voltios'],
    W: ['vatio', 'vatios'],
    N: ['newton', 'newtons'],
    J: ['julio', 'julios'],
    Pa: ['pascal', 'pascales'],
    mol: ['mol', 'moles'],
    Ω: ['ohmio', 'ohmios'],
    dB: ['decibelio', 'decibelios'],
    rpm: ['revolución por minuto', 'revoluciones por minuto'],
    '%': ['por ciento', 'por ciento'],
  };
  state.SI_UNIT_KEYS = Object.keys(state.SI_UNITS).sort((a, b) => b.length - a.length);
  state.SI_UNIT_REGEX = new RegExp(
    `(\\d+(?:[.,]\\d+)?)([ \\u00A0]?)(${state.SI_UNIT_KEYS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![a-zA-Z0-9])`,
    'g',
  );
  state.GREEK_LETTERS = {
    α: 'alfa',
    Α: 'alfa',
    β: 'beta',
    Β: 'beta',
    γ: 'gamma',
    Γ: 'gamma',
    δ: 'delta',
    Δ: 'delta',
    ε: 'épsilon',
    Ε: 'épsilon',
    ζ: 'zeta',
    Ζ: 'zeta',
    η: 'eta',
    Η: 'eta',
    θ: 'theta',
    Θ: 'theta',
    ϑ: 'theta',
    ι: 'iota',
    Ι: 'iota',
    κ: 'kappa',
    Κ: 'kappa',
    λ: 'lambda',
    Λ: 'lambda',
    μ: 'mu',
    Μ: 'mu',
    ν: 'nu',
    Ν: 'nu',
    ξ: 'xi',
    Ξ: 'xi',
    ο: 'ómicron',
    Ο: 'ómicron',
    π: 'pi',
    Π: 'pi',
    ϖ: 'pi',
    ρ: 'rho',
    Ρ: 'rho',
    ϱ: 'rho',
    σ: 'sigma',
    Σ: 'sigma',
    ς: 'sigma',
    τ: 'tau',
    Τ: 'tau',
    υ: 'ípsilon',
    Υ: 'ípsilon',
    φ: 'fi',
    Φ: 'fi',
    ϕ: 'fi',
    χ: 'ji',
    Χ: 'ji',
    ψ: 'psi',
    Ψ: 'psi',
    ω: 'omega',
    Ω: 'omega',
  };
  state.pageInput = document.getElementById('page-input');
  state.topbarPageIndicator = document.getElementById('topbar-page-indicator');
  state.topbarPageInput = document.getElementById('topbar-page-input');
  state.topbarPageTotal = document.getElementById('topbar-page-total');
  state.pageTotal = document.getElementById('page-total');
  state.pageInputMobile = document.getElementById('page-input-mobile');
  state.pageTotalMobile = document.getElementById('page-total-mobile');
  state.horizScroll = document.getElementById('horizontal-scroll');
  state.scrollTooltip = document.getElementById('scroll-tooltip');
  state.dynamicIndexToggle = document.getElementById('dynamic-index-toggle');
  state.customScrollbarTrack = document.getElementById('custom-scrollbar-track');
  state.customScrollbarThumb = document.getElementById('custom-scrollbar-thumb');
  state.scrollbarPageTooltip = document.getElementById('scrollbar-page-tooltip');
  state.isDraggingScrollbar = false;
  state.pageViewObserver = new IntersectionObserver(
    (entries) => {
      if (state.preventScrollObserver) return;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          const pNum = parseInt(entry.target.getAttribute('data-page-num'));
          state.pageInput.value = pNum;
          state.pageInputMobile.value = pNum;
          if (document.activeElement !== state.topbarPageInput) state.topbarPageInput.value = pNum;
          updateCustomScrollbarThumb();
          // No forzamos horizScroll.value aquí para no interrumpir el scroll continuo
        }
      });
    },
    { root: state.mainScroll, threshold: 0.4 },
  );
  state.isExtractingText = false;
  state.pageState = {};
  state.MAX_CANVAS_PIXELS = 5000000;
  state.lazyRenderObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const pageNum = parseInt(entry.target.getAttribute('data-page-num'));
        const st = state.pageState[pageNum];
        if (entry.isIntersecting) {
          if (st) st.visible = true;
          if (entry.target.getAttribute('data-rendered') === 'false') {
            if (state.documentObj.isDocx) {
              buildDocxTextLayerAndSentences(state.documentObj.docxHtml, entry.target, pageNum);
            } else {
              renderSinglePageCanvasAndText(pageNum, entry.target);
            }
          } else if (
            !state.documentObj.isDocx &&
            st &&
            (!st.canvas || st.renderedScale !== state.currentScale)
          ) {
            // Ya tiene texto/oraciones construidos: solo falta (re)dibujar el canvas a la
            // escala actual (por ejemplo, si se liberó por memoria o cambió el zoom mientras
            // esta página estaba fuera de vista).
            refreshPageCanvas(pageNum, entry.target);
          }
        } else {
          if (st) st.visible = false;
          if (!state.documentObj.isDocx && st && st.canvas) {
            // Libera el mapa de bits para no acumular memoria en documentos largos;
            // el texto y las oraciones permanecen intactos (no afecta la lectura en voz alta
            // ni la selección, que viven en la capa de texto, no en el canvas).
            releaseCanvas(st.canvas);
            st.canvas = null;
            st.renderedScale = 0;
          }
        }
      });
    },
    { root: state.mainScroll, rootMargin: '400px 0px' },
  );
  state.farUnloadObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) return; // sigue dentro del margen amplio: no tocar
        const pageNum = parseInt(entry.target.getAttribute('data-page-num'));
        unloadPageContent(pageNum, entry.target);
      });
    },
    { root: state.mainScroll, rootMargin: '3000px 0px' },
  );
  state.MIN_SCALE = 0.25;
  state.MAX_SCALE = 5;
  state.pendingScale = state.currentScale;
  state.zoomCommitTimer = null;
  state.pdfToolbar = document.getElementById('pdf-toolbar');
  state.topbarZoomPct = document.getElementById('topbar-zoom-pct');
  state.topbarProgress = document.getElementById('topbar-progress');
  state.topbarBtnClock = document.getElementById('topbar-btn-clock');
  state.docSessionStartTime = null;
  state.progressTooltipEl = document.getElementById('progress-tooltip');
  state.progressTooltipStartEl = document.getElementById('progress-tooltip-start');
  state.progressTooltipRemainingEl = document.getElementById('progress-tooltip-remaining');
  state.syncTopBarRAF = null;
  state.pipWindow = null;
  state.pipEls = null;
  state.btnFloatingPlayer = document.getElementById('btn-floating-player');
  state.handleFileUpload = function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const isPDF = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isDocx =
      file.name.toLowerCase().endsWith('.docx') || file.type.includes('wordprocessingml');

    if (isPDF) {
      const fileReader = new FileReader();
      fileReader.onload = function () {
        state.emptyState.classList.add('hidden');
        state.docContainer.classList.remove('hidden');
        pdfjsLib
          .getDocument({
            data: new Uint8Array(this.result),
            // Empaquetados en public/pdfjs/ (copiados desde pdfjs-dist en tiempo de build).
            // Sin esto, pdf.js no puede dibujar el texto de documentos que usan las 14 fuentes
            // estándar (Helvetica, Times, etc.) sin incrustarlas, ni los que usan cMaps CJK.
            standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
            cMapUrl: `${import.meta.env.BASE_URL}pdfjs/cmaps/`,
            cMapPacked: true,
          })
          .promise.then((pdf) => {
            state.documentObj = pdf;
            state.documentObj.isDocx = false;
            renderAllPages(1);
            state.docSessionStartTime = Date.now();
            showTopToolbar();
            autoFullscreenOnMobileUpload();
          })
          .catch((err) => {
            console.error('[Karai] Error cargando el PDF:', err);
            alert('Error cargando el PDF.' + (err && err.message ? ' (' + err.message + ')' : ''));
          });
      };
      fileReader.readAsArrayBuffer(file);
    } else if (isDocx) {
      const fileReader = new FileReader();
      fileReader.onload = function (event) {
        state.emptyState.classList.add('hidden');
        state.docContainer.classList.remove('hidden');
        mammoth
          .convertToHtml({ arrayBuffer: event.target.result })
          .then(function (result) {
            const html = result.value;
            if (!html.trim()) {
              alert('El documento DOCX está vacío.');
              return;
            }
            state.documentObj = { numPages: 1, isDocx: true, docxHtml: html };
            renderAllPages(1);
            state.docSessionStartTime = Date.now();
            showTopToolbar();
            autoFullscreenOnMobileUpload();
          })
          .catch((err) => {
            console.error('[Karai] Error procesando el documento de Word:', err);
            alert(
              'Error procesando el documento de Word.' +
                (err && err.message ? ' (' + err.message + ')' : ''),
            );
          });
      };
      fileReader.readAsArrayBuffer(file);
    } else {
      alert('Por favor sube un archivo .PDF o .DOCX válido.');
    }
  };
  state.isVisible = (el) => el && !el.classList.contains('hidden');
  state.SHORTCUT_HINTS = [
    { id: 'btn-toggle-chat', key: 'H' },
    { id: 'btn-mic', key: 'M' },
    { id: 'btn-compass', key: 'N' },
    { id: 'btn-live-launch', key: 'K' },
    { id: 'btn-upload-label', key: 'D' },
    { id: 'btn-tutor-mode', key: 'E' },
    { id: 'btn-figures', key: 'G' },
    { id: 'btn-figures-index', key: 'F' },
    { id: 'btn-toc', key: 'C' },
    { id: 'btn-margins', key: 'A' },
    { id: 'btn-prev-sentence', key: '←', big: true },
    { id: 'btn-play-pause', key: () => t('txt_024') },
    { id: 'btn-next-sentence', key: '→', big: true },
    { id: 'rate-slider-container', key: '↑↓' },
    { id: 'btn-mobile-lang-menu', key: 'O' },
    { id: 'btn-subtitles-wrapper', key: 'U' },
    { id: 'btn-translate-wrapper', key: 'T' },
    { id: 'btn-multilang-wrapper', key: 'W' },
  ];
  state.shortcutsBarTimer = null;
  state.chatHistory = document.getElementById('chat-history');
  state.aiInput = document.getElementById('ai-input');
  state.aiSubmit = document.getElementById('ai-submit');
  state.imgPreviewContainer = document.getElementById('img-preview-container');
  state.imgPreviewImg = document.getElementById('img-preview-img');
  state.currentPlayingMsgBtn = null;
  state.autoVoiceQueueCount = 0;
  state.autoVoiceMsgBtn = null;
  state.liveFunctionDeclaration = {
    name: 'buscar_en_documento',
    description:
      'Busca y devuelve fragmentos exactos del documento PDF/DOCX cargado relacionados con una consulta. Úsala cuando necesites datos precisos o el contexto inicial no sea suficiente.',
    parameters: {
      type: 'object',
      properties: {
        consulta: {
          type: 'string',
          description: 'Palabras clave o pregunta para buscar en el documento',
        },
      },
      required: ['consulta'],
    },
  };
  state.liveVoiceSelect = document.getElementById('live-voice-select');
  state.GEMINI_LIVE_VOICES = [
    'Aoede',
    'Kore',
    'Leda',
    'Puck',
    'Charon',
    'Zephyr',
    'Autonoe',
    'Umbriel',
    'Erinome',
    'Schedar',
    'Achird',
    'Sadachbia',
    'Fenrir',
    'Enceladus',
    'Algieba',
    'Algenib',
    'Achernar',
    'Gacrux',
    'Zubenelgenubi',
    'Sadaltager',
    'Callirrhoe',
    'Iapetus',
    'Despina',
    'Rasalgethi',
    'Alnilam',
  ];
  state.userSelectedLiveVoice = 'Kore';
  state.btnMic = document.getElementById('btn-mic');
  state.voiceAssistantRecognition = window.SpeechRecognition
    ? new SpeechRecognition()
    : window.webkitSpeechRecognition
      ? new webkitSpeechRecognition()
      : null;
  state.voiceTranscriptBuffer = '';
  state.navRecognition = window.SpeechRecognition
    ? new SpeechRecognition()
    : window.webkitSpeechRecognition
      ? new webkitSpeechRecognition()
      : null;
  state.pinchStartDistance = 0;
  state.pinchStartScale = 1;
  state.isPinching = false;
  state.pinchLastMidX = 0;
  state.pinchLastMidY = 0;
}
