import { useEffect, useRef, useState } from 'react';
import { initReaderEngine } from '../engine';

// useReaderEngine: inicializa el motor completo del lector (PDF/DOCX, TTS, chat IA, live,
// atajos, i18n, etc.) UNA sola vez, despues de que el DOM ya esta montado -- igual que el
// <script> original, que se ejecutaba al final del <body> con el HTML ya parseado.
//
// El `useRef` evita una doble inicializacion (por ejemplo, si Fast Refresh volviera a montar
// el componente en desarrollo), ya que el motor original no fue escrito para tolerar volver a
// registrar sus ~140 addEventListener, su WebSocket de conversacion en vivo, etc.
export function useReaderEngine() {
  const [ready, setReady] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initReaderEngine();
    setReady(true);
  }, []);

  return ready;
}
