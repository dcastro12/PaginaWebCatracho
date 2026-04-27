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

### 2026-04-24 — Sección Contactos

- `ContactosSection` mapea `contactGroups` (Teléfonos / Correos / Redes) y por cada entry renderiza un `<a>` que envuelve el copy (detail + label) y el botón de acción.
- Helper local `actionLabelFor(href)` decide el label del botón según el prefijo del href: `tel:` → "Llamar", `mailto:` → "Email", URL → "Abrir".
- Cuando el href arranca con `http`, agrega `target="_blank"` y `rel="noreferrer"` para que las redes abran en una nueva pestaña sin riesgo de window.opener.
- Botones uniformemente outline (`button-pill--secondary`); el accent blue lo pinta el estado hover/focus, no la jerarquía del item.
- Estilos:
  - `.contact-sections` flex 1 1 auto con scroll vertical, `scrollbar-gutter: stable` y `padding-right: 0.7rem` para separar el thumb del contenido.
  - `.contact-group__title` eyebrow uppercase con tracking 0.18em.
  - `.contact-entry` grid `1fr / auto`: copy a la izquierda, botón pegado a la derecha. Borde sutil que vira a accent en hover/focus-within.
  - `.contact-entry__copy strong` y `span` con `overflow-wrap: anywhere` para que emails largos como `presidencia@catrachohn.com` puedan envolver sin desbordar la card.
  - Botón con tamaño compacto fijo (108px min-width × 40px min-height) para que los tres tipos de acción se vean iguales independiente del label.
- `SiteShell.renderSection` agrega el `case 'contactenos'`. Con esto el switch cubre los 8 canonicals y el `default` queda como `null` (la unión de `SectionId` lo hace inalcanzable, pero TS lo exige).

### 2026-04-24 — Breakpoints desktop, laptop y tablet

- Tres bloques de media queries que afinan los tamaños del modal y de los elementos clave en cada rango:
  - **Desktop amplio (≥1440)**: queda el default. Modal 1320×960, banner Servicios 320–380px, tipografía en su escala máxima.
  - **Laptop mediano (992–1439)**: bloque `@media (min-width: 992px) and (max-width: 1439px)` con modal 1120×800 (90vw / 88dvh con cap), compact 720×560, panel body en 1rem y title en 1.2rem para que la tipografía no se sienta inflada en pantallas 1080p, banner Servicios 240–300px.
  - **Tablet (≤1199)**: hero-nav-bar pasa a `repeat(4, 1fr)` con border-radius 22px (en lugar de 999px) para que las 8 pills se acomoden en 2 filas de 4.
  - **Tablet (≤991)**: panel 94vw / 90dvh con cap 820. Hero card sin `min-height` impuesto. Requirements download grid colapsa a 1 columna. History layout pasa a 1 columna con `grid-template-rows: auto minmax(0, 1fr)` para que la imagen no se estire. Banner Historia con min-height 220 / max-height 260; banner Servicios con max-height 200.
- El bloque mobile (≤767) y el micro-tier (≤430) se atacan en G.2.

### 2026-04-24 — Mobile y micro-tier de phone chico

- **Mobile (≤767)**: bloque grande con todos los ajustes que necesita el sitio en pantallas chicas.
  - Backdrop swap: oculta el desktop y muestra `--mobile` (la versión cuadrada del hero se carga en H.1).
  - Hero: stage con `flex: 0 0 auto` + `padding: 3vh 0 1rem` para bajar la card unos pixels desde el top, y `hero-nav-band` con `margin-top: auto` + `margin-bottom: 0.5rem` para empujar el menú hacia abajo del viewport.
  - Hero card 340px de ancho, gap reducido, padding 1.3rem y h1 con tamaño fluido 1.25rem + tracking 0.16em. Logo 64px.
  - Hero-nav-bar pasa a grid 2×4 con bordes internos en lugar de border-radius global. Las cuatro pills de las esquinas reciben `border-top-left-radius`, `border-top-right-radius`, `border-bottom-left-radius` y `border-bottom-right-radius` para que el highlight respete la curva del contenedor cuando el usuario presiona una de ellas. `white-space: normal` deja que los labels largos envuelvan a 2 líneas.
  - Panel: overlay con padding chico y `align-items: stretch`. Frame 100% / 97dvh con cap 880, border-radius 16. Toolbar y body con padding reducido y tipografía adaptada (title 1.05rem, body 0.98rem).
  - Secciones: tipografía ajustada en cada bloque (history, statement-card, service-list, requirements, info, laws, contact). Botones de acción más compactos (laws 34px, contact 36px). Banners con `max-height` reducido (Historia 220, Servicios 180).
- **Phone chico (≤430)**: micro-tier que reduce un punto más la tipografía donde se siente apretada en pantallas tipo Samsung S22+ (~412px lógicos).
  - Panel body 0.92rem y title 1rem; statement-card / history-scroll / service-list span en 0.9rem; service-list strong en 0.78rem; info-highlight eyebrow 0.92rem y date 1.35rem; information-row 0.92/0.98rem.
- **Phone chiquito (≤479)**: container-xl con padding lateral reducido, hero card 100% width, hero-nav-pill 52px / 0.72rem, laws-entry con thumb 56px.
- Ya estaban resueltos en fases previas:
  - `overflow-wrap: anywhere` en filas de información y emails de contactos.
  - `flex-wrap: wrap` en filas de información para que valores largos puedan envolver.
  - `-webkit-tap-highlight-color: transparent` en hero-nav-pill (definido fuera de la media query, aplica siempre).

### 2026-04-26 — Hero responsive y crop mobile

- `hero-bg.jpg` (4791×3194, panorámica) colocada en `src/assets/hero/`. Importada por `SiteShell` para el backdrop desktop.
- `sharp` agregado como devDependency para procesamiento de imágenes en pipeline local.
- Script `scripts/crop-hero-mobile.mjs`: lee `hero-bg.jpg`, calcula el cuadrado más grande centrado (3194×3194), redimensiona a 1600×1600 con `withoutEnlargement: true` y exporta como `jpeg quality 82 progressive mozjpeg` a `src/assets/hero/hero-bg-mobile.jpg`. Una sola corrida deja la versión mobile lista.
- `SiteShell` ahora inyecta `backgroundImage` inline en cada backdrop: el desktop usa `hero-bg.jpg`, el mobile usa `hero-bg-mobile.jpg`. Cada uno con un `linear-gradient(180deg, ...)` superpuesto para oscurecer el cielo de la foto y mantener legibilidad del overlay.
- El switch entre los dos backdrops ya estaba configurado en G.2 vía media queries: `--desktop` se oculta y `--mobile` se muestra cuando el viewport baja de 768px.
- `object-position` por sección ya estaba aplicado: Historia con `10% center` (F.1) para enfocar las tres personas, Servicios con `center 58%` (F.3) para mostrar la ventanilla.
- El resto de assets ya se habían migrado durante el desarrollo: logo brand en D.2, thumbnails en C.3, PDFs y video en C.3, imágenes de Historia y Servicios en F.1 y F.3.

### 2026-04-26 — Optimización automática de imágenes y video

- `ffmpeg-static` agregado como devDependency. `sharp` ya estaba desde H.1.
- Script `scripts/optimize-assets.mjs` que recorre `src/assets/**/*.{jpg,jpeg,png}` y `public/media/**/*.mp4`:
  - Imagen JPG/JPEG: pipeline sharp con `rotate()` + `resize({ width: 1920, withoutEnlargement: true })` + `jpeg({ quality: 78, progressive: true, mozjpeg: true })`.
  - Imagen PNG: igual pero con `png({ compressionLevel: 9, palette: true })`.
  - Video MP4: ffmpeg con `libx264 preset slow CRF 28`, `pix_fmt yuv420p`, `movflags +faststart`, `aac 96k`.
  - Sólo sobrescribe el original si el resultado pesa menos. Loguea por archivo con bytes antes/después.
- Script `optimize:assets` registrado en `package.json`.
- Primera corrida deja los binarios mucho más livianos (totales `du -b`):
  - `carretera-panamericana-bloqueada.mp4`: 13.54 MB → 4.79 MB (-65%).
  - `precios-navieros.jpeg`: 1.45 MB → 624 KB (-57%).
  - `hero-bg.jpg`: 1.28 MB → 191 KB (-85%).
  - `servicios.jpg`: 1.10 MB → 184 KB (-83%).
  - `catracho-mark.png`: 481 KB → 184 KB (-62%).
  - 7 thumbnails restantes: reducciones entre -5% y -24%.
  - Total bundle de assets: ~18.5 MB → ~7.0 MB (-62%).
- `hero-bg-mobile.jpg` también cae de 250 KB a 231 KB porque la pipeline lo recorre, aunque venía de `crop-hero-mobile.mjs` ya bastante optimizado.

### 2026-04-26 — Scraper de dólar y diésel

- `cheerio` agregado como devDependency.
- Script `scripts/update-precios.mjs` con dos modos:
  - `node scripts/update-precios.mjs` reescribe `src/content/datasets/information.ts` si cambió algún valor.
  - `node scripts/update-precios.mjs --dry-run` imprime el archivo propuesto sin tocar disco. Útil para revisar selectores antes de pushear.
- Constante `SOURCES` agrupa las URLs y los selectores CSS de BCH (`pickBuy`, `pickSell` sobre la primera tabla de tipo de cambio) y de SEFIN (`pickSps`, `pickTegus` sobre las celdas de Diesel filtradas por ciudad). Si BCH o SEFIN cambian su markup, esta es la única zona que hay que tocar.
- Pipeline:
  - `fetch` con User-Agent identificable hacia las dos fuentes en paralelo (`Promise.all`).
  - Cheerio `load(html)` para parsear, selector dispara `parseNumber` que limpia caracteres no numéricos, normaliza separadores y devuelve un `Number` finito o tira excepción.
  - `formatLempira(n, decimals)` produce el formato `L X.XXXX` (4 decimales para dólar, 2 para diésel) consistente con el dataset.
  - `today()` construye `DD/MM/YYYY` para `informationSnapshot.updatedAt`.
- `buildFile()` arma el TypeScript completo del dataset preservando la forma exacta (imports, tipo `InfoMetric`, helpers con tilde "Por galón"). Si la salida es idéntica al archivo actual, no reescribe.
- Cualquier excepción (HTTP no-OK, selector vacío, valor no numérico) propaga al `main().catch` y sale con `process.exit(1)`. La GitHub Action en I.2 va a interpretar ese exit code como fallo y avisar.
- Script `update:precios` registrado en `package.json`.

### 2026-04-26 — Cron diario vía GitHub Actions

- Workflow `.github/workflows/update-precios.yml` con dos triggers:
  - `schedule: cron: '0 13 * * *'` — corre todos los días a las 13:00 UTC, que en horario de Honduras (UTC-6) es 07:00.
  - `workflow_dispatch` — permite dispararlo manualmente desde la pestaña Actions del repo. Útil para validar selectores o forzar una actualización inmediata.
- `permissions: contents: write` para que el `GITHUB_TOKEN` por defecto pueda hacer commit + push de cambios al repo.
- Steps: checkout, setup-node 20 con cache de npm, `npm ci`, `node scripts/update-precios.mjs`, y un step final que detecta diff sobre `src/content/datasets/information.ts` con `git status --porcelain` y, si hay cambio, configura un identidad `catracho-bot` y hace commit + push. Si no hay diff, imprime "Sin cambios." y sale 0.
- El conventional commit del bot es `chore(precios): actualización automática diaria` para dejar rastro claro en el historial sin mezclarse con el trabajo manual.
- Pendiente del lado de GitHub (manual una sola vez):
  1. **Settings → Actions → General → Workflow permissions** del repo: cambiar a "Read and write permissions" para que el GITHUB_TOKEN pueda pushear.
  2. **Validar selectores con un dispatch manual** desde la pestaña Actions antes de confiar en el cron diario. Si BCH o SEFIN devuelven HTML distinto al esperado, el script sale con código 1 y el log de Actions muestra qué selector se rompió.
- Pendiente del lado del host: cómo se entera Plesk de los cambios para servirlos en producción se decide en la fase J según la opción que soporte el subscription (Git Deployment integrado o GitHub Actions con SFTP).

### 2026-04-27 — Scraper reescrito: Ficohsa + La Prensa

- Las URLs originales (BCH `/tipo-de-cambio` y SEFIN `/precios-de-combustibles/`) no eran usables: BCH es SPA con datos AJAX y SEFIN ni siquiera responde 200. La fuente oficial de combustibles es SEN (`sen.hn`) pero publica los precios como imágenes, no como texto.
- Pipeline nuevo dividido por fuente:
  - **Dólar (Ficohsa)**: HTML estático con clases CSS estables (`.tipo-cambio__currency`, `.tipo-cambio__currency-title`, `.tipo-cambio__rate-line`, `.tipo-cambio__value`). Filtra el bloque cuyo título arranca con "Dólar" y toma Compra/Venta de las dos primeras `rate-line`.
  - **Diésel (La Prensa, en dos pasos)**:
    1. Fetch de la sección `https://www.laprensa.hn/honduras` y regex `\/(?:honduras|portada|economia)\/precios-combustibles-[a-z0-9-]+-[A-Z]{1,4}[0-9]+` para descubrir la URL del artículo más reciente. Eso resuelve que la URL cambia cada lunes.
    2. Fetch del artículo, parseo con cheerio: divide los párrafos por el `<h2>` cuyo texto contiene "Precios de los combustibles en San Pedro Sula" — antes = Tegucigalpa, después = SPS. En cada bloque busca la primera oración con "diésel" y extrae el último número con formato `\d{1,3}\.\d{2}` que esté entre 30 y 500 (descarta incrementos chicos como "1.29 lempiras" y se queda con el precio final como "L141.38").
- `readPrevious()` parsea el `information.ts` actual con regex y devuelve los valores existentes. Si Ficohsa falla pero La Prensa sí, queda Compra/Venta del archivo anterior y el resto se actualiza. Y al revés. Sólo si AMBAS fallan el script sale con `process.exit(1)` y la Action notifica.
- Logs claros: imprime URL del artículo descubierto, valores parseados y el `source` de cada métrica (`ficohsa | laprensa | previous`).
- Validación local con `--dry-run` contra los sitios reales: dólar Compra L 26.4600 / Venta L 26.5923, diésel Tegucigalpa L 141.38 / SPS L 136.35. Todo OK.

### 2026-04-27 — Configuración para deploy en Plesk (Windows + IIS, Plan B activado)

Inspección del subscription en Plesk: el host es Windows (drive `G:\PleskVhosts\catrachohn.com\`), corre IIS y **no tiene Node.js disponible** en la sección Herramientas de Desarrollo (sólo PHP 8.0.30 obsoleto, ASP.NET, Git y Composer). El build no puede correr en el server, así que adopto el Plan B: build en GitHub Actions, push del `dist/` a un branch dedicado, Plesk solo hace `git pull` + copia.

- `.github/workflows/deploy.yml` — workflow nuevo. Trigger: `push` a `main` + `workflow_dispatch`. Pasos: `actions/checkout@v5` + `actions/setup-node@v5` (Node 20), `npm ci`, `npm run build`, y un step final que entra a `dist/`, inicializa un repo git efímero y hace `git push --force` a un branch llamado `production`. Cada deploy reescribe `production` completo: el branch siempre tiene **solo el último build** y nada más, sin historia. Auth con `${{ secrets.GITHUB_TOKEN }}` que GitHub provee automáticamente para `permissions.contents: write`.

- `public/web.config` con tres bloques (queda en `public/` para que Vite lo copie tal cual a `dist/`):
  - **`<rewrite>`**: regla "SPA fallback" que reescribe cualquier request cuyo path no coincide con archivo o directorio existente hacia `/index.html`. Habilita deep-links (`/#historia`, `/#mision-vision`, etc.) y recargas de URLs profundas sin 404.
  - **`<staticContent>`**: mimeMaps explícitos para `webp`, `woff` y `woff2`. `clientCache` con `cacheControlMaxAge` de 1 año porque Vite fingerprintea cada asset.
  - **`<httpProtocol>`**: headers básicos de seguridad (`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`). Sin CSP estricto porque el sitio usa scripts inline mínimos del bundler.

- `Docs/Deploy_Plesk.md` reescrita para reflejar la realidad del host:
  1. Backup completo de `httpdocs/` antes de tocar nada.
  2. Verificación de SSL (cert "CATRACHO" subido pero sin asignar al dominio) y DNS (proxiado por Cloudflare en modo **Flexible** — habrá que pasarlo a Full strict post-deploy).
  3. Plesk Git apunta al branch **`production`** (no a `main`).
  4. Additional deploy actions usa **`robocopy`** con `/MIR /XD ... /XF ...` para sincronizar el repo a `httpdocs/` excluyendo carpetas dinámicas. Cierra con `if %ERRORLEVEL% LEQ 7 exit 0` porque robocopy devuelve 0-7 como éxitos pero Plesk los interpreta como fallo si no se traducen.
  5. Lista blanca de cosas que NUNCA se borran en deploys:
     - `httpdocs\carnet\` — 930 JPGs nombrados por DNI (la app de la oficina los sube).
     - `httpdocs\images\` — 63 archivos: PDFs de decretos, comunicados históricos, carpetas tipo "Diciembre 2024". Activa.
     - `httpdocs\.user.ini` — config PHP que gestiona Plesk solo.
  6. Plan SSL post-deploy: asignar cert en Plesk + cambiar Cloudflare a Full (strict).
  7. Smoke test cross-device incluye verificar que `https://catrachohn.com/carnet/<DNI>.jpg` y `https://catrachohn.com/images/<archivo>.pdf` siguen accesibles.

Hash legacy redirects: NO necesitan reglas de servidor. Como las rutas legacy (`#myv`, `#info`, `#noticias`, `#distancia`, `#contactos`) son hashes (client-side), el server siempre ve `/index.html` y `useHashPanelSync.legacyMap` ya hace el rewrite a los canónicos vía `history.replaceState`.

### 2026-04-27 — Primer deploy en producción + fix de mimeMap duplicates en IIS

Primer deploy ejecutado desde Plesk apuntando al branch `production` (creado por el workflow `deploy.yml`). Plesk hizo `git pull` correctamente, copió los archivos a `httpdocs/` y preservó por default `carnet/`, `images/` y `.user.ini` sin necesidad de configurar additional deploy actions (Plesk usa `git checkout` que es aditivo, no destructivo — confirmado en producción).

**Bug encontrado en el primer load**: IIS devolvía 500 "The page cannot be displayed because an internal server error has occurred." en cualquier ruta, incluso `https://catrachohn.com/index.html` directo. Diagnóstico:

- Renombrar `httpdocs/web.config` a `web.config.bak` -> el sitio cargó (sin SPA fallback funcionando, pero cargó). Eso aisló el problema al `web.config`.
- IIS shared en GoDaddy/Plesk tiene `webp`, `woff` y `woff2` ya definidos como mimeMaps a nivel server. Al redefinirlos en el `web.config` site-level, IIS rechazaba con 500.19 "Cannot add duplicate collection entry".

**Fix**: anteponer `<remove fileExtension="..." />` a cada `<mimeMap>` en `public/web.config`. El `<remove>` quita la entry heredada del server-level, y después la `<add>` (mimeMap) la reagrega. Sin colisión.

```xml
<staticContent>
  <remove fileExtension=".webp" />
  <mimeMap fileExtension=".webp" mimeType="image/webp" />
  <remove fileExtension=".woff" />
  <mimeMap fileExtension=".woff" mimeType="font/woff" />
  <remove fileExtension=".woff2" />
  <mimeMap fileExtension=".woff2" mimeType="font/woff2" />
  <clientCache cacheControlMode="UseMaxAge" cacheControlMaxAge="365.00:00:00" />
</staticContent>
```

Validado: el sitio carga, los modales abren, los assets fingerprint resuelven con el cache header largo, y `carnet/` + `images/` siguen accesibles via URL directa.

`Docs/Deploy_Plesk.md` actualizado con sección 10 "Troubleshooting" que documenta este síntoma específico para que no muerda en futuros despliegues a hosts shared.

### 2026-04-27 — Documentación final y cierre del proyecto (K.1)

Cierre formal de la fase de implementación. Consolidación de toda la documentación necesaria para que cualquiera que tome el proyecto entienda el estado, la arquitectura y los procedimientos operativos.

- **`README.md` reescrito** con tres capas de información: institucional (qué es CATRACHO, URL pública), técnica (stack, comandos, estructura del repo) y operativa (cómo editar contenido, cómo correr scripts de mantenimiento, qué hace el cron de precios y qué hacer si falla, deploy automático). Incluye sección "Responsables" con placeholder para que la organización asigne dueños técnico y editorial.

- **`Docs/Arquitectura.md` creado** como guía técnica para developers. Cubre: el layering Shell → Panel → Section, la separación estricta UI/contenido, el hash sync con mapa de redirects legacy, la animación con backdrop-filter diferido (60fps), el dual backdrop responsive, el pipeline de optimización de assets, el sistema de estilos (tokens + Bootstrap como soporte), y el flujo de datos dinámicos del cron. Documenta las decisiones técnicas que importan para mantener el proyecto sin desviarse de las reglas del diseño.

- **`Docs/Deploy_Plesk.md`** ya consolidado en la entrada anterior. No requiere cambios adicionales.

- **`WORKLOG.md`** revisado: las entradas cronológicas cubren todas las fases A-J + el deploy final + esta entrada de cierre. Sin huecos, sin duplicados.

#### Métricas finales del proyecto

| Métrica | Valor |
|---|---|
| Commits totales en `main` | 30 |
| Tamaño del bundle (`dist/`) | 15 MB total (incluye media y documents) |
| Bundle JS principal | 230 KB sin gzip |
| Bundle CSS principal | 256 KB sin gzip |
| Imágenes optimizadas | de ~18.5 MB a ~7 MB tras `optimize:assets` |
| Workflows automáticos | 2 (`update-precios.yml` cron diario + `deploy.yml` en cada push a `main`) |
| Hooks reutilizables extraídos | 4 (`useHashPanelSync`, `useBodyScrollLock`, `useEscapeKey`, `useDocumentTitle`) |
| Datasets de contenido | 7 + 1 editorial + 1 config |
| Secciones canónicas | 8 |
| Redirects de hashes legacy | 5 (`myv`, `info`, `noticias`, `distancia`, `contactos`) |

Pendiente (fuera del scope técnico):

- Asignar el cert "CATRACHO" al dominio en Plesk → Configuración de hosting → Seguridad.
- Cambiar Cloudflare SSL de **Flexible** a **Full (strict)** después de asignar el cert.
- Pasar Plesk Git de modo Manual a Automatic una vez validado el ciclo end-to-end.
- Limpieza opcional de carpetas legacy 2018 en `httpdocs/` (`demo-files/`, `icomoon/`, `picture_library/`, `jic.zip`) — no rompen nada, solo ocupan disco.
- Asignar responsables (técnico + editorial) en la sección Responsables del README.
- Compartir la URL pública con el equipo de CATRACHO.
