export default function FiguresPanel() {
  return (
    <div id="figures-panel" className="hidden fixed bg-white p-4 border border-gray-200 shadow-2xl rounded-lg w-[350px] max-w-[90vw] z-[1000] max-h-[60vh] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 border-b pb-2">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><i data-lucide="image" className="w-4 h-4"></i> <span data-i18n="txt_021">Índice de elementos gráficos</span></h4>
            <button id="btn-close-figures-panel" className="text-gray-400 hover:text-gray-600"><i data-lucide="x" className="w-4 h-4"></i></button>
        </div>
        <div id="figures-list" className="overflow-y-auto flex-1 flex flex-col gap-1 pr-1">
            <p className="text-xs text-gray-500 text-center py-4"><span data-i18n="txt_022">Buscando elementos...</span></p>
        </div>
    </div>
  );
}
