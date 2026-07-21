export default function ProgressTooltip() {
  return (
    <div id="progress-tooltip" className="hidden fixed bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg z-[700] pointer-events-none leading-relaxed">
        <div id="progress-tooltip-start"></div>
        <div id="progress-tooltip-remaining"></div>
    </div>
  );
}
