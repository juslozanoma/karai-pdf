export default function MobileLangPanel() {
  return (
    <div id="mobile-lang-panel" className="hidden fixed bg-white p-4 border rounded-lg shadow-2xl w-auto max-w-[300px] z-[1000] cursor-default" onClick={(e) => e.stopPropagation()}>
        <h4 className="text-sm font-medium text-gray-700 mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="sliders-horizontal" className="w-4 h-4"></i> <span data-i18n="txt_006">Opciones de audio</span></h4>
        
        <div className="flex flex-col gap-3">
            <div className="border-b pb-3 mb-1">
                <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold"><span data-i18n="txt_007">Tamaño Subtítulos:</span> <span id="subtitle-size-val" className="text-[#7C3AED] font-bold"><span data-i18n="subtitle_size_val_txt">18px</span></span></label>
                <input type="range" id="subtitle-size-slider" min="14" max="36" defaultValue="18" className="w-full mb-2 accent-[#7C3AED] cursor-pointer" />
            </div>

            <div className="hidden" id="rate-slider-mobile-wrapper">
                <label className="block text-xs text-gray-500 mb-1"><span data-i18n="txt_008">Velocidad:</span> <span id="rate-value-mobile" className="font-bold text-[#7C3AED]"><span data-i18n="rate_value_mobile_txt">1x</span></span></label>
                <input type="range" id="rate-slider-mobile" min="0.5" max="3" step="0.1" defaultValue="1" className="w-full accent-[#7C3AED]" />
            </div>

            <div className="hidden" id="voice-selector-btn-mobile-wrapper">
                <label className="block text-xs text-gray-500 mb-1"><span data-i18n="txt_009">Voz de lectura:</span></label>
                <button id="voice-selector-btn-mobile" className="max-w-[200px] text-xs border border-gray-300 rounded-md bg-white p-2 flex justify-between items-center hover:bg-gray-50 transition">
                    <span id="voice-selector-text-mobile" className="truncate font-medium"><span data-i18n="voice_selector_text_mobile_txt">Seleccionar voz...</span></span>
                    <i data-lucide="chevron-down" className="w-3 h-3 text-gray-400 shrink-0"></i>
                </button>
            </div>
        </div>

        {/* Botones reubicados en la parte inferior del panel (mismo estilo que la barra inferior) */}
        <div id="overflow-lang-menu" className="hidden flex-wrap gap-2 px-3 mt-2 pt-3 mb-2 bg-[#F8F7FF]/50 rounded-lg border border-[#F1EEFF] justify-start shadow-sm">
            <button id="btn-translate-mobile" className="hidden p-2 bg-[#F1EEFF] text-[#7C3AED] rounded-full transition items-center justify-center w-10 h-10" title="Traducir" data-i18n-title="btn_translate_mobile_title">
                <i data-lucide="languages" className="w-5 h-5"></i>
            </button>

            <button id="btn-subtitles-mobile" className="hidden p-2 text-gray-400 bg-transparent hover:bg-[#F8F7FF] hover:text-[#7C3AED] rounded-full transition items-center justify-center w-10 h-10" title="Subtítulos" data-i18n-title="btn_subtitles_mobile_title">
                <i data-lucide="closed-caption" className="w-5 h-5"></i>
            </button>

            <button id="btn-multilang-mobile" className="hidden p-2 text-gray-400 bg-transparent hover:bg-[#F8F7FF] hover:text-[#7C3AED] rounded-full transition items-center justify-center w-10 h-10" title="Todos los idiomas" data-i18n-title="btn_multilang_mobile_title">
                <i data-lucide="earth" className="w-5 h-5"></i>
            </button>
            <div id="page-display-mobile" className="hidden w-full flex justify-start pl-3">
                <div className="flex items-center gap-0.5 text-xs font-medium text-gray-600 bg-gray-50 py-1 md:py-1 rounded border shadow-sm">
                    <input type="number" id="page-input-mobile" min="1" defaultValue="1" className="w-7 text-center bg-transparent outline-none" />
                    <span>/</span>
                    <span id="page-total-mobile" className="w-7 text-center inline-block">0</span>
                </div>
            </div>
        </div>
    </div>
  );
}
