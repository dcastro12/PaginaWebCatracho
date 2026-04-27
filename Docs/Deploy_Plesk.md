# Deploy a Plesk (catrachohn.com)

Guia interna para conectar el repositorio con el subscription de Plesk + GoDaddy y dejar el deploy automatico funcionando. Hosting: **Windows + IIS** (drive `G:`). El subscription **no tiene Node.js**, asi que el build corre en GitHub Actions y Plesk solo copia los artefactos.

## Arquitectura del flujo

```
push a main
   |
   v
GitHub Action `deploy.yml`
   - npm ci
   - npm run build
   - force push de dist/ al branch `production`
   |
   v
Plesk Git (apunta a `production`)
   - git pull al directorio del repo
   - additional deploy actions: robocopy a httpdocs/ con exclusiones
   |
   v
httpdocs/ servido por IIS detras de Cloudflare
```

Plesk **nunca** ejecuta `npm`. Solo hace `git pull` + `robocopy`.

---

## 1. Backup del sitio actual

**Antes de tocar nada**, respaldar el contenido vivo de `httpdocs/`. Esto es critico porque adentro hay carpetas dinamicas que NO se reemplazan en deploys (ver seccion 4).

1. Plesk -> **File Manager** -> entrar al subscription `catrachohn.com`.
2. Seleccionar todo el contenido de `httpdocs/`:
   - Carpetas: `assets/`, `carnet/`, `demo-files/`, `icomoon/`, `images/`, `picture_library/`
   - Archivos: `index.html`, `jic.zip`, `web.config`, `.user.ini`
3. Click derecho -> **Archive** -> guardar como `httpdocs-legacy-2026-04-27.zip` en el directorio principal del subscription (NO dentro de `httpdocs/`).
4. Adicional: bajarlo por FTP/SFTP a la maquina local como segundo respaldo.

## 2. Verificar requisitos del subscription

- **Git disponible**: confirmado en Herramientas de Desarrollo.
- **SSL del dominio**: Plesk -> SSL/TLS Certificates. Hay un cert "CATRACHO" subido pero **no esta asignado al dominio** (columna "Usado" = 0). Despues del deploy, asignarlo desde Configuracion de hosting -> Seguridad.
- **DNS**: el dominio resuelve a IPs de Cloudflare (`172.67.206.39`, `104.21.90.233`). El sitio esta proxiado por Cloudflare. **Modo SSL actual de Cloudflare: Flexible**, lo que deja el trafico Cloudflare -> Plesk en HTTP plano. Despues del primer deploy exitoso pasarlo a **Full (strict)**.

## 3. Configurar Git Deployment

1. Plesk -> Subscription -> **Git** -> **Add Repository**.
2. **Remote Git hosting** -> URL del repo: `https://github.com/<usuario>/<repo>.git`.
3. **Server repository name**: `web-catracho` (queda en `G:\PleskVhosts\catrachohn.com\git\web-catracho\`).
4. **Deployment mode**: arrancar con **Manual** mientras se prueba. Pasar a **Automatic** despues del primer deploy exitoso.
5. **Branch**: `production` (NO `main`). Este branch lo crea automaticamente el workflow `.github/workflows/deploy.yml` despues del primer push a `main` y solo contiene el `dist/` ya buildeado.

## 4. Additional deploy actions (Windows + robocopy con exclusiones)

Una vez que Plesk clona el repo, este snippet sincroniza el contenido a `httpdocs/` preservando las carpetas dinamicas:

```cmd
robocopy "G:\PleskVhosts\catrachohn.com\git\web-catracho" "G:\PleskVhosts\catrachohn.com\httpdocs" /MIR /XD "G:\PleskVhosts\catrachohn.com\httpdocs\carnet" "G:\PleskVhosts\catrachohn.com\httpdocs\images" /XF ".user.ini" ".git"
if %ERRORLEVEL% LEQ 7 exit 0
exit %ERRORLEVEL%
```

### Que hace cada flag

| Flag | Efecto |
|------|--------|
| `/MIR` | Espeja la carpeta origen en destino. Borra del destino lo que no esta en origen. |
| `/XD <path>` | Excluye carpetas. Las que pongas ni se copian ni se borran. |
| `/XF <archivo>` | Excluye archivos puntuales del mirror. |
| `if %ERRORLEVEL% LEQ 7 exit 0` | Robocopy usa exit codes 0-7 como "exito con o sin cambios". Sin esto, Plesk marca el deploy como fallido aunque haya funcionado. |

### Que se preserva (lista blanca)

| Item | Por que |
|------|---------|
| `httpdocs\carnet\` | 930 JPGs de carnets/DNI de socios. App de la oficina sube acá. |
| `httpdocs\images\` | PDFs de decretos, comunicados historicos, archivos por mes (ej. "Diciembre 2024"). Alguien sigue subiendo. |
| `httpdocs\.user.ini` | Config PHP gestionada por Plesk. Si se borra, se rompe la conf del subscription. |

### Que se reemplaza

Todo lo demas: `index.html`, `web.config`, `assets/`, `documents/`, `media/`, etc. — esos vienen del `dist/` del sitio nuevo y se sobreescriben en cada deploy.

> **Importante**: si Plesk muestra que el deploy directory NO es `G:\PleskVhosts\catrachohn.com\git\web-catracho\` (puede variar segun la version de Plesk), reemplazar las rutas del snippet con las que figuren en la pantalla.

## 5. Primer deploy manual

1. Push del workflow + cambios al `main`.
2. Esperar que el GitHub Action `deploy.yml` termine en verde y que aparezca el branch `production` en el repo.
3. Plesk -> Git -> **Deploy now** (manual).
4. Mirar el log de deploy. Robocopy va a tirar codes 0-7; eso esta OK. El `if %ERRORLEVEL% LEQ 7 exit 0` lo traduce a exit 0.
5. Abrir `https://catrachohn.com` en el navegador. Verificar:
   - Carga la pagina (sin error 500/404).
   - El landing muestra el camion de fondo, la card CATRACHO y la nav band.
   - Click en cada una de las 8 pills abre el modal correspondiente.
   - Recargar `https://catrachohn.com/#historia` carga directo el modal de Historia (esto valida el SPA fallback del `web.config`).
   - Descargar un PDF de Leyes & Otros funciona.
   - El video de la Carretera Panamericana se reproduce.
   - **`https://catrachohn.com/carnet/<algun-DNI>.jpg` sigue cargando**. Si esto falla, robocopy borro la carpeta — restaurar del backup zip.

## 6. Asignar SSL y blindar Cloudflare

Solo despues del primer deploy verde:

1. Plesk -> Sitios web y dominios -> catrachohn.com -> **Configuracion de hosting** -> Seguridad -> asignar el cert "CATRACHO" (o renovar Let's Encrypt si vencio).
2. Cloudflare -> SSL/TLS -> **Configure** -> cambiar de **Flexible** a **Full (strict)**.
3. Esperar 1-2 minutos y reabrir `https://catrachohn.com`. Si tira error de cert, volver a Full normal y revisar el cert del origen.

## 7. Activar deploy automatico

Si todo OK:

- Plesk -> Git -> **Deployment mode** -> cambiar a **Automatic**.
- Cualquier push a `main` (incluido el del bot de precios) dispara: workflow `deploy.yml` -> branch `production` actualizado -> Plesk hace `git pull` + robocopy automaticamente.

## 8. Smoke test post-deploy

Probar desde varios dispositivos en redes distintas (datos moviles + Wi-Fi, no la red local):

| Item | OK |
|------|----|
| Landing en desktop 2K | |
| Landing en laptop 1080p | |
| Landing en mobile (iPhone, Samsung S22+, etc.) | |
| Apertura/cierre fluido de los 8 modales | |
| Deep-links: `/#historia`, `/#mision-vision`, `/#informacion`, `/#leyes-y-otros`, `/#distancias`, `/#contactenos` | |
| Hashes legacy: `/#myv` -> reescribe a `/#mision-vision`, `/#info` -> `/#informacion`, `/#noticias` -> `/#leyes-y-otros`, `/#distancia` -> `/#distancias`, `/#contactos` -> `/#contactenos` | |
| Descarga de los 5 PDFs de Leyes & Otros | |
| Descarga de los 3 DOCs de Requisitos | |
| Reproduccion del video MP4 | |
| Buscador de Distancias filtra correctamente | |
| Buscador y filter chips de Leyes funcionan | |
| Click en `tel:` abre el dialer en mobile | |
| Click en `mailto:` abre el cliente de mail | |
| `https://catrachohn.com/carnet/<DNI>.jpg` sigue accesible | |
| `https://catrachohn.com/images/<archivo>.pdf` sigue accesible | |

## 9. Cuando todo este validado

- WORKLOG: agregar entrada con la fecha del primer deploy exitoso y la URL publica.
- README -> seccion Mantenimiento: agregar el procedimiento corto ("para forzar un deploy: push a main, esperar el Action, esperar el pull de Plesk").
- Comunicar al equipo de CATRACHO la URL del nuevo sitio.
- Mover las tarjetas J.1 y J.2 a Done en Trello.
