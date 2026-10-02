import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

// R1.2 intent: importing the modules must not fetch, write, or run main().
// The module split removes the need for an entrypoint guard: only the thin
// scripts/update-precios.mjs invokes run().
// Resolved from this file, not the working directory, so it holds wherever vitest runs.
const DATASET = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/content/datasets/information.ts',
);

describe('importing precios modules has no side effects', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not fetch, rewrite the dataset or touch process.exitCode', async () => {
    const fetchSpy = vi.fn(() => {
      throw new Error('fetch must not be called on import');
    });
    vi.stubGlobal('fetch', fetchSpy);
    const before = readFileSync(DATASET, 'utf8');
    const exitCodeBefore = process.exitCode;

    const mods = await Promise.all([
      import('../format.mjs'),
      import('../parsers.mjs'),
      import('../dataset.mjs'),
      import('../run.mjs'),
    ]);

    expect(typeof mods[3].run).toBe('function');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(readFileSync(DATASET, 'utf8')).toBe(before);
    expect(process.exitCode).toBe(exitCodeBefore);
  });
});
