export default function MainViewer() {
  return (
    <main id="main-scroll" className="flex-1 min-w-0 bg-[#323639] relative overflow-hidden pb-[100px]">
            <div id="status-overlay" className="fixed top-14 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 flex items-center gap-2 opacity-0 transition-opacity z-50 pointer-events-none">
                <i data-lucide="loader-2" className="w-4 h-4 animate-spin text-[#7C3AED]"></i>
                <span id="status-text"><span data-i18n="status_text_txt">Procesando...</span></span>
            </div>

            <div id="pdf-container" className="relative max-w-full hidden flex flex-col items-center py-0 gap-0 min-h-screen"></div>

            {/* Scrollbar propia: la nativa está oculta en toda la app (ver ::-webkit-scrollbar
                 arriba), así que se construye una mínima y visible para poder mostrar a qué
                 página saltaría un clic, tanto al pasar el mouse por el riel como al arrastrar. */}
            <div id="custom-scrollbar-track" className="hidden absolute top-0 right-0 bottom-0 w-4 z-[200] hover:bg-black/5 transition-colors">
                <div id="custom-scrollbar-thumb" className="absolute right-0.5 w-2.5 bg-white/40 hover:bg-white/60 rounded-full cursor-pointer transition-colors" style={{top: '0', height: '40px'}}></div>
            </div>
            <div id="scrollbar-page-tooltip" className="hidden fixed bg-gray-900 text-white text-xs font-semibold px-2 py-1 rounded shadow-lg pointer-events-none z-[2000]"></div>

            {/* Vive junto con las guías rojas (mismo contenedor que el documento) mientras se
                 previsualizan los bordes; al presionarlo se aplican los cambios y desaparecen. */}
            <button id="btn-apply-margins" className="hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] bg-[#7C3AED] text-white text-sm px-5 py-2.5 rounded-full hover:bg-[#6D28D9] transition font-semibold shadow-lg"><span data-i18n="btn_apply_margins_txt">Actualizar lectura sobre bordes</span></button>

            <label htmlFor="doc-upload-main" id="empty-state" className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center text-gray-400 h-full w-full bg-gray-100 hover:bg-gray-50 transition z-10">
                <i data-lucide="file-up" className="w-20 h-20 mb-4"></i>
                <p className="text-xl font-medium text-center px-4"><span data-i18n="txt_005">Toca aquí o sube un archivo PDF o DOCX para comenzar</span></p>
                <input type="file" id="doc-upload-main" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" />
            </label>
        </main>
  );
}
