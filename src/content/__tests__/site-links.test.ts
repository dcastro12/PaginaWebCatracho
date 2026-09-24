import { describe, expect, it } from 'vitest';
import { sectionLinks } from '../config/site';
import type { SectionId } from '../../types/content';

// The SectionId union has no runtime representation, so it must be mirrored here
// as a literal array. TypeScript enforces that this mirror stays exhaustive: if a
// member is ever added to (or removed from) the SectionId union without updating
// this array, `allSectionIds` stops satisfying `readonly SectionId[]` in a way that
// breaks the exhaustiveness check below, and `npx tsc -b` fails.
const allSectionIds = [
  'historia',
  'mision-vision',
  'servicios',
  'requisitos',
  'informacion',
  'leyes-y-otros',
  'distancias',
  'contactenos',
] as const satisfies readonly SectionId[];

// Compile-time exhaustiveness guard: if SectionId gains a member that is not in
// `allSectionIds`, `[SectionId] extends [Covered]` becomes false and this type
// resolves to `never`, so assigning `true` below fails to compile — catching a
// missed union update before it ever reaches this test file. The tuple wrapping
// is required: without it, the conditional distributes over the SectionId union
// and a single missing member gets silently absorbed by the other `true` branches.
type AssertUnionIsCovered<Covered extends string> = [SectionId] extends [Covered] ? true : never;
const unionIsCovered: AssertUnionIsCovered<(typeof allSectionIds)[number]> = true;

describe('sectionLinks <-> SectionId union', () => {
  it('the exhaustiveness guard is satisfied (compile-time, asserted at runtime too)', () => {
    expect(unionIsCovered).toBe(true);
  });

  it('sectionLinks has no duplicate ids', () => {
    const ids = sectionLinks.map((link) => link.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every SectionId in the union has a matching sectionLinks entry', () => {
    const linkIds = new Set(sectionLinks.map((link) => link.id));
    for (const id of allSectionIds) {
      expect(linkIds.has(id), `missing sectionLinks entry for SectionId "${id}"`).toBe(true);
    }
  });

  it('every sectionLinks entry is a declared SectionId (no orphans)', () => {
    const declaredIds = new Set<string>(allSectionIds);
    for (const link of sectionLinks) {
      expect(declaredIds.has(link.id), `sectionLinks has an orphan id "${link.id}" not in SectionId`).toBe(true);
    }
  });

  it('sectionLinks and the SectionId union have the same cardinality (1:1, not just coverage)', () => {
    expect(sectionLinks.length).toBe(allSectionIds.length);
  });

  it('every sectionLinks entry has non-empty label, eyebrow and description', () => {
    for (const link of sectionLinks) {
      expect(link.label.trim().length, `empty label for "${link.id}"`).toBeGreaterThan(0);
      expect(link.eyebrow.trim().length, `empty eyebrow for "${link.id}"`).toBeGreaterThan(0);
      expect(link.description.trim().length, `empty description for "${link.id}"`).toBeGreaterThan(0);
    }
  });
});
