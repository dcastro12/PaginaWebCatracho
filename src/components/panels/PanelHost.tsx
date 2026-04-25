import { useEffect, useRef } from 'react';
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

export function PanelHost({ title, isOpen, onClose, compact = false, children }: PanelHostProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);
  useEscapeKey(onClose, isOpen);
  useDocumentTitle(isOpen ? `${title} | CATRACHO` : null);

  useEffect(() => {
    if (isOpen) panelRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const frameClass = compact ? 'panel-frame panel-frame--compact' : 'panel-frame';

  return (
    <div
      className="panel-overlay"
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
