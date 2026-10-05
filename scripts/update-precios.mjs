#!/usr/bin/env node
/**
 * Actualiza src/content/datasets/information.ts con los valores vigentes de
 * tipo de cambio (Ficohsa) y precios de diésel (La Prensa, vía artículo
 * más reciente sobre combustibles publicado por la Secretaría de Energía).
 *
 * Uso:
 *   node scripts/update-precios.mjs            (escribe el archivo)
 *   node scripts/update-precios.mjs --dry-run  (solo imprime lo que haría)
 *
 * Cada fuente se intenta de forma independiente. Si una falla pero la otra
 * funciona, el grupo fallido conserva su último valor Y su fecha anterior:
 * nunca se sella con la fecha de hoy. La frescura es por grupo (dólar,
 * diésel) y significa "último scrape exitoso de ese grupo", no una fecha
 * compartida. Las fechas se guardan en formato ISO (YYYY-MM-DD) dentro de
 * informationSnapshot; la UI las formatea como dd/mm/yyyy. Un valor
 * conservado sin fecha de observación conocida no se republica.
 *
 * Motivo del cambio: incidente A (28/09/2026). La Prensa cambió su formato,
 * el parseo del diésel falló, el script conservó el valor viejo y aun así
 * actualizó la fecha a hoy: un valor desactualizado con fecha de frescura.
 * Si AMBAS fuentes fallan, el script sale con código != 0 y no toca el
 * archivo.
 *
 * Diésel: precio anunciado vs precio vigente. Los precios entran en vigencia
 * los lunes pero la prensa los anuncia desde el viernes. Cada parser de
 * scripts/precios/parsers.mjs lee del artículo la fecha de vigencia además de
 * los precios. Vigencia futura: se ignora el anuncio, el valor actual sigue y
 * su fecha avanza (el scrape fue exitoso). Vigencia de más de 14 días: se
 * leyó el artículo equivocado, bloqueo duro. Si ningún parser reconoce el
 * artículo (o no encuentra la vigencia) el diésel no se publica: no se adivina.
 */
import { run } from './precios/run.mjs';

run().catch((err) => {
  console.error('update-precios failed:', err.message);
  process.exit(1);
});
