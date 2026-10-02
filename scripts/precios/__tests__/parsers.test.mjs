import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findLaPrensaArticlePath, parseFicohsa, parseLaPrensa } from '../parsers.mjs';

// Fixtures are byte-verbatim captures (see .gitattributes: -text).
// Resolved via fileURLToPath because `new URL(rel, import.meta.url)` is broken
// under the jsdom test environment.
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, '..', '__fixtures__', name), 'utf8');

describe('parseFicohsa', () => {
  it('reads compra/venta from the captured home page', () => {
    expect(parseFicohsa(fixture('ficohsa-home.html'))).toEqual({ buy: 26.8989, sell: 27.0334 });
  });

  it('throws when the exchange block is missing', () => {
    expect(() => parseFicohsa('<html></html>')).toThrow(
      'Ficohsa: bloque .values-uno no encontrado en la home.',
    );
  });

  it('throws when the block has no values', () => {
    expect(() => parseFicohsa('<div class="values-uno"></div>')).toThrow(
      'Ficohsa: valores de Compra/Venta no encontrados.',
    );
  });
});

describe('parseLaPrensa', () => {
  it('parses the single-marker format (28/09/2026 article)', () => {
    expect(parseLaPrensa(fixture('laprensa-single-marker-2026-09-28.html'))).toEqual({
      tegus: 153.53,
      sps: 149.2,
    });
  });

  it('throws when no city separator exists', () => {
    expect(() => parseLaPrensa('<html></html>')).toThrow(
      'La Prensa: ningún separador de ciudad encontrado.',
    );
  });
});

describe('findLaPrensaArticlePath', () => {
  it('finds the fuel article slug in the section page', () => {
    const html =
      '<a href="/economia/honduras-combustibles-suben-precios-lunes-28-de-septiembre-LH32173383">x</a>';
    expect(findLaPrensaArticlePath(html)).toBe(
      '/economia/honduras-combustibles-suben-precios-lunes-28-de-septiembre-LH32173383',
    );
  });

  it('throws when no article is listed', () => {
    expect(() => findLaPrensaArticlePath('<html></html>')).toThrow(
      'La Prensa: artículo de precios no encontrado en /economia.',
    );
  });
});
