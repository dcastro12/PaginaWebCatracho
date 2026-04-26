import { useMemo } from 'react';
import { sectionLinks } from '../../content/config/site';
import type { SectionId } from '../../types/content';
import { useHashPanelSync } from '../../hooks/useHashPanelSync';
import { Footer } from './Footer';
import { Hero } from './Hero';
import { PanelHost } from '../panels/PanelHost';
import { HistoriaSection } from '../sections/historia/HistoriaSection';
import { MissionVisionSection } from '../sections/myv/MissionVisionSection';
import { ServiciosSection } from '../sections/servicios/ServiciosSection';
import { RequisitosSection } from '../sections/requisitos/RequisitosSection';
import { InformacionSection } from '../sections/informacion/InformacionSection';
import { LeyesSection } from '../sections/leyes/LeyesSection';
import { DistanciasSection } from '../sections/distancias/DistanciasSection';

const legacyHashMap: Readonly<Record<string, SectionId>> = {
  myv: 'mision-vision',
  info: 'informacion',
  noticias: 'leyes-y-otros',
  distancia: 'distancias',
  contactos: 'contactenos',
};

function renderSection(sectionId: SectionId) {
  switch (sectionId) {
    case 'historia':
      return <HistoriaSection />;
    case 'mision-vision':
      return <MissionVisionSection />;
    case 'servicios':
      return <ServiciosSection />;
    case 'requisitos':
      return <RequisitosSection />;
    case 'informacion':
      return <InformacionSection />;
    case 'leyes-y-otros':
      return <LeyesSection />;
    case 'distancias':
      return <DistanciasSection />;
    default:
      return (
        <section className="section-stack">
          <p>Sección «{sectionId}» pendiente de contenido.</p>
        </section>
      );
  }
}

export function SiteShell() {
  const validIds = useMemo(() => new Set<SectionId>(sectionLinks.map((link) => link.id)), []);
  const { activeId, open, close } = useHashPanelSync<SectionId>({ validIds, legacyMap: legacyHashMap });

  const currentSection = sectionLinks.find((link) => link.id === activeId) ?? null;

  return (
    <div className="site-root">
      <div className="site-backdrop site-backdrop--desktop" />
      <div className="site-backdrop site-backdrop--mobile" />
      <div className="site-vignette" />
      <div className="site-gradient site-gradient--one" />
      <div className="site-gradient site-gradient--two" />

      <Hero links={sectionLinks} onSelect={open} />
      <Footer />

      <PanelHost
        title={currentSection?.label ?? 'CATRACHO'}
        isOpen={Boolean(currentSection)}
        onClose={close}
        compact={activeId === 'mision-vision'}
      >
        {activeId ? renderSection(activeId) : null}
      </PanelHost>
    </div>
  );
}
