import type { SectionId, SectionLink } from '../../types/content';
import { MainNav } from '../navigation/MainNav';
import brandMark from '../../assets/brand/catracho-mark.png';
import { siteMeta } from '../../content/config/site';

interface HeroProps {
  links: SectionLink[];
  onSelect: (id: SectionId) => void;
}

export function Hero({ links, onSelect }: HeroProps) {
  return (
    <header className="hero-shell">
      <div className="hero-stage-wrap">
        <div className="container-xl position-relative">
          <div className="hero-stage">
            <div className="hero-card">
              <img className="hero-logo" src={brandMark} alt="Logo CATRACHO" />
              <h1>{siteMeta.name}</h1>
              <p className="hero-copy">{siteMeta.slogan}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-nav-band">
        <div className="container-xl">
          <MainNav links={links} onSelect={onSelect} variant="hero" />
        </div>
      </div>
    </header>
  );
}
