import { createContext, useContext } from 'react';
import { useReaderEngine } from '../hooks/useReaderEngine';

const EngineContext = createContext({ ready: false });

// EngineProvider expone el estado "ready" del motor a traves de contexto. `props.children` se
// renderiza tal cual (sin recrearlo), asi que aunque este proveedor actualice su propio estado
// ("ready" pasa a true tras el montaje), React no vuelve a renderizar el arbol estatico de la UI
// ni pisa las mutaciones de DOM que el motor hace directamente (classList, innerHTML, etc.) --
// exactamente el mismo modelo del HTML + <script> original.
export function EngineProvider({ children }) {
  const ready = useReaderEngine();
  return (
    <EngineContext.Provider value={{ ready }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngineReady() {
  return useContext(EngineContext).ready;
}
