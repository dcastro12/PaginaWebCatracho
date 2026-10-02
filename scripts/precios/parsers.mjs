import { load } from 'cheerio';
import { parseNumber } from './format.mjs';

export const SOURCES = {
  ficohsa: {
    // La home tiene el bloque "Cambio del día" con valores que se actualizan a diario.
    // La antigua /tasas-de-cambio quedó congelada y dejó de actualizarse.
    url: 'https://www.ficohsa.hn/',
  },
  laprensa: {
    // La sección Honduras dejó de listar el artículo semanal de combustibles
    // en mayo 2026; pasaron a publicarlo bajo /economia/.
    section: 'https://www.laprensa.hn/economia',
    // El slug cambió de "precios-combustibles-..." a "gasolinas-..."
    // (mayo 2026). Aceptamos ambas keywords para tolerar futuras variantes.
    articleSlug: /\/(?:honduras|portada|economia)\/[a-z0-9-]*(?:combustibles|gasolinas)[a-z0-9-]*-[A-Z]{1,4}[0-9]+/,
    // Separadores por ciudad. Tolera "Precios" o "Combustibles" como
    // primera palabra (varían entre publicaciones). El orden en que
    // aparezcan en el artículo no importa: la lógica de slicing los ordena.
    spsMarker: /(?:precios|combustibles)\s+en\s+san\s+pedro\s+sula/i,
    tegusMarker: /(?:precios|combustibles)\s+en\s+(?:tegucigalpa|la\s+capital)/i,
  },
};

export function parseFicohsa(html) {
  const $ = load(html);
  // El bloque "Cambio del día" en la home tiene un contenedor `.values-uno` para
  // dólar (activo por default) con dos spans diferenciables por clase del padre.
  const $dolarBlock = $('.values-uno').first();
  if ($dolarBlock.length === 0) throw new Error('Ficohsa: bloque .values-uno no encontrado en la home.');
  const buyText = $dolarBlock.find('.gff-indicadores-divisas-v1__buys-value.value-one').first().text().trim();
  const sellText = $dolarBlock.find('.gff-indicadores-divisas-v1__sale-value.value-one').first().text().trim();
  if (!buyText || !sellText) throw new Error('Ficohsa: valores de Compra/Venta no encontrados.');
  const buy = parseNumber(buyText);
  const sell = parseNumber(sellText);
  return { buy, sell };
}

function extractDieselPrice(text, label) {
  const sentences = text.split(/\.\s+|\n+/);
  for (const s of sentences) {
    if (!/di[eé]sel/i.test(s)) continue;
    const numbers = (s.match(/\d{1,3}\.\d{2}/g) || []).map((x) => parseFloat(x));
    const candidates = numbers.filter((n) => n > 30 && n < 500);
    if (candidates.length > 0) {
      return candidates[candidates.length - 1];
    }
  }
  throw new Error(`La Prensa: precio de diésel para "${label}" no encontrado.`);
}

export function findLaPrensaArticlePath(sectionHtml) {
  const m = sectionHtml.match(SOURCES.laprensa.articleSlug);
  if (!m) throw new Error('La Prensa: artículo de precios no encontrado en /economia.');
  return m[0];
}

export function parseLaPrensa(articleHtml) {
  const $ = load(articleHtml);

  const items = $('.paragraph p, h2.intertitle, h2').toArray();
  const spsIdx = items.findIndex((el) => SOURCES.laprensa.spsMarker.test($(el).text()));
  const tegusIdx = items.findIndex((el) => SOURCES.laprensa.tegusMarker.test($(el).text()));
  if (spsIdx === -1 && tegusIdx === -1) {
    throw new Error('La Prensa: ningún separador de ciudad encontrado.');
  }

  let tegusBlock;
  let spsBlock;
  if (tegusIdx === -1) {
    // Formato histórico: solo había marker SPS. Pre-SPS = Tegus, post-SPS = SPS.
    tegusBlock = items.slice(0, spsIdx);
    spsBlock = items.slice(spsIdx);
  } else if (spsIdx === -1) {
    // Desde el 28/09/2026 el artículo trae un único separador ("Precios en la
    // capital hondureña") y el bloque de San Pedro Sula queda antes, sin
    // encabezado propio. Pre-marker = SPS, post-marker = Tegus.
    spsBlock = items.slice(0, tegusIdx);
    tegusBlock = items.slice(tegusIdx);
  } else {
    // Formato actual: ambos markers presentes. Cada bloque va desde su marker
    // hasta el siguiente marker (sin importar el orden en que aparezcan).
    const ordered = [
      { city: 'sps', idx: spsIdx },
      { city: 'tegus', idx: tegusIdx },
    ].sort((a, b) => a.idx - b.idx);
    const blocks = {};
    for (let i = 0; i < ordered.length; i++) {
      const start = ordered[i].idx;
      const end = i + 1 < ordered.length ? ordered[i + 1].idx : items.length;
      blocks[ordered[i].city] = items.slice(start, end);
    }
    spsBlock = blocks.sps;
    tegusBlock = blocks.tegus;
  }

  const tegusText = tegusBlock.map((el) => $(el).text()).join(' ');
  const spsText = spsBlock.map((el) => $(el).text()).join(' ');

  const tegus = extractDieselPrice(tegusText, 'Tegucigalpa');
  const sps = extractDieselPrice(spsText, 'San Pedro Sula');
  return { tegus, sps };
}
