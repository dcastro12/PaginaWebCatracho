import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { requirementDownloads } from '../datasets/requirements';
import { publications } from '../datasets/publications';

// This is the highest-value test in the phase: it is the closest analogue in the
// source tree to the class of bug that caused the 2026-09-21 outage — a reference
// that looks fine in code/HTML but points at nothing on disk. It resolves every
// download URL declared in the content layer against the real `public/` folder and
// fails loudly if the file is missing, catching a broken link before it ships.

const PUBLIC_DIR = resolve(process.cwd(), 'public');

/** Only plain root-relative URLs served straight out of public/ are in scope here.
 * Imported thumbnails (bundled by Vite from src/assets) and external links
 * (kind: 'link') are out of scope — they are not references into public/. */
function isPublicRelativeUrl(value: string | undefined): value is string {
  return typeof value === 'string' && (value.startsWith('/documents/') || value.startsWith('/media/'));
}

function resolvePublicPath(url: string): string {
  const withoutQuery = url.split('?')[0]?.split('#')[0] ?? url;
  // url is root-relative ("/documents/..."); strip the leading slash before joining.
  return resolve(PUBLIC_DIR, withoutQuery.replace(/^\//, ''));
}

describe('requirement downloads resolve to real files under public/', () => {
  it('requirementDownloads is non-empty (a suite with nothing to check proves nothing)', () => {
    expect(requirementDownloads.length).toBeGreaterThan(0);
  });

  it('every requirementDownloads.href uses a public/-relative URL', () => {
    for (const download of requirementDownloads) {
      expect(isPublicRelativeUrl(download.href), `"${download.title}" href is not under /documents/ or /media/: ${download.href}`).toBe(
        true,
      );
    }
  });

  it.each(requirementDownloads.map((d) => [d.title, d.href] as const))(
    '%s -> %s exists on disk',
    (_title, href) => {
      const resolved = resolvePublicPath(href);
      expect(existsSync(resolved), `missing file on disk: ${resolved} (declared href: ${href})`).toBe(true);
    },
  );
});

describe('publication download/preview links resolve to real files under public/', () => {
  const publicUrlsByTitle: Array<readonly [string, string]> = [];
  for (const pub of publications) {
    if (isPublicRelativeUrl(pub.previewHref)) publicUrlsByTitle.push([`${pub.title} (previewHref)`, pub.previewHref]);
    if (isPublicRelativeUrl(pub.downloadHref)) publicUrlsByTitle.push([`${pub.title} (downloadHref)`, pub.downloadHref]);
  }

  it('found at least one public/-relative publication URL to check', () => {
    // Guards against this suite silently checking zero files if the dataset ever
    // moves every reference to imported assets or external links.
    expect(publicUrlsByTitle.length).toBeGreaterThan(0);
  });

  it.each(publicUrlsByTitle)('%s -> %s exists on disk', (_label, url) => {
    const resolved = resolvePublicPath(url);
    expect(existsSync(resolved), `missing file on disk: ${resolved} (declared url: ${url})`).toBe(true);
  });
});
