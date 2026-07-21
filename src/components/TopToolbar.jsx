export default function TopToolbar() {
  return (
    <div id="pdf-toolbar" className="hidden w-full shrink-0 items-center gap-0.5 px-2 z-[500]" style={{height: '44px', background: '#202124', boxShadow: '0 1px 4px rgba(0,0,0,0.4)', userSelect: 'none'}}>
        <button id="topbar-btn-open" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Abrir otro documento (D)" data-i18n-title="topbar_btn_open_title">
            <i data-lucide="folder-open" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-btn-zoom-out" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Alejar (Ctrl −)" data-i18n-title="topbar_btn_zoom_out_title">
            <i data-lucide="zoom-out" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-zoom-pct" className="min-w-[40px] h-8 px-0.5 text-center text-xs rounded-md hover:bg-white/10 transition shrink-0" style={{color: '#9aa0a6'}} title="Restablecer 100% (Ctrl 0)" data-i18n-title="topbar_zoom_pct_title">150%</button>
        <button id="topbar-btn-zoom-in" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Acercar (Ctrl +)" data-i18n-title="topbar_btn_zoom_in_title">
            <i data-lucide="zoom-in" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-btn-fit-width" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Ajustar al ancho (X)" data-i18n-title="topbar_btn_fit_width_title">
            <i data-lucide="move-horizontal" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-btn-fit-height" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Ajustar al alto (Y)" data-i18n-title="topbar_btn_fit_height_title">
            <i data-lucide="move-vertical" className="w-[18px] h-[18px]"></i>
        </button>
        <div className="flex-1 min-w-0"></div>
        <div id="topbar-page-indicator" className="hidden items-center gap-1 text-xs px-2 whitespace-nowrap shrink-0 text-[#e8eaed]">
            <input type="number" id="topbar-page-input" min="1" defaultValue="1" className="w-8 text-center bg-white/10 rounded outline-none text-[#e8eaed]" />
            <span>/</span>
            <span id="topbar-page-total">0</span>
        </div>
        <div className="flex-1 min-w-0"></div>
        <button id="topbar-btn-clock" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Hora de inicio y tiempo restante" data-i18n-title="topbar_btn_clock_title">
            <i data-lucide="clock" className="w-[16px] h-[16px]"></i>
        </button>
        <button id="topbar-progress" className="min-w-[44px] h-8 px-1 text-center text-xs rounded-md hover:bg-white/10 transition shrink-0" style={{color: '#9aa0a6'}} title="Avance en el documento" data-i18n-title="topbar_progress_title">0%</button>
        <button id="topbar-btn-fullscreen" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Pantalla completa (Z)" data-i18n-title="topbar_btn_fullscreen_title">
            <i id="topbar-icon-fullscreen" data-lucide="expand" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-btn-help" className="w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Ayuda sobre botones (Q)" data-i18n-title="topbar_btn_help_title">
            <i data-lucide="circle-help" className="w-[18px] h-[18px]"></i>
        </button>
        <button id="topbar-btn-shortcuts" className="max-md:hidden w-8 h-8 flex items-center justify-center rounded-md text-[#e8eaed] hover:bg-white/10 active:bg-white/20 transition shrink-0" title="Atajos de teclado (J)" data-i18n-title="topbar_btn_shortcuts_title">
            <i data-lucide="keyboard" className="w-[18px] h-[18px]"></i>
        </button>
    </div>
  );
}
