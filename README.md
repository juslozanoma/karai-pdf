# Karai - PDF Reader (React + Vite)

Migración a React/Vite del lector `V14_unal.html` original, manteniendo el diseño, las
características y las funcionalidades 100% intactas — y con el motor **separado en archivos
pequeños por sección**, no en un único archivo de miles de líneas.

## Cambios de esta versión

- **Corregido:** la barra superior no aparecía y la inferior se veía "pegada arriba". La causa
  era que `<body>` en `index.html` había perdido las clases
  `bg-gray-100 flex flex-col h-screen font-sans text-gray-800 overflow-hidden`, necesarias para
  que la app ocupe toda la pantalla en columna (barra superior / contenido / barra inferior). Ya
  están restauradas.
- **Corregido:** error al subir el PDF. La causa era tener pdf.js **a la vez** por CDN (en
  `index.html`) y como paquete npm (`pdfjs-dist`, con un `src/engine/pdfEngine.js` aparte) — dos
  instancias de la librería compitiendo por el mismo worker. Se volvió a dejar pdf.js, mammoth.js
  y lucide **solo por CDN** (la configuración que ya está verificada y funcionando). Si más
  adelante quieres migrar a paquetes npm, se puede hacer con calma, ya con todo lo demás andando.
- **Nuevo:** botón de **Rastreador** en la barra inferior, junto al botón de brújula (ícono
  `scan-search`). Hace exactamente lo mismo que el botón que ya existía dentro del panel de chat
  (`#btn-chat-inspect`, modo de seleccionar un área del documento para preguntarle a la IA) — el
  botón nuevo simplemente delega al mismo botón/lógica, así que ambos quedan siempre
  sincronizados sin duplicar código.
- **Nuevo:** la lectura en voz alta de las respuestas del chat (`#btn-chat-sound`) ahora viene
  **activada por defecto** (antes había que activarla manualmente).

## Cómo correrlo

```bash
npm install
npm run dev      # desarrollo
npm run build    # build de producción (carpeta dist/)
npm run preview  # sirve el build de producción
npm run deploy   # publica dist/ en GitHub Pages (gh-pages)
```

## Estructura

```
src/
  components/            Toda la interfaz (JSX), con los MISMOS ids/clases que el HTML original
    panels/                Paneles flotantes (ajustes, TOC, figuras, atajos, ayuda, voces, uso de API)
    modals/                Modales (bienvenida de idioma, recordatorio de salud)
  hooks/
    useReaderEngine.js     Inicializa el motor una sola vez tras montar la app
  context/
    EngineContext.jsx      Expone el estado "listo" del motor a través de contexto
  engine/
    index.js               Orquestador: llama a cada sección en el orden original
    state.js                Estado compartido (antes variables sueltas de nivel superior)
    i18n.js                  Diccionario de traducciones (8 idiomas) y metadatos de idiomas
    sections/                 31 archivos, uno por función/tema (ver tabla abajo)
  index.css                CSS original, sin cambios
index.html                 Carga Tailwind, pdf.js, mammoth.js y lucide por CDN (igual que el original)
```

### `src/engine/sections/` — qué editar según lo que quieras cambiar

| Archivo | Qué contiene |
|---|---|
| `i18nRuntime.js` | `t()`, cambio de idioma de interfaz/lectura, pantalla de bienvenida de idioma |
| `geminiConfig.js` | Configuración de Gemini (modelo, API key) y estadísticas de uso/errores |
| `globalConfig.js` | Configuración global de pdf.js |
| `scrollLock.js` | Bloqueo de scroll en modo rastreador |
| `chatPanelResize.js` | Redimensión del panel lateral de chat |
| `buttonStyles.js` | Estilos activo/inactivo de botones |
| `imageTrackerMode.js` | Modo rastreador de imágenes/área (Visual RAG) |
| `tutorMode.js` | Modo estudio y explicaciones (tutor IA) |
| `floatingMenus.js` | Menús flotantes de la UI y márgenes |
| `anchoredPanels.js` | Paneles anclados a sus botones (atajos/ayuda) |
| `helpPanelData.js` | Contenido estático del panel de ayuda sobre botones |
| `advancedSettings.js` | Ajustes avanzados (modelo / API key / uso) |
| `healthReminders.js` | Recordatorios de salud |
| `autoTrackSend.js` | Modo rastreador: envío automático |
| `translateSubtitlesButtons.js` | Botones de traducir y subtítulos |
| `subtitleResize.js` | Redimensión de la caja de subtítulos |
| `ignoreFigures.js` | Botón "ignorar figuras y texto pequeño" |
| `tts.js` | **Botón play/pausa**, síntesis de voz, filtrado de texto, precarga async |
| `subtitleHighlight.js` | Resaltado de palabra por palabra en subtítulos |
| `pageNavigation.js` | Navegación instantánea entre páginas |
| `customScrollbar.js` | Barra de scroll propia del documento |
| `aiIndexingState.js` | Estado global de IA y extracción/indexación del documento |
| `pdfDocxRenderer.js` | Renderizado del PDF y DOCX |
| `zoom.js` | Zoom (botones +/-) |
| `topToolbarSync.js` | Sincronización de la barra superior + tooltip de progreso |
| `pictureInPicture.js` | Ventana flotante (Picture-in-Picture) |
| `keyboardShortcuts.js` | Atajos de teclado + barra de atajos |
| `chat.js` | Chat de IA (RAG + búsqueda en internet), burbujas, resaltado de palabra |
| `liveConversation.js` | Conversación en vivo (Gemini Live API, voz a voz) |
| `compassNavigation.js` | Brújula: comandos de voz con IA semántica |
| `pinchZoom.js` | Zoom con gesto de dos dedos (pinch) |

Por ejemplo: si quieres cambiar el **botón de play/pausa**, abres `sections/tts.js`. Si quieres
tocar el **chat**, abres `chat.js`. No hay que buscar en un archivo de 5000 líneas, y una sola
función no queda repartida entre 10 archivos.

## Cómo se hizo la separación (para que confíes en que no se rompió nada)

Separar 5421 líneas con 164 funciones que se llaman entre sí y comparten ~213 variables mutables
(`let`/`const` de nivel superior) es riesgoso si se hace "a mano" con copiar/pegar: es fácil
duplicar, olvidar o renombrar mal algo. Por eso la separación se hizo con una **herramienta
propia basada en el AST real de JavaScript** (con `acorn` + `eslint-scope`, las mismas librerías
que usa ESLint para saber qué variable es cuál), no con expresiones regulares ni copiado manual:

1. Se analizó el árbol de sintaxis del script original y se identificaron con precisión sus 164
   funciones y sus 213 variables/constantes de nivel superior (y a qué declaración exacta
   resuelve cada uso de esas 213 — para NO tocar una variable local que por casualidad se llame
   igual, como `btnMic` dentro de una función, distinta de la `btnMic` global).
2. Las 213 variables compartidas se centralizaron en un solo objeto `state` (`src/engine/state.js`).
   Cada aparición real de esas variables (y solo esas) se reemplazó por `state.nombre` en todo el
   código — un reemplazo mecánico y verificado, no manual.
3. Cada una de las 164 funciones se volvió a ubicar en el archivo de su sección (según los
   comentarios de sección — "SÍNTESIS DE VOZ", "LÓGICA DE IA", "CONVERSACIÓN EN VIVO", etc. — que
   ya traía el script original) y se exportó con su mismo nombre. Cuando una función de una
   sección llama a una función de otra sección, se generó automáticamente el `import` correcto.
4. Se verificó automáticamente que:
   - Las 164 funciones siguen existiendo, sin duplicados ni faltantes.
   - Las 213 variables siguen centralizadas en `state.js`.
   - Los 140 `addEventListener` del original siguen presentes.
   - Los 171 `id` del DOM que el motor usa (`getElementById`) siguen existiendo en los
     componentes React.
   - `npm run build` compila sin errores (68-69 módulos, todos los imports se resuelven).
   - El formateo final (con Prettier) generó el **mismo bundle final** (mismo hash de archivo)
     que antes de formatear, es decir: solo cambió la indentación visual, cero cambios de lógica.

El orden de inicialización (`src/engine/index.js`) respeta exactamente el orden del `<script>`
original: cada sección se inicializa en la misma secuencia, y `initInterfaceLanguage()` -- que en
el original corría al final de todo -- sigue corriendo al final de todo.

## Decisiones de la migración

1. **pdf.js, mammoth.js y lucide se mantienen por CDN** (mismas URLs que el original, en
   `index.html`) en vez de instalarse como paquetes npm, para no arriesgar diferencias de
   comportamiento por bundling/versión/worker-path.
2. **Los componentes React son "cáscaras" del DOM original**: mismo `id`, mismas clases de
   Tailwind, mismo `data-i18n*`. El motor sigue manipulando el DOM con
   `document.getElementById(...)`, `classList`, `innerHTML`, etc., exactamente como antes. Los
   componentes se montan una sola vez y no vuelven a renderizarse, así que React nunca pisa las
   mutaciones que el motor hace directamente sobre el DOM.
3. Los `<input>` con `value`/`checked` en el HTML original pasaron a `defaultValue`/
   `defaultChecked` en JSX (si no, React los volvería "controlados" y bloquearía la interacción).
4. Se usa React sin `<StrictMode>` a propósito: el motor no está pensado para inicializarse dos
   veces (duplicaría listeners, conexiones WebSocket, etc.), que es justo lo que `StrictMode`
   fuerza en desarrollo.

## ⚠️ Nota de seguridad importante

El archivo original trae una **clave de API de Gemini escrita directamente en el código**
(visible para cualquiera que abra las herramientas de desarrollador del navegador), en
`sections/geminiConfig.js`:

```js
state.apiKey = localStorage.getItem('pdfReaderApiKeyOverride') || "AQ.Ab8RN6J5...";
```

Esta migración preserva ese comportamiento tal cual (ya estaba expuesto en el archivo que
compartiste), pero te recomiendo rotar esa clave si sigue activa y mover las llamadas a Gemini a
un backend propio en vez de exponer la clave en el cliente.

## Otras notas

- `index.html` ya referencia `/favicon.png` (vía `%BASE_URL%` para que funcione bien bajo
  GitHub Pages), pero el archivo no existe todavía — agrega tu ícono en `public/favicon.png`
  para que se muestre (si falta, el navegador simplemente no muestra ícono, no rompe nada).
