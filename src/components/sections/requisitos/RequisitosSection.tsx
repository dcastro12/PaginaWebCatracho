import { requirementCategories, requirementDownloads } from '../../../content/datasets/requirements';

export function RequisitosSection() {
  const topDownloads = requirementDownloads.slice(0, 2);
  const extraDownload = requirementDownloads[2];

  return (
    <section className="section-stack section-stack--requirements">
      <div className="requirements-group">
        <p className="requirements-group__title">Código de aduana:</p>
        <div className="requirements-download-grid">
          {topDownloads.map((download) => (
            <article className="requirements-download-card" key={download.title}>
              <div className="requirements-download-card__meta">
                <span>Requisitos para código de aduana:</span>
                <strong>{download.title.replace('Código de aduana - ', '')}</strong>
              </div>
              <a className="button-pill button-pill--primary" href={download.href} download>
                Descargar
              </a>
            </article>
          ))}
        </div>
      </div>

      {requirementCategories.map((category) => (
        <div className="requirements-group requirements-group--scroll" key={category.title}>
          <p className="requirements-group__title">{category.title}</p>
          <article className="requirements-list-shell">
            <ol className="requirements-list">
              {category.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </article>
        </div>
      ))}

      {extraDownload ? (
        <div className="requirements-footer">
          <a className="button-pill button-pill--secondary" href={extraDownload.href} download>
            Descargar documento completo
          </a>
        </div>
      ) : null}
    </section>
  );
}
