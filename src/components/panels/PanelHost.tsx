import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface PanelHostProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  compact?: boolean;
  children: ReactNode;
}

const EXIT_DURATION_MS = 200;
const BLUR_DELAY_MS = 240;

export function PanelHost({ title, isOpen, onClose, compact = false, children }: PanelHostProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [hasBlur, setHasBlur] = useState(false);

  useBodyScrollLock(isOpen);
  useEscapeKey(onClose, isOpen);
  useDocumentTitle(isOpen ? `${title} | CATRACHO` : null);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    setHasBlur(false);
    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!visible) return;
    panelRef.current?.focus();
    const timer = window.setTimeout(() => setHasBlur(true), BLUR_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!mounted) {
    return null;
  }

  const overlayClass = [
    'panel-overlay',
    visible ? 'is-open' : '',
    hasBlur ? 'has-blur' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const frameClass = [
    'panel-frame',
    compact ? 'panel-frame--compact' : '',
    visible ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={overlayClass}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className={frameClass}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="panel-frame__toolbar">
          <strong className="panel-frame__title">{title}</strong>
          <button className="panel-close" type="button" aria-label="Cerrar panel" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="panel-frame__body panel-frame__body--locked">{children}</div>
      </div>
    </div>
  );
}
