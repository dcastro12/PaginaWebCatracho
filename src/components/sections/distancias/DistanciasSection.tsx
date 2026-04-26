import { useDeferredValue, useState } from 'react';
import { distanceRows } from '../../../content/datasets/distances';

export function DistanciasSection() {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const visibleRows = distanceRows.filter((row) => {
    if (!normalizedQuery) {
      return true;
    }

    return `${row.id} ${row.from} ${row.to} ${row.km}`.toLowerCase().includes(normalizedQuery);
  });

  return (
    <section className="section-stack section-stack--distancias">
      <div className="distancias-toolbar">
        <input
          className="search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Buscar por "Desde" o "Hasta"...'
          aria-label="Buscar distancias"
        />
      </div>

      <article className="distance-table-card">
        <div className="table-responsive d-none d-md-block">
          <table className="table table-dark align-middle mb-0 distance-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Desde</th>
                <th>Hasta</th>
                <th>Km.</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={`${row.id}-${row.from}-${row.to}`}>
                  <td>{row.id}</td>
                  <td>{row.from}</td>
                  <td>{row.to}</td>
                  <td>{row.km}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="distance-compact d-md-none">
          <div className="distance-compact__head" role="row">
            <span role="columnheader">No.</span>
            <span role="columnheader">Desde &rarr; Hasta</span>
            <span role="columnheader">Km</span>
          </div>
          <ul className="distance-compact__list" role="list">
            {visibleRows.length === 0 ? (
              <li className="distance-compact__empty">Sin resultados.</li>
            ) : (
              visibleRows.map((row) => {
                const isActive = row.id === activeId;
                return (
                  <li key={`mobile-${row.id}-${row.from}-${row.to}`}>
                    <button
                      type="button"
                      className={isActive ? 'distance-compact__row is-active' : 'distance-compact__row'}
                      onClick={() => setActiveId(isActive ? null : row.id)}
                      aria-pressed={isActive}
                    >
                      <span className="distance-compact__num">{row.id}</span>
                      <span className="distance-compact__route">
                        <strong>{row.from}</strong>
                        <em>&rarr; {row.to}</em>
                      </span>
                      <span className="distance-compact__km">{row.km}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </article>
    </section>
  );
}
