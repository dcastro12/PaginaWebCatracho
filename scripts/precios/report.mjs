// Outcome decision for a scraper run. Pure: outcomes in, decision out.
//
// Exit convention (design 5.2): a run that wrote something publishable exits 0,
// even when degraded. A non-zero exit skips the workflow's `Commit if changed`
// step and would discard the good value. The job goes red through the final
// `Report degraded` step, driven by the `degraded` output. Only a run with
// nothing publishable exits 1 (and writes no file).

/** Annotation: the message to a human. Says nothing about the verdict. */
export function warningAnnotation(message) {
  return `::warning::${message}`;
}

/** Verdict on the run: lines for $GITHUB_OUTPUT. Only the degraded path uses this. */
export function githubOutputLines({ reason }) {
  return ['degraded=true', `degraded_reason=${reason}`];
}

/**
 * @param {{published: boolean, degradedReasons?: string[], advisories?: string[]}} input
 *   published: something publishable was produced (a group was written).
 *   degradedReasons: things that went wrong (stable vocabulary, e.g. source-failed:<x>).
 *   advisories: things an operator should know that are NOT a failure.
 */
export function decideOutcome({ published, degradedReasons = [], advisories = [] }) {
  if (!published) {
    // Nothing publishable: soft failure, no write. The commit step is skipped
    // by the non-zero exit, and there is nothing to commit anyway.
    return { exitCode: 1, write: false, degraded: false, reasons: degradedReasons, advisories };
  }
  return {
    exitCode: 0,
    write: true,
    degraded: degradedReasons.length > 0,
    reasons: degradedReasons,
    advisories,
  };
}

/**
 * Two independent code paths (design 5.2.1), deliberately not one helper with a flag:
 * annotations are messages; outputLines are the verdict. Advisories never reach the
 * verdict.
 */
export function renderReport(outcome) {
  const annotations = [...outcome.reasons, ...outcome.advisories].map(warningAnnotation);
  const outputLines = outcome.degraded ? githubOutputLines({ reason: outcome.reasons.join(',') }) : [];
  return { annotations, outputLines };
}
