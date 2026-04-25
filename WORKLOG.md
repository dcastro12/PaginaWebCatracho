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
