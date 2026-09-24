import { describe, expect, it } from 'vitest';
import { services, serviceGroups } from '../datasets/services';
import { requirementDownloads, requirementCategories } from '../datasets/requirements';
import { dollarMetrics, dieselMetrics } from '../datasets/information';
import { publications, publicationCategories } from '../datasets/publications';
import { distanceRows } from '../datasets/distances';
import { contactGroups } from '../datasets/contact';
import type { PublicationKind } from '../../types/content';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function expectNoDuplicateIds<T extends string | number>(ids: T[], label: string) {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  expect(Array.from(duplicates), `duplicate ids in ${label}: ${Array.from(duplicates).join(', ')}`).toEqual([]);
}

describe('services dataset', () => {
  it('every ServiceItem has non-empty title and description', () => {
    for (const item of services) {
      expect(isNonEmptyString(item.title), `empty title in services`).toBe(true);
      expect(isNonEmptyString(item.description), `empty description for "${item.title}"`).toBe(true);
    }
  });

  it('serviceGroups have no duplicate ids', () => {
    expectNoDuplicateIds(
      serviceGroups.map((group) => group.id),
      'serviceGroups',
    );
  });

  it('every ServiceGroup has non-empty id/label/detailTitle and at least one item', () => {
    for (const group of serviceGroups) {
      expect(isNonEmptyString(group.id), `empty id in serviceGroups`).toBe(true);
      expect(isNonEmptyString(group.label), `empty label for group "${group.id}"`).toBe(true);
      expect(isNonEmptyString(group.detailTitle), `empty detailTitle for group "${group.id}"`).toBe(true);
      expect(group.items.length, `group "${group.id}" has no items`).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(isNonEmptyString(item.title), `empty item title in group "${group.id}"`).toBe(true);
        expect(isNonEmptyString(item.description), `empty item description in group "${group.id}"`).toBe(true);
      }
    }
  });
});

describe('requirements dataset', () => {
  it('every RequirementDownload has non-empty title, href and format', () => {
    for (const download of requirementDownloads) {
      expect(isNonEmptyString(download.title), 'empty title in requirementDownloads').toBe(true);
      expect(isNonEmptyString(download.href), `empty href for "${download.title}"`).toBe(true);
      expect(isNonEmptyString(download.format), `empty format for "${download.title}"`).toBe(true);
    }
  });

  it('every RequirementCategory has a non-empty title and at least one non-empty item', () => {
    for (const category of requirementCategories) {
      expect(isNonEmptyString(category.title), 'empty title in requirementCategories').toBe(true);
      expect(category.items.length, `category "${category.title}" has no items`).toBeGreaterThan(0);
      for (const item of category.items) {
        expect(isNonEmptyString(item), `empty item in category "${category.title}"`).toBe(true);
      }
    }
  });
});

describe('information dataset', () => {
  it('dollarMetrics and dieselMetrics entries have non-empty label, value and helper', () => {
    for (const metric of [...dollarMetrics, ...dieselMetrics]) {
      expect(isNonEmptyString(metric.label), 'empty label in InfoMetric').toBe(true);
      expect(isNonEmptyString(metric.value), `empty value for "${metric.label}"`).toBe(true);
      expect(isNonEmptyString(metric.helper), `empty helper for "${metric.label}"`).toBe(true);
    }
  });
});

describe('publications dataset', () => {
  const validKinds: PublicationKind[] = ['pdf', 'image', 'video', 'link'];

  it('every PublicationItem has a kind from PublicationKind', () => {
    for (const pub of publications) {
      expect(validKinds, `invalid kind "${pub.kind}" for "${pub.title}"`).toContain(pub.kind);
    }
  });

  it('every PublicationItem has non-empty title, summary, dateLabel and previewHref', () => {
    for (const pub of publications) {
      expect(isNonEmptyString(pub.title), 'empty title in publications').toBe(true);
      expect(isNonEmptyString(pub.summary), `empty summary for "${pub.title}"`).toBe(true);
      expect(isNonEmptyString(pub.dateLabel), `empty dateLabel for "${pub.title}"`).toBe(true);
      expect(isNonEmptyString(pub.previewHref), `empty previewHref for "${pub.title}"`).toBe(true);
    }
  });

  it('every PublicationItem category is one of the declared publicationCategories', () => {
    // 'Todos' is the UI "all" filter option, not a real category any item should carry.
    const realCategories = publicationCategories.filter((category) => category !== 'Todos');
    for (const pub of publications) {
      expect(realCategories, `unknown category "${pub.category}" for "${pub.title}"`).toContain(pub.category);
    }
  });

  it('optional downloadHref/thumbnail, when present, are non-empty strings', () => {
    for (const pub of publications) {
      if (pub.downloadHref !== undefined) {
        expect(isNonEmptyString(pub.downloadHref), `blank downloadHref for "${pub.title}"`).toBe(true);
      }
      if (pub.thumbnail !== undefined) {
        expect(isNonEmptyString(pub.thumbnail), `blank thumbnail for "${pub.title}"`).toBe(true);
      }
    }
  });
});

describe('distances dataset', () => {
  it('distanceRows have no duplicate ids', () => {
    expectNoDuplicateIds(
      distanceRows.map((row) => row.id),
      'distanceRows',
    );
  });

  it('every DistanceRow has non-empty from/to and a positive finite km', () => {
    for (const row of distanceRows) {
      expect(isNonEmptyString(row.from), `empty "from" for row id ${row.id}`).toBe(true);
      expect(isNonEmptyString(row.to), `empty "to" for row id ${row.id}`).toBe(true);
      expect(Number.isFinite(row.km), `non-finite km for row id ${row.id}`).toBe(true);
      expect(row.km, `non-positive km for row id ${row.id}`).toBeGreaterThan(0);
    }
  });
});

describe('contact dataset', () => {
  it('every ContactGroup has a non-empty title and at least one item', () => {
    for (const group of contactGroups) {
      expect(isNonEmptyString(group.title), 'empty title in contactGroups').toBe(true);
      expect(group.items.length, `group "${group.title}" has no items`).toBeGreaterThan(0);
    }
  });

  it('every ContactItem has non-empty label, href and detail', () => {
    for (const group of contactGroups) {
      for (const item of group.items) {
        expect(isNonEmptyString(item.label), `empty label in group "${group.title}"`).toBe(true);
        expect(isNonEmptyString(item.href), `empty href for "${item.label}"`).toBe(true);
        expect(isNonEmptyString(item.detail), `empty detail for "${item.label}"`).toBe(true);
      }
    }
  });

  it('every ContactItem href uses a recognised scheme (tel:, mailto:, or http(s)://)', () => {
    for (const group of contactGroups) {
      for (const item of group.items) {
        const hasKnownScheme =
          item.href.startsWith('tel:') || item.href.startsWith('mailto:') || item.href.startsWith('http');
        expect(hasKnownScheme, `unrecognised href scheme "${item.href}" for "${item.label}"`).toBe(true);
      }
    }
  });
});
