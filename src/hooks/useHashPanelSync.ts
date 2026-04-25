import { startTransition, useCallback, useEffect, useState } from 'react';

export interface UseHashPanelSyncOptions<TId extends string> {
  validIds: ReadonlySet<TId>;
  legacyMap?: Readonly<Record<string, TId>>;
}

export function useHashPanelSync<TId extends string>({ validIds, legacyMap }: UseHashPanelSyncOptions<TId>) {
  const resolve = useCallback((): TId | null => {
    if (typeof window === 'undefined') return null;
    const raw = window.location.hash.replace('#', '');
    if (!raw) return null;
    const canonical = legacyMap?.[raw];
    if (canonical) {
      window.history.replaceState({}, '', `#${canonical}`);
      return canonical;
    }
    return validIds.has(raw as TId) ? (raw as TId) : null;
  }, [legacyMap, validIds]);

  const [activeId, setActiveId] = useState<TId | null>(() => resolve());

  useEffect(() => {
    const onHashChange = () => {
      startTransition(() => setActiveId(resolve()));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [resolve]);

  const open = useCallback((id: TId) => {
    startTransition(() => {
      setActiveId(id);
      window.location.hash = id;
    });
  }, []);

  const close = useCallback(() => {
    startTransition(() => {
      setActiveId(null);
      const nextUrl = `${window.location.pathname}${window.location.search}`;
      window.history.pushState({}, '', nextUrl);
    });
  }, []);

  return { activeId, open, close };
}
