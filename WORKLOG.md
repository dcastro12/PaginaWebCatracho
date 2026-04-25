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
