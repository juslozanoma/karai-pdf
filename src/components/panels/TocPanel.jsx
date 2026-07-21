export default function TocPanel() {
  return (
    <div id="toc-panel" className="hidden fixed bg-white p-4 border border-gray-200 shadow-2xl rounded-lg w-80 max-w-[90vw] z-[1000] max-h-[60vh] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><i data-lucide="list" className="w-4 h-4"></i> <span data-i18n="txt_019">Tabla de Contenido</span></h4>
            <button id="btn-close-toc" className="text-gray-400 hover:text-gray-600"><i data-lucide="x" className="w-4 h-4"></i></button>
        </div>
        <div id="toc-list" className="overflow-y-auto flex-1 flex flex-col gap-1 pr-1">
            <p className="text-xs text-gray-500 text-center py-4"><span data-i18n="txt_020">Procesando índice...</span></p>
        </div>
    </div>
  );
}
