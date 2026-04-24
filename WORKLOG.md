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
