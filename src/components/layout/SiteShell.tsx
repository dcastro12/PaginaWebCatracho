import { useMemo } from 'react';
import { sectionLinks } from '../../content/config/site';
import type { SectionId } from '../../types/content';
import { useHashPanelSync } from '../../hooks/useHashPanelSync';
import { Footer } from './Footer';

const legacyHashMap: Readonly<Record<string, SectionId>> = {
  myv: 'mision-vision',
  info: 'informacion',
  noticias: 'leyes-y-otros',
  distancia: 'distancias',
  contactos: 'contactenos',
};

export function SiteShell() {
  const validIds = useMemo(() => new Set<SectionId>(sectionLinks.map((link) => link.id)), []);
  const { activeId } = useHashPanelSync<SectionId>({ validIds, legacyMap: legacyHashMap });

  void activeId;

  return (
    <div className="site-root">
      <div className="site-backdrop site-backdrop--desktop" />
      <div className="site-backdrop site-backdrop--mobile" />
      <div className="site-vignette" />
      <div className="site-gradient site-gradient--one" />
      <div className="site-gradient site-gradient--two" />

      <Footer />
    </div>
  );
}
