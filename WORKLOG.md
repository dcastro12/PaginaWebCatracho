# Worklog de Implementación Web CATRACHO

## Objetivo

Registrar, en orden cronológico, las decisiones, cambios y verificaciones hechas durante la construcción de la web.

## Registro

### 2026-04-24 — Arranque del proyecto

- Scaffold manual sobre Vite 7 + React 19 + TypeScript 5 (sin boilerplate de ejemplo).
- `tsconfig.app.json` con flags estrictas habilitadas: `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`, `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- Bootstrap 5 agregado como dependencia y registrado en `main.tsx` únicamente para aprovechar grid y utilidades. La identidad visual se construirá con tokens y estilos propios más adelante.
- Estructura de carpetas por responsabilidad creada: `app/styles`, `components/{layout, navigation, panels, sections}`, `content/{config, editorial, datasets}`, `hooks`, `types`, `assets/{brand, hero, sections, thumbnails}` y `public/{documents, media}`.
- `package.json` con scripts `dev`, `build` y `preview` verificados.
- README inicial con comandos, sección Mantenimiento y placeholder de Responsables.

### 2026-04-24 — Tokens de diseño

- Creado `src/app/styles/tokens.css` con todas las variables del UIKit agrupadas por dominio: base, bordes, texto, accent, estados, sombras, radios, contenedor, fuentes, tipografía desktop, tipografía mobile, botones (sm/md/lg), modal (radii desktop/mobile + close size) y tabla (row height, radius, zebra).
- Fuentes Montserrat (display) y Source Sans 3 (body) cargadas en `index.html` con `preconnect` a Google Fonts y `display=swap` para evitar flash de texto invisible durante la carga.
- `main.tsx` registra `tokens.css` después de Bootstrap para que las variables estén disponibles en todo el árbol de estilos sin competir con los resets de Bootstrap.

### 2026-04-24 — Estilos globales base y primitivos reutilizables

- Creado `src/app/styles/globals.css` con el esqueleto visual del sitio:
  - Reset mínimo: `html` con `scroll-behavior: smooth`, `body` con gradiente radial + linear + `--cat-bg`, `a` heredando color, `button/input/table` heredando fuente, `img` como `block` con `max-width: 100%`.
  - `.site-root` como flex column con `min-height: 100dvh` y `overflow: clip` para anclar backdrop, footer y hero en un único contenedor responsive.
  - `.site-backdrop` y `.site-vignette` absolutos para la imagen de fondo y el vignette superpuesto. `.site-backdrop--mobile` arranca oculto (se activará por media query cuando exista la versión cuadrada del hero).
  - Dos `.site-gradient` fijos (`--one` y `--two`) como bokeh decorativo. Se construyen con `radial-gradient` sin `filter: blur` para evitar costo permanente en compositing.
- Scrollbars globales via `*` y `*::-webkit-scrollbar`: track transparente, thumb gris sutil con `border-radius: 999px`, hover en accent blue.
- Primitivo `.button-pill` con variantes `--primary` y `--secondary`, transiciones suaves y estado disabled consistente (opacity 0.45 + cursor not-allowed).
- Primitivo `.search-input` con foco accent blue y placeholder muted.
- Primitivo `.filter-chip` como tab redondeado con estado `.is-active` + hover/focus unificados.
- `App.tsx` monta el shell básico (`site-root` + vignette + gradients) para poder validar el fondo global sin esperar a hero/footer.
- `globals.css` registrado en `main.tsx` justo después de `tokens.css` para que los primitivos consuman variables sin race condition.

### 2026-04-24 — Contratos de tipos y configuración de navegación

- Creado `src/types/content.ts` con todos los contratos de datos compartidos: `SectionId` (union literal con los 8 canonicals), `SectionLink`, `ServiceItem`, `ServiceGroup`, `RequirementDownload`, `RequirementCategory`, `InfoMetric`, `PublicationKind`, `PublicationItem`, `DistanceRow`, `ContactItem` y `ContactGroup`.
- `SectionId` queda como única fuente de verdad para la navegación: cualquier nuevo modal o ruta tiene que extender este union antes de propagarse al resto del código.
- Creado `src/content/config/site.ts` con `siteMeta` (nombre, slogan, fullName, heroBadge, heroSummary, footer) y `sectionLinks` (array de los 8 canonicals con `id`, `label`, `eyebrow` y `description`).
- Texto del sitio con tildes y puntuación correcta desde el inicio (Misión & Visión, Información, Contáctenos, etc.).

### 2026-04-24 — Editorial y datasets institucionales

- Editorial de Historia en `src/content/editorial/history.ts`: `historyIntro`, `historyParagraphs` (5 párrafos cubriendo 1992–1993, asamblea de SPS, adopción del nombre, vida jurídica del 22-oct-1993, trayectoria reciente) y `missionVision` con los textos formales de Misión y Visión.
- Dataset de servicios en `src/content/datasets/services.ts`: 6 `ServiceItem` (carnet, calcomanías, DARA, IHTT, boletines, asistencia) referenciados por nombre dentro de 4 `ServiceGroup` (Trámites, Asesoría, Comunicados, Permisos). Las referencias por variable evitan los problemas de orden si después se añade un servicio nuevo.
- Dataset de información en `src/content/datasets/information.ts`: `informationSnapshot.updatedAt` como string `DD/MM/YYYY`, `dollarMetrics` con Compra/Venta y `dieselMetrics` con SPS/Tegucigalpa. Estructura preparada para que el cron diario reescriba sólo los valores sin tocar la forma.
- Dataset de contactos en `src/content/datasets/contact.ts`: tres grupos (Teléfonos con celular como único contacto, Correos con presidencia/administración/servicios, Redes con Facebook oficial). Hrefs `tel:`, `mailto:` y URL completa según corresponde.

### 2026-04-24 — Datasets de consulta y descargables

- Requisitos en `src/content/datasets/requirements.ts`: tres `RequirementDownload` (DOC) — Comerciante Individual, Sociedad Mercantil y Requisitos de incorporación a CATRACHO — más una `RequirementCategory` "Incorporación a CATRACHO" con la lista completa de 8 items (escritura de constitución, certificado de operación, boleta de revisión vehicular, identidad y RTN, licencia de conducir del motorista, recibo de servicios, antecedentes penales, resolución DARA).
- Publicaciones en `src/content/datasets/publications.ts`: 14 entries en total — 5 PDFs (Acuerdo PFI Agua Caliente, Decreto Seguro Carga 2018, Nueva Ley Terrestre, Rutas Fiscales 1, Rutas Fiscales 2), 7 imágenes (Amigos de CATRACHO, Agentes y Aduanas, 3 meses de amnistía, Precios navieras, Comunicado 02/11/2018, Vacunas, Modelo Climático Guatemala), 1 video (Carretera Panamericana bloqueada) y 1 enlace externo (Asamblea CIT en SPS). Los thumbnails se importan desde `src/assets/thumbnails/` y se reusan como `previewHref` para que la imagen original sirva tanto de miniatura como de preview a pantalla completa.
- Distancias en `src/content/datasets/distances.ts`: 180+ rutas tipadas con `id`, `from`, `to` y `km`. Topónimos hondureños en mayúsculas con tildes correctas (Puerto Cortés, Santa Bárbara, Copán, Danlí, El Paraíso, Colón, La Unión, Atlántida, etc.). Origen consistente para que tablas por origen y búsquedas por destino funcionen sin normalización extra.
- Binarios servidos como estáticos bajo `public/`:
  - `public/documents/requisitos/` con los 3 DOCs.
  - `public/documents/leyes-y-otros/` con los 5 PDFs.
  - `public/media/` con el MP4 del bloqueo en la Panamericana.
- Las thumbnails de imágenes (importadas vía Vite) se quedan en `src/assets/thumbnails/` para que el bundler les aplique fingerprint y cache busting.

### 2026-04-24 — Shell, hash sync y footer

- Hook `src/hooks/useHashPanelSync.ts` parametrizado en `TId extends string`. Recibe `validIds: ReadonlySet<TId>` y `legacyMap?: Record<string, TId>`, expone `{ activeId, open, close }`. Lee el hash inicial al montar, escucha `hashchange`, traduce hashes legacy a canónicos vía `history.replaceState` y limpia el `#` residual al cerrar usando `pushState` con sólo `pathname + search`. Toda actualización va dentro de `startTransition` para no bloquear input.
- `Footer` simple con copyright dinámico (`new Date().getFullYear()`) sobre gradiente vertical sutil.
- `SiteShell` orquesta backdrop dual (`--desktop` y `--mobile`), vignette, dos `site-gradient` decorativos y el footer. Mantiene `validIds` memoizado y consume el hook con un `legacyHashMap` que mapea las cinco rutas del sitio antiguo (`myv`, `info`, `noticias`, `distancia`, `contactos`) a sus canónicos. Hero y PanelHost se enchufan en sus fases correspondientes.
- `App.tsx` ahora delega todo el render a `SiteShell`.

### 2026-04-24 — Hero, navegación principal y estilos del landing

- `MainNav` con dos variantes: `hero` (pill grid de 8 columnas con `aria-label`) y `panel` (Bootstrap row con `nav-pill` que muestra eyebrow + label + description). El callback `onSelect(id)` queda contraído al tipo `SectionId` para que TS valide cualquier nuevo destino al toque.
- `Hero` con `hero-shell` como flex column, `hero-stage-wrap` con padding generoso y `hero-card` translúcida (alpha 0.80–0.85) que muestra logo, h1 y slogan. La banda inferior `hero-nav-band` carga `MainNav` en variante hero y se sienta sobre un gradiente que oscurece levemente el fondo.
- Estilos en `globals.css`: `hero-shell` flex 1 1 auto para que crezca dentro del shell, `hero-stage-wrap` con `min-height: 72vh` para que el card siempre tenga aire, `hero-card` con borde sutil y `box-shadow` de los tokens, `hero-logo` 56px en desktop, h1 con Montserrat + tracking 0.22em + clamp para escala fluida, slogan en uppercase con letter-spacing.
- `hero-nav-bar` como grid de 8 columnas con `border-radius: 999px` y `overflow: hidden` para que las pills internas se recorten al óvalo. `hero-nav-pill` neutro, divisores entre pills, hover/focus en accent blue (background semi-transparente + box-shadow inset). En `min-width: 992px` la primera y última pill toman el radio del contenedor para que el hover no se vea cuadrado en las esquinas.
- Logo `catracho-mark.png` colocado en `src/assets/brand/`. Importado por `Hero` para que Vite le aplique fingerprint.
- `SiteShell` ahora monta `Hero` con los `sectionLinks` y el `open` del hook, así cualquier click en una pill empuja el hash canónico.

### 2026-04-24 — Hooks del panel y PanelHost base

- Tres hooks pequeños y focalizados para los efectos laterales del modal:
  - `useBodyScrollLock(isLocked)` guarda el `overflow` previo del body, lo cambia a `hidden` mientras el panel esté abierto y lo restaura al desmontar.
  - `useEscapeKey(callback, enabled)` adjunta un listener de `keydown` sólo cuando el flag está activo, llama al callback al recibir Escape y limpia el listener al desmontar.
  - `useDocumentTitle(title | null)` cambia `document.title` cuando recibe un string, y lo restaura al string anterior cuando recibe `null` o se desmonta.
- `PanelHost` con props `title`, `isOpen`, `onClose`, `compact?` y `children`. Devuelve `null` cuando está cerrado para no dejar nodos en el DOM. Cuando abre:
  - Aplica los tres hooks (scroll lock, ESC y document title con sufijo `| CATRACHO`).
  - Foco automático al frame al montar (`panelRef`).
  - Cierre por X (botón con `aria-label`), Escape (vía hook) y mouse-down sobre el overlay (cuando el target del evento es el overlay mismo, no un descendiente).
  - Soporte para variante compact via prop booleana.
- Estilos en `globals.css`:
  - `.panel-overlay` fixed full-viewport con `var(--cat-overlay)` + `backdrop-filter: blur(10px)` para el efecto glass.
  - `.panel-frame` con `width: min(1320px, 92vw)` y `height: min(92dvh, 960px)`, flex column con `overflow: hidden` y `border-radius: var(--cat-radius-xl)`.
  - `.panel-frame--compact` con ancho 820px y `align-self: center` para no estirarse en mobile cuando el overlay esté en `align-items: stretch`.
  - `.panel-frame__toolbar` con título a la izquierda y close button a la derecha, separados por `border-bottom`.
  - `.panel-close` con borde de 2px que vira a accent en hover/focus.
  - `.panel-frame__body` con `flex: 1 1 auto`, `min-height: 0` (para que el scroll interno respete la altura del frame) y la variante `--locked` con `overflow: hidden` para que las secciones manejen su propio scroll.
- `SiteShell` ahora monta `PanelHost` con `title`, `isOpen` y `onClose` derivados del hook, y pasa `compact={activeId === 'mision-vision'}` para que sólo MyV use el frame compacto. Mientras las secciones reales no existen, `renderSection` devuelve un placeholder temporal que se reemplaza en la fase F.

### 2026-04-24 — Animación pop con backdrop diferido

- `PanelHost` extendido con tres estados: `mounted` (controla la presencia en el DOM), `visible` (dispara la animación de entrada) y `hasBlur` (activa el `backdrop-filter` después de la apertura).
- Secuencia de apertura: `setMounted(true)` → `requestAnimationFrame(() => setVisible(true))` para que la transition arranque desde la opacidad 0 → `setTimeout(() => setHasBlur(true), 240)` para que el blur entre en escena cuando la animación de scale ya casi terminó.
- Secuencia de cierre: `setVisible(false)` y `setHasBlur(false)` instantáneo (el blur se quita como step-change para que el cierre no tenga que recomputar el filter por frame), y `setMounted(false)` 200 ms después para dar tiempo al fade-out.
- Foco al frame movido al efecto que escucha `visible`, así no se intenta enfocar antes de que el nodo esté pintado.
- CSS con transición asimétrica para `backdrop-filter`:
  - Estado base: `backdrop-filter: blur(0)` con transition de 0s linear (cierre instantáneo).
  - Variante `.has-blur`: `backdrop-filter: blur(10px)` con transition de 260ms ease-out (apertura suave).
  - Esto evita el costo de animar el blur de subida durante el fade de la opacidad.
- `.panel-frame` con `opacity: 0` + `transform: scale(0.94)` por defecto, y `.panel-frame.is-open` lleva opacity 1 + scale 1 + `will-change: opacity, transform` aplicado solo mientras está abierto.
- `contain: layout paint` en `.panel-frame` y `.section-stack` para aislar el cálculo de layout y paint del resto del documento.
- Bloque `@media (prefers-reduced-motion: reduce)` que desactiva todas las transiciones del panel y deja `transform: none` para usuarios que pidan menos movimiento.

### 2026-04-24 — Sección Historia

- `HistoriaSection` consume `historyIntro` y `historyParagraphs` del editorial. El intro va como `history-lead` (más oscuro y bold) y los párrafos siguientes con `mb-0` para que el `gap` del scroll se encargue del espaciado.
- Layout en grid de dos columnas (`grid-template-columns: 0.48fr 0.52fr`): la izquierda monta la imagen institucional (mesa con banderas regionales), la derecha contiene la columna scrolleable. En mobile el grid colapsa a una sola columna en su breakpoint propio.
- `.content-image--history` con `object-position: 10% center` para que el encuadre muestre a las tres personas del lado izquierdo en lugar de centrar la foto en el grupo de banderas.
- `.history-scroll` con scroll vertical, `scrollbar-gutter: stable` y `overscroll-behavior-y: contain` para que el scroll del modal no contagie al body. El padding lateral 1.6rem en el lado derecho deja aire entre el texto y la scrollbar.
- `.history-layout__copy` con borde sutil y gradiente vertical para diferenciarse visualmente de la imagen.
- `historia.jpg` colocada en `src/assets/sections/` para que Vite la fingerprint y la incluya en el bundle.
- `SiteShell.renderSection` ahora hace switch sobre `SectionId` y enchufa `HistoriaSection` para `historia`. El resto de los ids siguen mostrando el placeholder hasta que aparezcan en las próximas tarjetas.

### 2026-04-24 — Sección Misión & Visión

- `MissionVisionSection` renderiza dos `statement-card` (Misión y Visión) consumiendo `missionVision` del editorial. Cada card tiene un eyebrow `statement-card__title` en uppercase + el texto largo abajo.
- Borde superior de 3px en `var(--cat-accent)` para marcar visualmente cada bloque, gradiente vertical sutil de fondo y `box-shadow: inset` para reforzar el contorno sin sumar shadow externo.
- `mission-vision-stack` como flex column con `flex: 0 1 auto` y `max-height: 100%`: las cards toman el alto natural de su contenido y el stack se queda dentro del modal sin estirarse. Si el contenido crece, hay scroll interno con `scrollbar-gutter: stable` y `overscroll-behavior-y: contain`.
- El frame compact ya estaba activado desde `SiteShell` (`compact={activeId === 'mision-vision'}`), así que el modal aparece más bajo y angosto que el resto.
- Tipografía con tildes (`Misión`, `Visión`) consistente con el resto del contenido.
- `SiteShell.renderSection` agrega el `case 'mision-vision'` apuntando al nuevo componente.

### 2026-04-24 — Sección Servicios

- `ServiciosSection` con banner superior + lista descriptiva. Los items son `<li>` puros, no botones — la información está siempre visible y no hay interacción que justifique un toggle.
- Banner alimentado por `servicios.jpg` (mostrador y ventanilla institucional). `object-position: center 58%` para que el encuadre muestre la ventanilla y los papeles informativos en lugar del ventilador del techo.
- `.content-image--banner` con `min-height: 320px` y `max-height: 380px` en desktop. Las alturas responsive se ajustan en la fase de breakpoints.
- `.service-list-card` con borde sutil + gradiente vertical, `flex: 1 1 auto` y `min-height: 0` para que la lista interna pueda scrollear si la cantidad de items crece.
- `.service-list` con scroll vertical, `scrollbar-gutter: stable` y `padding-right: 0.6rem` para que el thumb no se pegue al texto.
- `.service-list__item` con título en Montserrat uppercase + descripción en color soft. Borde sutil y fondo levemente más oscuro que la card que lo contiene.
- `servicios.jpg` colocada en `src/assets/sections/`.
- `SiteShell.renderSection` agrega el `case 'servicios'` apuntando a `ServiciosSection`.

### 2026-04-24 — Sección Requisitos

- `RequisitosSection` separa el contenido en dos bloques:
  - Bloque superior con dos `requirements-download-card` (Comerciante Individual y Sociedad Mercantil) en grid de 2 columnas. Cada card tiene un meta (`requirements-download-card__meta`) con eyebrow "Requisitos para código de aduana:" y el nombre del documento limpio (sacando el prefijo "Código de aduana - "), más un botón primario `Descargar` que apunta al `.doc` del dataset.
  - Bloque(s) por categoría con `requirements-group--scroll` que usa `grid-template-rows: auto minmax(0, 1fr)` para que el `requirements-list-shell` herede el alto sobrante del modal y muestre la lista numerada con scroll interno. Hoy hay una sola categoría ("Incorporación a CATRACHO") con los 8 items del proceso.
  - Footer opcional con la tercera descarga (documento completo de incorporación). Botón secondary alineado a la derecha.
- Estilos:
  - `.requirements-group__title` como eyebrow uppercase centrado.
  - `.requirements-download-grid` 2 columnas en desktop.
  - `.requirements-download-card` con borde gris-azulado y fondo levemente azulado para diferenciarlo del fondo del modal.
  - `.requirements-list-shell` con borde, padding asimétrico (1.6rem a la derecha) y `scrollbar-gutter: stable` para que el scroll no se monte sobre el texto numerado.
  - `.requirements-footer .button-pill` con `white-space: normal` para que el label largo pueda envolver en pantallas pequeñas.
- `SiteShell.renderSection` agrega el `case 'requisitos'`.

### 2026-04-24 — Sección Información

- `InformacionSection` con un `info-highlight` arriba que muestra "Actualización:" en uppercase + la fecha del snapshot en grande + una regla accent decorativa de 120×3 abajo. La fecha consume `informationSnapshot.updatedAt`.
- Debajo, dos `information-group` (Dólar y Diésel) con título h3 uppercase y filas `information-row` formato `label / valor`. El valor se renderiza prefijado con `Lps. ` y el `L ` original del dataset se elimina con un `replace(/^L\s*/, '')` para que un eventual cambio del dataset (que el scraper actualice sólo el número) no rompa el formato.
- Filas con `flex-wrap: wrap` y `overflow-wrap: anywhere` para que valores largos puedan envolver sin desbordar la card en mobile.
- `information-groups` es flex 1 1 auto con `overflow-y: auto` y `scrollbar-gutter: stable`, así si en el futuro se suman más métricas (ej. otras ciudades), la card scrollea internamente sin romper el layout del modal.
- `info-highlight__date` con clamp para escala fluida entre 1.7rem y 2.1rem según el viewport.
- `SiteShell.renderSection` agrega el `case 'informacion'`.

### 2026-04-24 — Sección Leyes & Otros

- `LeyesSection` con dos áreas: toolbar (search + chips de filtro) y biblioteca scrolleable.
- Search input con `useState` para el valor inmediato y `useDeferredValue` para el filtrado, así escribir rápido no bloquea el render del input mientras la lista se recompone.
- Filtro por categoría: `publicationCategories` se mapea a `filter-chip` con `role="tab"` y `aria-selected`. Mapeo interno `categoryToKind` traduce "PDF/Imagen/Video/Enlace" al `kind` del dataset; `Todos` no filtra. Labels presentables vía `categoryLabels` (Imagen → Imágenes, Enlace → Enlaces).
- Filtro por texto: case-insensitive sobre `title + summary + category`. Si no hay match, render del placeholder `laws-library__empty`.
- Cada entry es un `laws-entry` con grid `80px / 1fr`: thumb a la izquierda y body con título + fecha + acciones. Si la publicación tiene `thumbnail` se renderiza la imagen, sino un placeholder con el `kind` en uppercase. La entry entera vira a accent border en hover/focus-within.
- Acciones: `Preview` (abre en nueva pestaña con `target="_blank" rel="noreferrer"`) y `Descarga` (cuando hay `downloadHref`, usa el atributo `download` para forzar descarga). Botones con tamaño compacto (38px alto, 0.85rem) para que entren juntos en cards angostas.
- Scroll interno con `scrollbar-gutter: stable` y `padding-right: 0.7rem` para separar el thumb del scrollbar.
- `SiteShell.renderSection` agrega el `case 'leyes-y-otros'`.

### 2026-04-24 — Sección Distancias

- `DistanciasSection` con dos vistas según el ancho:
  - Desktop (`d-none d-md-block`): tabla nativa Bootstrap (`table table-dark align-middle`) con columnas No., Desde, Hasta y Km. El header usa `position: sticky; top: 0` para mantenerse visible mientras scrolleamos.
  - Mobile (`d-md-none`): lista compacta `distance-compact` con grid `44px / 1fr / 52px` por fila. La columna del medio combina el origen (strong) con la flecha y el destino (em) en dos líneas para no hacer scroll horizontal.
- Búsqueda libre con `useState` + `useDeferredValue`, filtra sobre `id + from + to + km` case-insensitive. El input renderiza un placeholder con comillas tipográficas para sugerir el alcance.
- Estado `activeId` para destacar una fila en mobile (toggle con click). En desktop se usa el resaltado nativo de la tabla.
- Placeholder "Sin resultados." cuando la búsqueda no matchea ninguna fila.
- Estilos:
  - `distance-table` con header sticky, padding generoso y alineación numérica a la derecha en la última columna.
  - `distance-compact__head` también sticky para que el encabezado de la lista mobile siga visible.
  - `distance-compact__row` con borde sutil que vira a accent en hover/focus/`is-active`. El número en accent blue por contraste.
  - Scroll vertical en ambas vistas con `scrollbar-gutter: stable`.
- `SiteShell.renderSection` agrega el `case 'distancias'`.
