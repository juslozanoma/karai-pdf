import TopToolbar from './components/TopToolbar';
import AppContainer from './components/AppContainer';
import BottomBar from './components/BottomBar';
import ShortcutsHintBar from './components/ShortcutsHintBar';
import MobileLangPanel from './components/panels/MobileLangPanel';
import MarginsPanel from './components/panels/MarginsPanel';
import ApiUsagePanel from './components/panels/ApiUsagePanel';
import VoiceDropdownMenu from './components/panels/VoiceDropdownMenu';
import TocPanel from './components/panels/TocPanel';
import FiguresPanel from './components/panels/FiguresPanel';
import ShortcutsPanel from './components/panels/ShortcutsPanel';
import HelpPanel from './components/panels/HelpPanel';
import LanguageOnboardingModal from './components/modals/LanguageOnboardingModal';
import ProgressTooltip from './components/ProgressTooltip';
import HealthReminderModal from './components/modals/HealthReminderModal';
import { EngineProvider } from './context/EngineContext';

// La app conserva exactamente la misma estructura del DOM que la versión original en HTML
// (mismos ids y clases). Todo el comportamiento (PDF/DOCX, TTS, chat IA, live, atajos, etc.)
// vive en src/engine y se inicializa una sola vez, después del montaje, tal como el <script>
// original se ejecutaba al final del <body> una vez el HTML ya estaba parseado.
function App() {
  return (
    <EngineProvider>
      <TopToolbar />
      <AppContainer />
      <BottomBar />
      <ShortcutsHintBar />

      {/* PANELES FLOTANTES DESVINCULADOS */}
      <MobileLangPanel />
      <MarginsPanel />
      <ApiUsagePanel />
      <VoiceDropdownMenu />
      <TocPanel />
      <FiguresPanel />
      <ShortcutsPanel />
      <HelpPanel />
      <LanguageOnboardingModal />
      <ProgressTooltip />
      <HealthReminderModal />
    </EngineProvider>
  );
}

export default App;
