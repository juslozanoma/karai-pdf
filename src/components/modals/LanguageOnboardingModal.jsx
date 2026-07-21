export default function LanguageOnboardingModal() {
  return (
    <div id="language-onboarding-modal" className="hidden fixed inset-0 z-[1300] bg-black/50 items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[85vh]">
            <div className="text-center">
                <h3 className="text-lg font-bold text-gray-800" data-i18n="lang_onboarding_title">¡Bienvenido! Elige tu idioma</h3>
                <p className="text-xs text-gray-500 mt-1" data-i18n="lang_onboarding_subtitle">Será el idioma de la interfaz, la lectura, el chat y el modo en vivo. Podrás cambiar solo la interfaz después, en Ajustes avanzados.</p>
            </div>
            <div id="language-onboarding-grid" className="grid grid-cols-2 gap-2 overflow-y-auto"></div>
        </div>
    </div>
  );
}
