export default function HelpPanel() {
  return (
    <div id="help-panel" className="hidden fixed bg-white p-4 border border-gray-200 shadow-2xl rounded-lg w-80 max-w-[90vw] z-[1000] cursor-default max-h-[70vh] flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3 border-b pb-2 shrink-0">
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><i data-lucide="circle-help" className="w-4 h-4"></i> <span data-i18n="txt_058">Funciones de la barra</span></h4>
            <button id="btn-close-help" className="text-gray-400 hover:text-gray-600"><i data-lucide="x" className="w-4 h-4"></i></button>
        </div>
        <div id="help-list" className="overflow-y-auto flex-1 flex flex-col gap-2.5 pr-1">
            <p className="text-xs text-gray-500 text-center py-4"><span data-i18n="txt_059">Cargando...</span></p>
        </div>
    </div>
  );
}
