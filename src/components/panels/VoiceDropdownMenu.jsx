export default function VoiceDropdownMenu() {
  return (
    <div id="voice-dropdown-menu" className="hidden fixed w-[300px] bg-white border border-gray-200 shadow-2xl rounded-md flex-col z-[1010]">
        <input type="text" id="voice-search-input" className="p-2.5 border-b text-sm focus:outline-none w-full rounded-t-md bg-gray-50 text-gray-800 font-medium" placeholder="Escribe para filtrar (ej. 'BR')..." data-i18n-placeholder="voice_search_input_ph" />
        <div id="voice-options-list" className="max-h-[50vh] overflow-y-auto flex-1 p-1 flex flex-col gap-0.5"></div>
    </div>
  );
}
