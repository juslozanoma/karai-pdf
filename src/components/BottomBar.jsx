export default function BottomBar() {
  return (
    <div id="bottom-bar" className="w-full shrink-0 relative z-[600] bg-white border-t shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex flex-col">
        
        {/* SUBTITULOS */}
        <div id="transcription-bar" className="hidden relative w-full bg-[#eae9fd] text-black border-b border-[#eae9fd] pl-11 pr-5 z-40 min-h-[44px] items-center justify-center shadow-sm transition-all duration-300">
            <div id="subtitle-resizer" className="absolute top-0 left-0 right-0 h-2 cursor-row-resize hover:bg-[#C4B5FD] active:bg-[#A78BFA] transition-colors z-50" title="Arrastra para cambiar el tamaño" data-i18n-title="subtitle_resizer_title"></div>
            <button id="btn-close-subtitles" className="absolute top-2 right-2 z-[60] text-gray-600 hover:text-gray-800 hover:bg-black/10 rounded-full p-1 transition" title="Cerrar subtítulos" data-i18n-title="btn_close_subtitles_title">
                <i data-lucide="x" className="w-5 h-5"></i>
            </button>
            <button id="btn-subtitles-open-options" className="absolute top-9 right-2 z-[60] text-gray-600 hover:text-gray-800 hover:bg-black/10 rounded-full p-1 transition" title="Opciones de audio" data-i18n-title="btn_subtitles_open_options_title">
                <i data-lucide="settings" className="w-5 h-5"></i>
            </button>
            <div id="transcription-viewport" className="subtitle-miniscroll w-full text-center overflow-y-auto overflow-x-hidden py-4">
            <span id="transcription-text" className="mx-auto drop-shadow-sm transition-all inline-block break-words whitespace-normal align-middle" style={{fontFamily: '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif', fontSize: '19px', fontWeight: '400', letterSpacing: '-0.01em', lineHeight: '1.35', width: '80%'}}></span>
            </div>
        </div>
        <div className="w-full h-4 bg-gray-200 relative flex items-center group shrink-0 overflow-visible">

            <input type="range" id="horizontal-scroll" min="1" max="1" defaultValue="1" step="0.01" className="absolute inset-0 cursor-pointer w-full opacity-100 m-0 z-10" />

            <div id="dynamic-index-markers" className="absolute inset-0 pointer-events-none z-[200] w-full h-full"></div>
            <div id="scroll-tooltip" className="hidden absolute top-[-22px] bg-[#7C3AED] text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm transform -translate-x-1/2 pointer-events-none z-[400]">1</div>
        </div>
    
        {/* CONTENEDOR FLEX PRINCIPAL: Izquierda estática, Centro adaptable, Derecha estática */}
        <nav className="flex items-center justify-between px-1 md:px-3 py-3 w-full overflow-hidden shrink-0 relative">
    
            {/* IZQUIERDA (Fija - Chat y Micrófono) */}
            <div className="flex items-center gap-0.2 shrink-0 z-0">
                <button id="btn-toggle-chat" className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-100 rounded-full transition" title="Abrir Chat de IA (H)" data-i18n-title="btn_toggle_chat_title"><i data-lucide="sparkles" className="w-5 h-5 md:w-5 md:h-5"></i></button>
                <button id="btn-mic" className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-50 rounded-full transition" title="Micrófono IA (M)" data-i18n-title="btn_mic_title"><i data-lucide="mic" className="w-5 h-5 md:w-5 md:h-5"></i></button>
                <button id="btn-floating-player" className="hidden p-2 text-gray-600 hover:text-[#7C3AED] hover:bg-[#F8F7FF] rounded-full transition" title="Minimizar a ventana flotante" data-i18n-title="btn_floating_player_title"><i data-lucide="picture-in-picture-2" className="w-5 h-5 md:w-5 md:h-5"></i></button>
            </div>
    
            {/* CENTRO (Flex con wrappers que empujan el Play al centro y permiten ocultamiento progresivo) */}
                <div id="nav-center-container" className="flex-1 flex items-center overflow-hidden mx-2">
                    
                    {/* WRAPPER IZQUIERDO: Flex-1 empuja desde la izquierda, justify-end pega los botones al Play */}
                    <div id="nav-tools-left-wrapper" className="flex-1 flex justify-end overflow-hidden min-w-0">
                        <div className="flex items-center gap-1 shrink-0" id="nav-tools-left">
                            <button id="btn-toc" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Índice de Capítulos (C)" data-i18n-title="btn_toc_title"><i data-lucide="list" className="w-5 h-5"></i></button>
                            <button id="btn-figures-index" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Índice de Figuras (F)" data-i18n-title="btn_figures_index_title"><i data-lucide="image" className="w-5 h-5"></i></button>
                            <button id="btn-figures" className="p-2 text-gray-400 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Omitir lectura de gráficos (G)" data-i18n-title="btn_figures_title"><i data-lucide="eye" className="w-5 h-5"></i></button>
                            <button id="btn-tutor-mode" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Modo Estudio (E)" data-i18n-title="btn_tutor_mode_title"><i data-lucide="book-open" className="w-5 h-5"></i></button>
                            <label id="btn-upload-label" className="hidden cursor-pointer p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 items-center justify-center w-10 h-10" title="Cargar Documento (D)" data-i18n-title="btn_upload_label_title">
                                <i data-lucide="upload" className="w-5 h-5"></i><input type="file" id="doc-upload" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
                            </label>
                            <button id="btn-margins" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10 relative z-10" title="Ajustes (A)" data-i18n-title="btn_margins_title"><i data-lucide="settings" className="w-5 h-5"></i></button>
                        </div>
                    </div>
    
                    {/* NÚCLEO DE REPRODUCCIÓN (Siempre Visible y Perfectamente Centrado) */}
                    <div className="flex items-center justify-center gap-1.5 shrink-0 px-2" id="nav-core-playback">
                        <button id="btn-prev-sentence" className="bg-white text-indigo-600 hover:bg-indigo-100 rounded-full transition shadow-sm flex items-center justify-center w-11 h-11" title="Retroceder oración (←)" data-i18n-title="btn_prev_sentence_title">
                            <i data-lucide="rewind" className="w-5 h-5"></i>
                        </button>
                        <button id="btn-play-pause" className="bg-indigo-100 text-indigo-600 hover:bg-indigo-200 rounded-full transition flex items-center justify-center w-12 h-12 md:w-12 md:h-12" title="Reproducir / Pausar (Espacio)" disabled data-i18n-title="btn_play_pause_title">
                            <span id="play-wrapper"><i data-lucide="play" className="w-5 h-5 md:w-6 md:h-6 fill-current ml-1"></i></span>
                            <span id="pause-wrapper" className="hidden"><i data-lucide="pause" className="w-5 h-5 md:w-6 md:h-6 fill-current"></i></span>
                        </button>
                        <button id="btn-next-sentence" className="bg-white text-indigo-600 hover:bg-indigo-100 rounded-full transition shadow-sm flex items-center justify-center w-11 h-11" title="Avanzar oración (→)" data-i18n-title="btn_next_sentence_title">
                            <i data-lucide="fast-forward" className="w-5 h-5"></i>
                        </button>
                    </div>
    
                    {/* WRAPPER DERECHO: Flex-1 empuja desde la derecha, justify-start pega los botones al Play */}
                    <div id="nav-tools-right-wrapper" className="flex-1 flex justify-start overflow-hidden min-w-0">
                        <div className="flex items-center gap-1 shrink-0" id="nav-tools-right">
                            <button id="btn-mobile-lang-menu" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10 relative z-20" title="Opciones de audio (O)" data-i18n-title="btn_mobile_lang_menu_title">
                                <i data-lucide="sliders-horizontal" className="w-5 h-5"></i>
                            </button>
                            <button id="btn-subtitles-wrapper" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Activar Subtítulos (U)" data-i18n-title="btn_subtitles_wrapper_title">
                                <i data-lucide="closed-caption" className="w-5 h-5"></i>
                            </button>
                            <button id="btn-translate-wrapper" className="p-2 bg-[#F1EEFF] text-[#7C3AED] hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Traducir (T)" data-i18n-title="btn_translate_wrapper_title">
                                <i data-lucide="languages" className="w-5 h-5"></i></button>
                            <button id="btn-multilang-wrapper" className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition shrink-0 flex items-center justify-center w-10 h-10" title="Activar Multilingüe (W)" data-i18n-title="btn_multilang_wrapper_title"><i data-lucide="earth" className="w-5 h-5"></i></button>
                            <div id="rate-slider-container" className="flex items-center gap-1 shrink-0 text-gray-600 px-2 py-1.5 rounded-full border border-transparent">
                                <input type="range" id="rate-slider" min="0.5" max="3" step="0.1" defaultValue="1" className="w-20 accent-indigo-600" title="Velocidad (↑/↓)" data-i18n-title="rate_slider_title" />
                                <span id="rate-value" className="text-xs font-mono w-6 text-right font-medium"><span data-i18n="rate_value_txt">1x</span></span>
                            </div>
                            <button id="voice-selector-wrapper" className="text-sm rounded-full shadow-sm bg-white p-1.5 border border-gray-300 w-[200px] justify-between items-center hover:bg-gray-50 transition shrink-0 flex" title="Seleccionar voz (V)" data-i18n-title="voice_selector_wrapper_title">
                                <span id="voice-selector-text" className="truncate font-medium text-gray-700 pl-2"><span data-i18n="voice_selector_text_txt">Cargando...</span></span>
                                <i data-lucide="chevron-down" className="w-4 h-4 text-gray-400 shrink-0 pr-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
    
            {/* DERECHA (Fija) */}
            <div id="page-display-wrapper" className="hidden items-center shrink-0 pr-2 md:pr-0">
                <div className="flex items-center gap-0.5 text-xs font-medium text-gray-600 bg-gray-50 py-1 md:py-1 rounded border shadow-sm">
                    <input type="number" id="page-input" min="1" defaultValue="1" className="w-7 min-w-[30px] text-center bg-transparent outline-none shrink-0" />
                    <span>/</span>
                    <span id="page-total" className="w-7 text-center inline-block">0</span>
                </div>
            </div>

            {/* LIVE (Fijo al extremo derecho) */}
            <div className="flex items-center shrink-0 z-0">
                <button id="btn-tracker-mode" className="p-2 text-gray-400 hover:text-[#7C3AED] hover:bg-[#F8F7FF] rounded-full transition" title="Modo Rastreador (seleccionar área del documento)"><i data-lucide="scan-search" className="w-5 h-5 md:w-5 md:h-5"></i></button>
                <button id="btn-compass" className="p-2 text-gray-600 hover:text-[#7C3AED] hover:bg-[#F8F7FF] rounded-full transition" title="Navegar por voz (N)" data-i18n-title="btn_compass_title"><i data-lucide="compass" className="w-5 h-5 md:w-5 md:h-5"></i></button>
                <button id="btn-live-launch" className="p-2 text-gray-600 hover:text-[#7C3AED] hover:bg-[#F8F7FF] rounded-full transition" title="Conversación en vivo" data-i18n-title="btn_live_launch_title"><i data-lucide="radio" className="w-5 h-5 md:w-5 md:h-5"></i></button>
            </div>

        </nav>
    </div>
  );
}
