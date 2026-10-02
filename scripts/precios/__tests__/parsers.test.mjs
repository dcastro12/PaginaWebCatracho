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

// Synthetic markup: only the structure parseLaPrensa selects on (.paragraph p, h2).
const article = (...blocks) =>
  `<html><body><div class="paragraph">${blocks.map((b) => `<p>${b}</p>`).join('')}</div></body></html>`;

describe('parseLaPrensa branch coverage (synthetic HTML)', () => {
  it('two-marker branch: each block runs from its marker to the next, in either order', () => {
    const spsFirst = article(
      'Precios en San Pedro Sula',
      'El diésel regular cuesta 140.10 lempiras.',
      'Precios en Tegucigalpa',
      'El diésel regular cuesta 150.20 lempiras.',
    );
    expect(parseLaPrensa(spsFirst)).toEqual({ sps: 140.1, tegus: 150.2 });

    const tegusFirst = article(
      'Precios en Tegucigalpa',
      'El diésel regular cuesta 150.20 lempiras.',
      'Precios en San Pedro Sula',
      'El diésel regular cuesta 140.10 lempiras.',
    );
    expect(parseLaPrensa(tegusFirst)).toEqual({ sps: 140.1, tegus: 150.2 });
  });

  // KNOWN-BAD PATH. This pins what the legacy SPS-only branch returns TODAY so
  // slice 3's rewrite has a reference point. It is not a statement that the
  // output is right: against the real 15/09 article this branch returned
  // sps=85.14, tegus=238.13, which is garbage. Do not "fix" it here.
  it('legacy SPS-only branch: pre-marker = tegus, post-marker = sps (known-bad, characterization only)', () => {
    const legacy = article(
      'El diésel regular cuesta 151.10 lempiras.',
      'Precios en San Pedro Sula',
      'El diésel regular cuesta 146.85 lempiras.',
    );
    expect(parseLaPrensa(legacy)).toEqual({ tegus: 151.1, sps: 146.85 });
  });

  // Same known-bad family: extractDieselPrice takes the LAST 30-500 number in the
  // first sentence mentioning diésel, so a trailing unrelated figure wins.
  it('two-marker branch: the heuristic takes the last in-range number of the diesel sentence (known-bad heuristic)', () => {
    const noisy = article(
      'Precios en San Pedro Sula',
      'El diésel regular cuesta 146.85 lempiras, frente a 85.14 de referencia.',
      'Precios en Tegucigalpa',
      'El diésel regular cuesta 151.10 lempiras.',
    );
    expect(parseLaPrensa(noisy).sps).toBe(85.14);
  });

  it('throws when a city block has no diesel price', () => {
    const noDiesel = article('Precios en Tegucigalpa', 'La gasolina súper cuesta 130.00 lempiras.');
    expect(() => parseLaPrensa(noDiesel)).toThrow(
      'La Prensa: precio de diésel para "Tegucigalpa" no encontrado.',
    );
  });
});
