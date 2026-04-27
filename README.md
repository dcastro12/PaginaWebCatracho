# Web CATRACHO

Sitio institucional de la **Cámara de Transporte de Carga de Honduras** (CATRACHO). Reúne en una sola página la historia de la organización, su misión y visión, los servicios al gremio, los requisitos para afiliarse, información operativa (tipo de cambio del dólar, precios del diésel), publicaciones de leyes y decretos, una calculadora de distancias entre las principales ciudades de Honduras y los datos de contacto de la oficina.

**URL pública**: [https://catrachohn.com](https://catrachohn.com)

---

## Stack

- **React 19** + **TypeScript 5** — UI declarativa con tipado estricto.
- **Vite 7** — bundler y dev server.
- **Bootstrap 5** — capa de soporte para grid y utilidades únicamente. La identidad visual viene del CSS propio (`src/app/styles/`), no de las clases de Bootstrap.
- **Sharp** + **ffmpeg-static** — optimización de imágenes y video bajo demanda.
- **Cheerio** — parseo HTML para los scrapers de tipo de cambio y precios de combustibles.

## Comandos

```bash
npm install              # instalar dependencias
npm run dev              # servidor de desarrollo (http://localhost:5173)
npm run build            # build de producción (tsc -b && vite build)
npm run preview          # servir el build compilado para verificación local
npm run optimize:assets  # comprimir imágenes y video bajo demanda
npm run update:precios   # actualización manual del dataset de información
```

## Editar contenido

El proyecto separa estrictamente UI y contenido. **Nunca se debe escribir copy, datasets ni catálogos dentro de un componente.** Todo el contenido vive en `src/content/`:

| Archivo | Qué se edita |
|---|---|
| `src/content/config/site.ts` | Metadatos del sitio y orden de las 8 secciones del menú. |
| `src/content/editorial/history.ts` | Texto largo de la sección Historia. |
| `src/content/datasets/services.ts` | Trámites, asesoría, comunicados y permisos del panel Servicios. |
| `src/content/datasets/requirements.ts` | Documentos descargables del panel Requisitos. |
| `src/content/datasets/information.ts` | Tipo de cambio del dólar y precios del diésel. **Se actualiza solo vía cron — ver Mantenimiento.** |
| `src/content/datasets/publications.ts` | Leyes, decretos y comunicados institucionales. |
| `src/content/datasets/distances.ts` | Tabla de distancias entre ciudades de Honduras. |
| `src/content/datasets/contact.ts` | Teléfonos, correos y redes sociales. |

Para cambiar texto o agregar entradas: editar el archivo correspondiente, hacer commit, hacer push a `main`. El workflow de despliegue se encarga del resto.

Las tipos que rigen cada dataset están en `src/types/content.ts`. Si la edición requiere agregar campos nuevos, primero ampliar el tipo y luego el dataset.

## Mantenimiento

### Actualización automática del tipo de cambio y precios del diésel

`src/content/datasets/information.ts` se actualiza automáticamente todos los días a las **07:00 hora de Honduras** mediante el workflow `.github/workflows/update-precios.yml`. El script `scripts/update-precios.mjs` hace el trabajo:

1. Scrapea **Ficohsa** (`https://www.ficohsa.hn/tasas-de-cambio`) para obtener compra y venta del dólar.
2. Busca en `https://www.laprensa.hn/honduras` el artículo más reciente sobre precios de combustibles, lo abre y extrae los precios del diésel para Tegucigalpa y San Pedro Sula.
3. Reescribe `information.ts` con los valores nuevos y la fecha de actualización.
4. Si hay diferencias respecto al archivo previo, hace `git commit` + `git push` automáticamente al branch `main`.

Cada fuente se intenta de forma independiente: si Ficohsa falla pero La Prensa funciona, Compra/Venta queda con el último valor conocido y el diésel sí se actualiza. Solo si **ambas** fuentes fallan el script sale con error y la Action lo reporta.

**Si una corrida falla** (notificación de GitHub Actions en rojo):

1. Abrir la pestaña Actions del repo y leer el log del job fallido.
2. Causa más probable: las páginas fuente cambiaron el HTML y los selectores quedaron rotos. Confirmar abriendo la URL del scraper manualmente en el navegador.
3. Para diagnosticar localmente: `node scripts/update-precios.mjs --dry-run`. El flag `--dry-run` corre todo el pipeline pero no escribe el archivo.
4. Ajustar selectores en `scripts/update-precios.mjs` (la sección `SOURCES` arriba del archivo concentra las URLs y patrones) y volver a probar.
5. Mientras se arregla, los valores anteriores se mantienen. El sitio no muestra fecha vieja sin advertir: el dataset incluye `updatedAt` que se renderiza en el panel de Información.

### Optimización de assets pesados

`npm run optimize:assets` recorre `src/assets/` y `public/media/` y comprime in-place imágenes (sharp) y video (ffmpeg) **solo si el resultado pesa menos** que el original. Es seguro correrlo después de agregar contenido nuevo. La rutina:

- JPEG → mozjpeg quality 78, progressive.
- PNG → compresión nivel 9, paleta indexada cuando aplica.
- Video → H.264 CRF 28 + AAC 96k, target ~2 Mbps.

PDFs no se tocan.

### Deploy

Ver `Docs/Deploy_Plesk.md` para el procedimiento completo. Resumen del flujo automático en operación:

1. Push a `main` (manual o vía bot de precios).
2. GitHub Action `deploy.yml` instala dependencias, hace `npm run build` y publica el contenido de `dist/` al branch `production` con force push.
3. Plesk (en modo Automatic) detecta el cambio en `production`, hace `git pull` y copia los archivos a `httpdocs/` preservando carpetas dinámicas (`carnet/`, `images/`).

Para forzar un deploy sin un commit nuevo: pestaña Actions del repo → workflow `Deploy a production` → Run workflow.

## Estructura del repo

```
PaginaWebCatracho/
├── .github/workflows/    # Actions: deploy.yml + update-precios.yml
├── Docs/
│   ├── Arquitectura.md   # Guía técnica para developer
│   └── Deploy_Plesk.md   # Procedimiento de despliegue
├── public/               # Assets servidos tal cual (web.config, documents/, media/)
├── scripts/              # Scrapers y optimizadores ejecutables con node
├── src/
│   ├── app/styles/       # tokens.css y globals.css
│   ├── assets/           # imágenes importadas por componentes
│   ├── components/       # layout, panels, sections
│   ├── content/          # datasets y editorial (la fuente de toda la copy)
│   ├── hooks/            # useHashPanelSync, useBodyScrollLock, useEscapeKey, useDocumentTitle
│   └── types/            # contratos compartidos (SectionId, ServiceItem, etc.)
└── WORKLOG.md            # bitácora cronológica de decisiones
```

## Arquitectura

El sitio es una **single-page institucional** con un hero principal y ocho paneles que abren como modales. No usa router porque toda la navegación es client-side vía hash. Para entender capas, contratos y convenciones, leer **`Docs/Arquitectura.md`**.

## Responsables

| Rol | Asignación |
|---|---|
| Mantenimiento técnico | _Pendiente de asignar._ |
| Mantenimiento editorial (publicaciones, requisitos, contacto) | _Pendiente de asignar._ |
