import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.resolve(process.cwd(), 'src/app/styles/globals.css'), 'utf8').replace(/\r\n/g, '\n');

// Body of the first rule whose selector list is exactly `selector`.
function ruleBody(selector: string): string | null {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  return match?.[1] ?? null;
}

describe('information panel styles', () => {
  // The global date has no correct value, so the rule is deleted, not demoted.
  it('has no .info-highlight__date rule anywhere, including the responsive overrides', () => {
    expect(css).not.toContain('info-highlight__date');
  });

  // With the date sharing the h3 row, a border on the h3 underlines only the heading
  // text and stops short of the date. It must sit on the wrapper.
  it('puts the heading border-bottom on the head wrapper, not on the h3', () => {
    const head = ruleBody('.information-group__head');
    const h3 = ruleBody('.information-group h3');
    expect(head, 'missing .information-group__head rule').not.toBeNull();
    expect(h3, 'missing .information-group h3 rule').not.toBeNull();
    expect(head).toMatch(/border-bottom\s*:/);
    expect(h3).not.toMatch(/border-bottom\s*:/);
  });

  it('lays the head out as a right-aligned baseline row', () => {
    const head = ruleBody('.information-group__head') ?? '';
    expect(head).toMatch(/display\s*:\s*flex/);
    expect(head).toMatch(/justify-content\s*:\s*space-between/);
    expect(head).toMatch(/align-items\s*:\s*baseline/);
  });
});
