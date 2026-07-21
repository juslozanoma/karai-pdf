export default function HealthReminderModal() {
  return (
    <div id="health-reminder-modal" className="hidden fixed inset-0 z-[1300] bg-black/40 items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-5 flex flex-col items-center text-center gap-2">
            <i data-lucide="droplet" className="w-10 h-10 text-[#7C3AED]"></i>
            <h4 className="text-base font-bold text-gray-800" data-i18n="health_reminder_title">Pausa saludable</h4>
            <p className="text-sm text-gray-600" data-i18n="health_reminder_message">Llevas ya un buen rato leyendo seguido. Un pequeño descanso te ayuda a mantener la concentración y a cuidar tu cuerpo.</p>
            <ul className="text-xs text-gray-500 text-left list-disc pl-5 space-y-1 mt-1 w-full">
                <li data-i18n="health_tip_1">Bebe un vaso de agua: la lectura prolongada también deshidrata.</li>
                <li data-i18n="health_tip_2">Ponte de pie y camina un par de minutos.</li>
                <li data-i18n="health_tip_3">Regla 20-20-20: cada 20 minutos mira algo a 20 pies (6 metros) durante 20 segundos.</li>
                <li data-i18n="health_tip_4">Estira el cuello, los hombros y la espalda.</li>
                <li data-i18n="health_tip_5">Parpadea varias veces seguidas para humedecer los ojos.</li>
            </ul>
            <button id="btn-close-health-reminder" className="mt-2 bg-[#7C3AED] text-white text-sm px-4 py-2 rounded-md hover:bg-[#6D28D9] transition font-semibold" data-i18n="health_reminder_dismiss">Entendido</button>
            <p className="text-[11px] text-gray-400 mt-1" data-i18n="health_reminder_settings_note">Para quitar esta opción ve a Ajustes - Ajustes avanzados</p>
        </div>
    </div>
  );
}
