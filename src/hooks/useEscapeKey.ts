import { useEffect } from 'react';

export function useEscapeKey(callback: () => void, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [callback, enabled]);
}
