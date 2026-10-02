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
 * compartida. Esta es la regla hacia adelante (se implementa en el slice 4
 * del cambio precios-scraper-hardening); hoy el código aún sella una única
 * fecha compartida.
 *
 * Motivo del cambio: incidente A (28/09/2026). La Prensa cambió su formato,
 * el parseo del diésel falló, el script conservó el valor viejo y aun así
 * actualizó la fecha a hoy: un valor desactualizado con fecha de frescura.
 * Si AMBAS fuentes fallan, el script sale con código != 0 y no toca el
 * archivo.
 */
import { run } from './precios/run.mjs';

run().catch((err) => {
  console.error('update-precios failed:', err.message);
  process.exit(1);
});
