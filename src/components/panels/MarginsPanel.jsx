export default function MarginsPanel() {
  return (
    <div id="margins-panel" className="hidden fixed bg-white p-4 border rounded-lg shadow-2xl w-80 max-w-[90vw] max-h-[85vh] overflow-y-auto z-[1000] cursor-default flex-col" onClick={(e) => e.stopPropagation()}>
        
        <h4 className="text-sm font-medium text-gray-700 mb-4 border-b pb-2 flex items-center gap-2"><i data-lucide="settings" className="w-4 h-4"></i> <span data-i18n="txt_010">Ajustes</span></h4>
        
        <div className="flex flex-col gap-3 mb-2 bg-gray-50 p-3 rounded border">
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="autoscroll-toggle" className="w-4 h-4 accent-[#7C3AED]" defaultChecked /> <span data-i18n="autoscroll_toggle_txt">Habilitar auto-Scroll (S)</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="dynamic-index-toggle" className="w-4 h-4 accent-[#7C3AED]" defaultChecked /> <span data-i18n="dynamic_index_toggle_txt">Activar índice dinámico (I)</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="skip-parens-toggle" className="w-4 h-4 accent-[#7C3AED]" defaultChecked /> <span data-i18n="skip_parens_toggle_txt">Omitir texto entre paréntesis (P)</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="skip-links-toggle" className="w-4 h-4 accent-[#7C3AED]" defaultChecked /> <span data-i18n="skip_links_toggle_txt">Omitir lectura de Links (L)</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="enable-margins-toggle" className="w-4 h-4 accent-[#7C3AED]" defaultChecked /> <span data-i18n="enable_margins_toggle_txt">Omitir lectura sobre los Bordes (B)</span>
            </label>

             <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-2" id="margin-sliders-container">
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans"><span data-i18n="txt_011">Encabezado:</span> <span id="top-margin-val" className="text-[#7C3AED] font-bold">5%</span></label>
                    <input type="range" id="top-margin-slider" min="0" max="30" defaultValue="5" className="w-full mb-2 accent-[#7C3AED] cursor-pointer" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans"><span data-i18n="txt_012">Pie de página:</span> <span id="bot-margin-val" className="text-[#7C3AED] font-bold">5%</span></label>
                    <input type="range" id="bot-margin-slider" min="0" max="30" defaultValue="5" className="w-full mb-2 accent-[#7C3AED] cursor-pointer" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans"><span data-i18n="txt_013">Borde izquierdo:</span> <span id="left-margin-val" className="text-[#7C3AED] font-bold">3%</span></label>
                    <input type="range" id="left-margin-slider" min="0" max="30" defaultValue="3" className="w-full mb-2 accent-[#7C3AED] cursor-pointer" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans"><span data-i18n="txt_014">Borde derecho:</span> <span id="right-margin-val" className="text-[#7C3AED] font-bold">3%</span></label>
                    <input type="range" id="right-margin-slider" min="0" max="30" defaultValue="3" className="w-full mb-2 accent-[#7C3AED] cursor-pointer" />
                </div>
            </div>
        </div>

        {/* Herramientas agrupadas reubicadas en la parte inferior de la caja, se muestran al encoger la pantalla */}
        <div id="overflow-left-menu" className="hidden flex-wrap gap-2 mt-2 pt-3 mb-2 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 justify-center shadow-sm">
            <button id="btn-figures-mobile" className="hidden p-2 text-gray-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-full transition items-center justify-center w-10 h-10" title="Omitir lectura de gráficos" data-i18n-title="btn_figures_mobile_title"><i data-lucide="eye" className="w-5 h-5"></i></button>
            <button id="btn-figures-index-mobile" className="hidden p-2 text-gray-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-full transition items-center justify-center w-10 h-10" title="Índice de Figuras" data-i18n-title="btn_figures_index_mobile_title"><i data-lucide="image" className="w-5 h-5"></i></button>
            <button id="btn-toc-mobile" className="hidden p-2 text-gray-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-full transition items-center justify-center w-10 h-10" title="Índice de Capítulos" data-i18n-title="btn_toc_mobile_title"><i data-lucide="list" className="w-5 h-5"></i></button>
            <button id="btn-tutor-mode-mobile" className="hidden p-2 text-gray-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-full transition items-center justify-center w-10 h-10" title="Modo Estudio" data-i18n-title="btn_tutor_mode_mobile_title"><i data-lucide="book-open" className="w-5 h-5"></i></button>
            <label id="btn-upload-mobile" className="hidden cursor-pointer p-2 text-gray-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 rounded-full transition items-center justify-center w-10 h-10" title="Cargar Documento" data-i18n-title="btn_upload_mobile_title">
                <i data-lucide="upload" className="w-5 h-5"></i>
            </label>
        </div>

        {/* AJUSTES AVANZADOS */}
        <div className="mt-3 pt-3 border-t">
            <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition">
                <input type="checkbox" id="advanced-settings-toggle" className="w-4 h-4 accent-[#7C3AED]" /> <span id="advanced-settings-toggle-label" data-i18n="advanced_settings_toggle_txt">Mostrar ajustes avanzados</span>
            </label>
            <div id="advanced-settings-content" className="hidden flex-col gap-3 mt-3 bg-gray-50 p-3 rounded border">
                {/* IDIOMA DE INTERFAZ: cambia SOLO la interfaz (menús, botones, opciones); no afecta
                     el idioma de lectura/voz, que se sigue eligiendo con el selector de voz normal. */}
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold" data-i18n="adv_interface_lang_label">Idioma de interfaz</label>
                    <select id="interface-lang-select" className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED] bg-white"></select>
                </div>

                {/* NOTIFICACIONES DE SALUD: recordatorio cada hora desde que se abrió el programa */}
                <label className="flex items-center gap-3 text-xs text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition pt-1">
                    <input type="checkbox" id="health-notifications-toggle" className="w-4 h-4 accent-[#7C3AED]" /> <span data-i18n="health_toggle_txt">Activar notificaciones de salud</span>
                </label>
                <p id="health-next-reminder-txt" className="hidden text-[11px] text-gray-500 pl-7 -mt-2"></p>

                {/* MODO RASTREADOR: por defecto, al seleccionar un área del documento se envía el
                     mensaje automáticamente. Esta casilla permite desactivar ese envío automático
                     para poder escribir una pregunta propia antes de enviar. */}
                <label className="flex items-center gap-3 text-xs text-gray-700 cursor-pointer font-sans hover:text-[#7C3AED] transition pt-1">
                    <input type="checkbox" id="auto-track-send-toggle" className="w-4 h-4 accent-[#7C3AED]" /> <span data-i18n="auto_track_toggle_txt">Rastreo automático (enviar al seleccionar)</span>
                </label>

                {/* MODELOS, CLAVE DE API Y ERRORES: al final de la lista. Son en total 3 modelos
                     de Gemini distintos usados por la app (chat/brújula, traducción/modo estudio,
                     y conversación en vivo), cada uno con su propia opción de reemplazo. */}
                <div className="pt-3 border-t">
                    <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold"><span data-i18n="txt_015">Modelo de IA (chat, brújula, consultas)</span></label>
                    <input type="text" id="advanced-model-input" className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]" placeholder="gemini-2.5-flash-lite" data-i18n-placeholder="advanced_model_input_ph" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold"><span data-i18n="adv_study_model_label">Modelo de IA (traducción y Modo Estudio)</span></label>
                    <input type="text" id="advanced-study-model-input" className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]" placeholder="gemini-3.1-flash-lite" data-i18n-placeholder="advanced_study_model_input_ph" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold"><span data-i18n="adv_live_model_label">Modelo de IA (conversación en vivo)</span></label>
                    <input type="text" id="advanced-live-model-input" className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]" placeholder="gemini-3.1-flash-live-preview" data-i18n-placeholder="advanced_live_model_input_ph" />
                </div>
                <div>
                    <label className="block text-xs text-gray-600 mb-1 font-sans font-semibold"><span data-i18n="txt_016">Clave de API (Gemini)</span></label>
                    <input type="password" id="advanced-apikey-input" className="w-full text-sm border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#7C3AED]" placeholder="Pega tu API key" data-i18n-placeholder="advanced_apikey_input_ph" />
                </div>
                <button id="btn-save-advanced-settings" className="w-full bg-gray-800 text-white text-xs py-2 rounded-md hover:bg-gray-900 transition font-semibold"><span data-i18n="btn_save_advanced_settings_txt">Guardar modelo y clave</span></button>
                <button id="btn-open-api-errors" className="w-full flex items-center justify-center gap-1.5 border border-gray-300 text-gray-700 text-xs py-2 rounded-md hover:bg-gray-100 transition font-semibold">
                    <i data-lucide="activity" className="w-3.5 h-3.5"></i> <span data-i18n="txt_017">Errores de API / consumo</span>
                </button>
            </div>
        </div>
    </div>
  );
}
