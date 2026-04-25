import type { SectionId, SectionLink } from '../../types/content';

interface MainNavProps {
  links: SectionLink[];
  onSelect: (id: SectionId) => void;
  centered?: boolean;
  variant?: 'panel' | 'hero';
}

export function MainNav({ links, onSelect, centered = false, variant = 'panel' }: MainNavProps) {
  if (variant === 'hero') {
    return (
      <nav aria-label="Secciones principales" className="main-nav main-nav--hero">
        <div className="hero-nav-bar">
          {links.map((link) => (
            <button className="hero-nav-pill" type="button" key={link.id} onClick={() => onSelect(link.id)}>
              {link.label}
            </button>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Secciones principales" className={centered ? 'main-nav main-nav--centered' : 'main-nav'}>
      <div className="row g-2">
        {links.map((link) => (
          <div className="col-6 col-md-3" key={link.id}>
            <button
              className="nav-pill w-100"
              type="button"
              onClick={() => onSelect(link.id)}
            >
              <span className="nav-pill__eyebrow">{link.eyebrow}</span>
              <span className="nav-pill__label">{link.label}</span>
              <span className="nav-pill__description">{link.description}</span>
            </button>
          </div>
        ))}
      </div>
    </nav>
  );
}
