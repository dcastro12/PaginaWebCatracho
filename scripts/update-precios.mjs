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
 * funciona, los valores fallidos quedan con su último valor conocido y la
 * fecha sí se actualiza. Si AMBAS fallan, el script sale con código != 0
 * y no toca el archivo.
 */
import { run } from './precios/run.mjs';

run().catch((err) => {
  console.error('update-precios failed:', err.message);
  process.exit(1);
});
