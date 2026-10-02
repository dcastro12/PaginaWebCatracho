import { describe, expect, it } from 'vitest';
import { decideOutcome, githubOutputLines, renderReport, warningAnnotation } from '../report.mjs';

describe('warningAnnotation', () => {
  it('formats a GitHub Actions warning annotation', () => {
    expect(warningAnnotation('algo pasó')).toBe('::warning::algo pasó');
  });
});

describe('githubOutputLines (degraded verdict)', () => {
  it('emits degraded=true and the reason', () => {
    expect(githubOutputLines({ reason: 'source-failed:laprensa' })).toEqual([
      'degraded=true',
      'degraded_reason=source-failed:laprensa',
    ]);
  });
});

describe('decideOutcome', () => {
  it('all fine: exit 0, not degraded, write', () => {
    expect(decideOutcome({ published: true })).toMatchObject({
      exitCode: 0,
      write: true,
      degraded: false,
      reasons: [],
    });
  });

  it('publishable + one degraded group: exit 0 and degraded', () => {
    expect(decideOutcome({ published: true, degradedReasons: ['source-failed:laprensa'] })).toMatchObject({
      exitCode: 0,
      write: true,
      degraded: true,
      reasons: ['source-failed:laprensa'],
    });
  });

  it('nothing publishable: exit 1 and no write', () => {
    expect(
      decideOutcome({ published: false, degradedReasons: ['source-failed:ficohsa', 'source-failed:laprensa'] }),
    ).toMatchObject({ exitCode: 1, write: false });
  });

  it('advisory only: exit 0, NOT degraded', () => {
    expect(decideOutcome({ published: true, advisories: ['override set but not needed'] })).toMatchObject({
      exitCode: 0,
      write: true,
      degraded: false,
      advisories: ['override set but not needed'],
    });
  });

  // GUARD: a publishable partial run must NEVER exit non-zero.
  // Spec R-W2 read literally ("any blocked group ... sets process.exitCode = 1")
  // would make the scraper step fail, which SKIPS `Commit if changed` (there is no
  // continue-on-error and no `if: always()` in the workflows). The good value would
  // be discarded: "publish what passed" becomes "publish nothing". The job turns red
  // through the final `Report degraded` step instead. Do not "fix" this to match
  // the literal R-W2 text.
  it('partial publish exits 0 and flags degraded', () => {
    const reasons = ['source-failed:ficohsa', 'blocked:diesel-tegus-gt-sps', 'stale-date-unknown:dollar'];
    for (const r of reasons) {
      const outcome = decideOutcome({ published: true, degradedReasons: [r] });
      expect(outcome.exitCode).toBe(0);
      expect(outcome.degraded).toBe(true);
    }
  });
});

describe('renderReport: two separate paths', () => {
  it('degraded path: annotation AND degraded outputs', () => {
    const out = renderReport(decideOutcome({ published: true, degradedReasons: ['source-failed:laprensa'] }));
    expect(out.annotations).toEqual(['::warning::source-failed:laprensa']);
    expect(out.outputLines).toEqual(['degraded=true', 'degraded_reason=source-failed:laprensa']);
  });

  it('degraded path joins several reasons', () => {
    const out = renderReport(
      decideOutcome({ published: true, degradedReasons: ['source-failed:laprensa', 'blocked:x'] }),
    );
    expect(out.outputLines).toContain('degraded_reason=source-failed:laprensa,blocked:x');
  });

  it('advisory path: annotation only, NO degraded key', () => {
    const out = renderReport(decideOutcome({ published: true, advisories: ['override presente, no necesario'] }));
    expect(out.annotations).toEqual(['::warning::override presente, no necesario']);
    expect(out.outputLines).toEqual([]);
  });

  it('nothing publishable: warning, no degraded output (the step fails by exit code)', () => {
    const out = renderReport(decideOutcome({ published: false, degradedReasons: ['source-failed:ficohsa'] }));
    expect(out.annotations).toEqual(['::warning::source-failed:ficohsa']);
    expect(out.outputLines).toEqual([]);
  });

  it('all fine: no annotation, no outputs', () => {
    expect(renderReport(decideOutcome({ published: true }))).toEqual({ annotations: [], outputLines: [] });
  });
});
