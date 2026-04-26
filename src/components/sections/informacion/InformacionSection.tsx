import { dieselMetrics, dollarMetrics, informationSnapshot } from '../../../content/datasets/information';

export function InformacionSection() {
  return (
    <section className="section-stack section-stack--information">
      <header className="info-highlight">
        <span className="info-highlight__eyebrow">Actualización:</span>
        <strong className="info-highlight__date">{informationSnapshot.updatedAt}</strong>
        <span className="info-highlight__rule" aria-hidden="true" />
      </header>

      <div className="information-groups">
        <section className="information-group">
          <h3>Precio del dólar</h3>
          <div className="information-rows">
            {dollarMetrics.map((item) => (
              <div className="information-row" key={item.label}>
                <span>{item.label}</span>
                <strong>Lps. {item.value.replace(/^L\s*/, '')}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="information-group">
          <h3>Precio del diésel</h3>
          <div className="information-rows">
            {dieselMetrics.map((item) => (
              <div className="information-row" key={item.label}>
                <span>{item.label}</span>
                <strong>Lps. {item.value.replace(/^L\s*/, '')}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
