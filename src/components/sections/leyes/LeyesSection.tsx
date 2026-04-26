import { useDeferredValue, useState } from 'react';
import { publicationCategories, publications } from '../../../content/datasets/publications';

const categoryToKind = {
  PDF: 'pdf',
  Imagen: 'image',
  Video: 'video',
  Enlace: 'link',
} as const;

const categoryLabels: Record<string, string> = {
  Todos: 'Todos',
  PDF: 'PDF',
  Imagen: 'Imágenes',
  Video: 'Video',
  Enlace: 'Enlaces',
};

export function LeyesSection() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const visibleItems = publications.filter((item) => {
    const matchesCategory =
      category === 'Todos' || item.kind === categoryToKind[category as keyof typeof categoryToKind];

    if (!matchesCategory) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return `${item.title} ${item.summary} ${item.category}`.toLowerCase().includes(normalizedQuery);
  });

  return (
    <section className="section-stack section-stack--laws">
      <div className="laws-toolbar">
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar..."
          aria-label="Buscar publicaciones"
        />

        <div className="filter-group" role="tablist" aria-label="Filtrar publicaciones">
          {publicationCategories.map((item) => (
            <button
              key={item}
              type="button"
              className={item === category ? 'filter-chip is-active' : 'filter-chip'}
              onClick={() => setCategory(item)}
              role="tab"
              aria-selected={item === category}
            >
              {categoryLabels[item] ?? item}
            </button>
          ))}
        </div>
      </div>

      <article className="laws-library">
        <div className="laws-library__list">
          {visibleItems.length === 0 ? (
            <p className="laws-library__empty">No hay resultados para esta búsqueda.</p>
          ) : (
            visibleItems.map((item) => (
              <article className="laws-entry" key={`${item.kind}-${item.title}`}>
                <div className="laws-entry__thumb" aria-hidden="true">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" />
                  ) : (
                    <span>{item.kind.toUpperCase()}</span>
                  )}
                </div>
                <div className="laws-entry__body">
                  <strong className="laws-entry__title">{item.title}</strong>
                  <span className="laws-entry__date">{item.dateLabel}</span>
                  <div className="laws-entry__actions">
                    <a
                      className="button-pill button-pill--primary"
                      href={item.previewHref}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Preview
                    </a>
                    {item.downloadHref ? (
                      <a
                        className="button-pill button-pill--secondary"
                        href={item.downloadHref}
                        download
                      >
                        Descarga
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </article>
    </section>
  );
}
