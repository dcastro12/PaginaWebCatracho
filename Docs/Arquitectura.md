# Guía de arquitectura

Documento técnico para developers que tocan el código. Resume las capas, contratos y decisiones de diseño que se aplicaron durante la implementación.

---

## 1. Layering Shell → Panel → Section

El producto es una **single-page institucional**: un hero principal con ocho paneles de contenido que abren como modales. No es una multi-page app y no usa router.

```
SiteShell  (estado global de qué sección está activa)
  ├─ Hero
  ├─ Footer
  └─ PanelHost  (infraestructura del modal: scroll lock, focus trap, ESC, animación)
        └─ <SectionId>Section  (presentación pura del contenido)
```

### SiteShell — `src/components/layout/SiteShell.tsx`

Único dueño del estado de sección activa. Rendea hero y footer estáticos, y un `PanelHost` que se monta/desmonta según haya una sección activa o no. Espeja la sección activa al hash de la URL para que `https://catrachohn.com/#historia` deep-linkee al modal correspondiente. Escucha `hashchange` para reaccionar a cambios externos (botón atrás, link copiado y pegado).

Toda transición de sección usa `startTransition` para que el cambio sea interrumpible y no bloquee el render del hero.

### PanelHost — `src/components/panels/PanelHost.tsx`

Infraestructura del modal. Se encarga de:

- Bloquear el scroll del `<body>` mientras hay panel abierto (hook `useBodyScrollLock`).
- Cerrar con la tecla Escape (hook `useEscapeKey`).
- Cerrar al hacer click fuera del frame.
- Actualizar `document.title` con el nombre de la sección activa y restaurarlo al cerrar (hook `useDocumentTitle`).
- Animación de aparición y blur del fondo (ver sección 4).

Las secciones **no** gestionan su propio open/close. Solo rendean contenido — el modal es responsabilidad del host.

### Sections — `src/components/sections/<id>/`

Una carpeta por sección. Cada sección exporta un componente `<Name>Section` que consume datos desde `src/content/` y produce JSX presentacional. Las ocho secciones canónicas son:

`historia`, `mision-vision`, `servicios`, `requisitos`, `informacion`, `leyes-y-otros`, `distancias`, `contactenos`.

Si se agrega una sección nueva o se renombra una existente hay que actualizar **tres lugares en este orden**:

1. `src/types/content.ts` → unión `SectionId`.
2. `src/content/config/site.ts` → array `sectionLinks`.
3. `src/components/layout/SiteShell.tsx` → switch `renderSection`.

---

## 2. Separación estricta UI ↔ contenido

Es la regla cardinal del proyecto. **Ninguna copy, dataset o catálogo debe vivir dentro de un componente.** El contenido vive en `src/content/`:

- `src/content/config/site.ts` — metadatos del sitio + el array canónico `sectionLinks`.
- `src/content/editorial/` — texto largo (ej. `history.ts`).
- `src/content/datasets/` — datos estructurados (servicios, requisitos, información, publicaciones, distancias, contacto).
- `src/types/content.ts` — los contratos. Cada dataset importa su tipo desde acá; las secciones lo usan para tipar props.

Para agregar contenido se edita el dataset, no el JSX. La sección lo lee y lo rendea sin tomar decisiones sobre el dato.

---

## 3. Hash sync y mapa de redirects legacy

La navegación es 100% client-side vía hash. El servidor siempre sirve `index.html`.

El hook **`useHashPanelSync`** (`src/hooks/useHashPanelSync.ts`) es el orquestador:

1. Lee `window.location.hash.slice(1)` y lo resuelve contra el set de `SectionId` válidos.
2. Si el hash coincide con una key del **mapa de hashes legacy**, lo reescribe vía `history.replaceState` al canónico antes de devolverlo.
3. Escucha `hashchange` para responder a navegación con botón atrás / adelante.
4. Expone `openSection(id)` y `closeSection()` con la salvedad de que cerrar usa `history.pushState` con `''` (no `location.hash = ''`, que dejaría un `#` huérfano en la URL).

### Mapa de hashes legacy

El sitio anterior usaba ids cortos. Para mantener compatibilidad con enlaces externos viejos, el hook reescribe estos hashes al canónico actual y los persiste en la URL:

| Legacy | Canónico |
|---|---|
| `#myv` | `#mision-vision` |
| `#info` | `#informacion` |
| `#noticias` | `#leyes-y-otros` |
| `#distancia` | `#distancias` |
| `#contactos` | `#contactenos` |

Como el rewrite es 100% client-side, **no requiere reglas de servidor**. Cualquier rewrite IIS sobre paths o hashes sería redundante.

---

## 4. Animación del panel con backdrop-filter diferido

El modal usa una animación pop con blur del fondo. La trampa: aplicar `backdrop-filter: blur(...)` durante la animación de entrada destruye el framerate (de 60fps a ~20fps en Chrome porque obliga a recomputar el blur en cada frame).

**La solución implementada** en `PanelHost`:

1. Estado interno con tres flags: `mounted`, `visible`, `hasBlur`.
2. Al abrir: `mounted=true` (DOM en el árbol), después `requestAnimationFrame` → `visible=true` (la transformación pop arranca, sin blur).
3. Después de **240ms** (`setTimeout`): `hasBlur=true` → la clase con `backdrop-filter` se agrega. La animación pop ya terminó, así que el blur aparece "puesto" sin afectar fps.
4. Al cerrar: el blur se quita instantáneamente (transición `step-end` en CSS), no se desvanece. La animación de salida queda nítida.

Es asimétrico a propósito: blur fade-in al abrir, blur step-out al cerrar.

---

## 5. Dual backdrop responsive

El hero tiene dos imágenes de fondo distintas:

- `hero-bg.jpg` — apaisada, encuadre desktop.
- `hero-bg-mobile.jpg` — cuadrada (1600×1600), generada con `scripts/crop-hero-mobile.mjs` extrayendo el máximo cuadrado del original.

El swap se hace por CSS media query. Ambas imágenes se importan en `SiteShell` con `import { url }` para que Vite las fingerprint y las incluya en el bundle. Los inline styles del hero referencian las URLs resueltas. El media query elige cuál mostrar según viewport.

La razón del crop dedicado: en mobile el encuadre apaisado deja al camión casi fuera del viewport útil. El crop cuadrado garantiza que el sujeto quede centrado independientemente del aspect ratio del dispositivo.

---

## 6. Pipeline de optimización de assets

`scripts/optimize-assets.mjs` se corre bajo demanda con `npm run optimize:assets`. Recorre `src/assets/` (imágenes importadas por componentes) y `public/media/` (heavy multimedia copiado tal cual al build).

- **Imágenes**: sharp con mozjpeg (JPEG quality 78 progressive) o PNG palette nivel 9. Si el resultado pesa más que el original, se descarta — el script nunca empeora.
- **Video**: ffmpeg con H.264 CRF 28 + AAC 96k. Target ~2 Mbps. Mismo guardrail de "solo escribir si el resultado es más liviano".
- **PDFs**: no se tocan. La compresión segura de PDFs requiere herramientas distintas y el upside es chico vs. el riesgo de romper layout o accesibilidad.

El script reporta el delta de tamaño por archivo y un total al final. Una sola corrida llevó el bundle de ~18.5MB a ~7MB.

---

## 7. Estilos

Dos capas en `src/app/styles/`:

- **`tokens.css`** — variables CSS (colores, tipografía, escalas mobile/desktop, radios, dimensiones de botón, headers de tabla, alturas de modal). Es la implementación del UIKit en CSS variables.
- **`globals.css`** — base styles + clases custom (`.site-root`, `.panel-overlay`, `.panel-frame`, `.hero-band`, etc.) construidas a partir de los tokens.

**Bootstrap es solo soporte** para grid (`.row`, `.col`) y utilidades puntuales (spacing, display). Las clases de componente de Bootstrap (`.btn-primary`, `.card`, `.modal`) **no se usan** porque sobrescribirían la identidad visual. Si se necesita un botón nuevo, se construye con clases propias usando los tokens.

---

## 8. Datos dinámicos: cron de precios

`src/content/datasets/information.ts` no se edita a mano en producción. Lo regenera el cron `update-precios.yml` desde Ficohsa (dólar) y La Prensa (diésel). El script tolera fallos parciales: si una fuente cae, el resto se actualiza con su valor previo. Solo si ambas fuentes fallan se aborta y se preserva el archivo.

Detalle del scraper: La Prensa publica los precios cada lunes en un artículo nuevo cuya URL cambia. El script resuelve esto en dos pasos: scrapea el índice `/honduras`, encuentra la URL del artículo más reciente vía regex sobre los slugs del CMS, y solo entonces parsea el artículo en sí.

---

## 9. Tooling y convenciones de repo

- **TypeScript estricto** (`tsconfig.app.json` extiende un base estricto). Antes de inventar tipos, revisar si ya existe en `src/types/content.ts`.
- **Sin router library**. La navegación es por hash + estado. No agregar `react-router` ni similar.
- **Un panel abierto a la vez**. Cerrar limpia el hash con `history.pushState`, no con `location.hash = ''`.
- **`startTransition` en SiteShell**. Mantenerlo al tocar el shell — habilita la interrupción del cambio de sección.
- **Conventional commits** sin atribuciones externas en el mensaje.
- **WORKLOG.md** se appendea con cada cambio no trivial. Es la bitácora de por qué se hicieron las cosas, no solo qué.
