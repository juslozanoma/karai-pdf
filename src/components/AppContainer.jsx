import ChatPanel from './ChatPanel';
import MainViewer from './MainViewer';

export default function AppContainer() {
  return (
    <div id="app-container" className="flex-1 w-full flex flex-row overflow-hidden relative">
      <ChatPanel />
      <MainViewer />
    </div>
  );
}
