export default function ChatPanel() {
  return (
    <aside id="chat-panel" className="hidden w-[350px] min-w-[280px] max-md:absolute max-md:inset-0 max-md:w-full max-md:min-w-0 max-md:z-50 bg-white border-r flex-col z-20 flex-shrink-0 transition-all duration-300 relative shadow-md">
            <div id="chat-resizer" className="absolute top-0 right-0 bottom-0 w-1.5 cursor-col-resize bg-transparent hover:bg-[#C4B5FD] z-50 transition-colors"></div>
            
            <div className="p-3 border-b flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2"><i data-lucide="sparkles" className="w-4 h-4 text-[#8B5CF6]"></i> <span data-i18n="txt_001">Asistente IA</span></span>
                <div className="flex items-center gap-1">
                    <button id="btn-clear-chat-history" className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-full hover:bg-gray-100" title="Borrar historial del chat" data-i18n-title="btn_clear_chat_history_title"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                    <button id="btn-close-chat" className="text-gray-600 hover:text-gray-900 transition p-1.5 rounded-full hover:bg-gray-100" title="Cerrar Panel" data-i18n-title="btn_close_chat_title"><i data-lucide="x" className="w-5 h-5"></i></button>
                </div>
            </div>

            <div id="chat-history" className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-gray-50/50"></div>
            
            <div id="live-chat-controls" className="hidden p-3 border-t bg-[#F8F7FF] flex flex-col gap-2 shrink-0 relative z-10">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-[#7C3AED] flex items-center gap-1"><i data-lucide="radio" className="w-3 h-3"></i> <span data-i18n="txt_002">Cambia la voz después de una respuesta</span></span>
                    <button id="btn-close-live-chat-controls" className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"><i data-lucide="x" className="w-3 h-3"></i></button>
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-600"><span data-i18n="txt_003">Voz:</span></label>
                    <select id="live-voice-select" className="text-xs border border-gray-300 rounded p-1 flex-1 outline-none focus:ring-1 focus:ring-[#8B5CF6]"></select>
                </div>
                <button id="btn-start-live-from-chat" className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs py-1.5 rounded-md transition font-medium flex items-center justify-center gap-1">
                    <i data-lucide="radio" className="w-3 h-3"></i> <span data-i18n="txt_004">Iniciar conversación en vivo</span>
                </button>
            </div>

            <div id="normal-chat-input" className="p-3 border-t bg-white flex flex-col gap-2 shrink-0 relative z-10">
                <div id="img-preview-container" className="hidden relative mb-2">
                    <img id="img-preview-img" className="w-full h-24 object-contain rounded border bg-gray-50" />
                    <button id="btn-remove-img" className="absolute top-1 right-1 bg-gray-800 text-white rounded-full p-1 hover:bg-gray-700 transition">
                        <i data-lucide="x" className="w-3 h-3"></i>
                    </button>
                </div>
                <textarea id="ai-input" className="text-sm border border-gray-300 p-2.5 rounded-lg w-full resize-none focus:ring-2 focus:ring-[#8B5CF6] outline-none" rows="2" placeholder="Escribe tu pregunta aquí" data-i18n-placeholder="ai_input_ph"></textarea>
                <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-1">
                        <button id="btn-chat-dictate" className="text-gray-400 hover:text-[#7C3AED] transition p-1.5 rounded-md hover:bg-gray-50" title="Dictar pregunta" data-i18n-title="btn_chat_dictate_title">
                            <i data-lucide="mic" className="w-4 h-4"></i>
                        </button>
                        <button id="btn-chat-live" className="text-gray-400 hover:text-[#7C3AED] transition p-1.5 rounded-md hover:bg-gray-50" title="Conversación en vivo" data-i18n-title="btn_chat_live_title">
                            <i data-lucide="radio" className="w-4 h-4"></i>
                        </button>
                        <button id="btn-chat-inspect" className="text-gray-400 hover:text-[#7C3AED] transition p-1.5 rounded-md hover:bg-gray-50" title="Rastreador de área del documento (Modo Rastreador)" data-i18n-title="btn_chat_inspect_title">
                            <i data-lucide="scan" className="w-4 h-4"></i>
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button id="btn-chat-brief" className="text-[#7C3AED] transition p-1.5 rounded-md hover:bg-gray-50" title="Respuestas breves" data-i18n-title="btn_chat_brief_title">
                            <i data-lucide="zap" className="w-4 h-4"></i>
                        </button>
                        <button id="btn-chat-sound" className="text-[#7C3AED] hover:text-[#7C3AED] transition p-1.5 rounded-md hover:bg-gray-50" title="Activar lectura de respuestas" data-i18n-title="btn_chat_sound_title">
                            <i data-lucide="volume-2" className="w-4 h-4" id="icon-chat-sound"></i>
                        </button>
                        <button id="btn-chat-web" className="text-gray-400 hover:text-[#7C3AED] transition p-1.5 rounded-md mr-1 hover:bg-gray-50" title="Activar Búsqueda Web (Gemini)" data-i18n-title="btn_chat_web_title">
                            <i data-lucide="globe" className="w-4 h-4" id="icon-chat-web"></i>
                        </button>
                        <button id="ai-submit" className="text-xs bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3 py-1.5 rounded-md transition font-medium flex items-center gap-1">
                            <span data-i18n="ai_submit_txt">Enviar</span> <i data-lucide="send" className="w-3 h-3"></i>
                        </button>
                    </div>
                </div>
            </div>
        </aside>
  );
}
