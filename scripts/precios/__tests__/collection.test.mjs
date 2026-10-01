import { it, expect } from 'vitest';

// Guard against the vitest `include` glob silently dropping scripts tests:
// if this file is not collected, `npm test` would report green with zero
// scripts coverage. Its presence in the run count is the proof.
it('scripts tests are collected by vitest', () => {
  expect(import.meta.url).toMatch(/scripts\/precios\/__tests__\/collection\.test\.mjs$/);
});
