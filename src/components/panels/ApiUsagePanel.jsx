export default function ApiUsagePanel() {
  return (
    <div id="api-usage-panel" className="hidden fixed inset-0 z-[1100] bg-black/40 items-center justify-center" onClick={() => { document.getElementById('api-usage-panel').classList.add('hidden'); document.getElementById('api-usage-panel').classList.remove('flex'); }}>
        <div className="bg-white rounded-lg shadow-2xl w-[92vw] max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b">
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2"><i data-lucide="activity" className="w-4 h-4"></i> <span data-i18n="txt_018">Errores de API y consumo (clave actual)</span></h4>
                <button id="btn-close-api-usage" className="text-gray-400 hover:text-gray-600"><i data-lucide="x" className="w-4 h-4"></i></button>
            </div>
            <div id="api-usage-content" className="overflow-y-auto flex-1 p-4 text-sm text-gray-700"></div>
            <div className="p-3 border-t flex justify-end">
                <button id="btn-reset-api-usage" className="text-xs text-red-500 hover:text-red-700 font-semibold"><span data-i18n="btn_reset_api_usage_txt">Reiniciar estadísticas</span></button>
            </div>
        </div>
    </div>
  );
}
