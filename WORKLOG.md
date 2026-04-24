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
