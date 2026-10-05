import { dieselMetrics, dollarMetrics, informationSnapshot } from '../../../content/datasets/information';
import type { InfoMetric } from '../../../types/content';

// The dataset stores ISO (YYYY-MM-DD): machine state, and the only shape <time datetime>
// accepts. Display is dd/mm/yyyy. Split the string instead of building a Date so a
// timezone can never shift the day.
function formatDisplayDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

interface InformationGroupProps {
  id: string;
  title: string;
  isoDate: string;
  metrics: InfoMetric[];
}

// Each group carries the date of its own last successful scrape: dollar and diesel never
// shared a clock, so there is deliberately no panel-level date.
function InformationGroup({ id, title, isoDate, metrics }: InformationGroupProps) {
  const titleId = `information-${id}-title`;

  return (
    <section className="information-group" aria-labelledby={titleId}>
      <div className="information-group__head">
        <h3 id={titleId}>{title}</h3>
        <time className="information-group__date" dateTime={isoDate} aria-label={`Actualizado el ${formatDisplayDate(isoDate)}`}>
          {formatDisplayDate(isoDate)}
        </time>
      </div>
      <div className="information-rows">
        {metrics.map((item) => (
          <div className="information-row" key={item.label}>
            <span>{item.label}</span>
            <strong>Lps. {item.value.replace(/^L\s*/, '')}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export function InformacionSection() {
  return (
    <section className="section-stack section-stack--information">
      <header className="info-highlight">
        <span className="info-highlight__eyebrow">Precios</span>
        <span className="info-highlight__rule" aria-hidden="true" />
      </header>

      <div className="information-groups">
        <InformationGroup id="dollar" title="Dólar" isoDate={informationSnapshot.dollar.date} metrics={dollarMetrics} />
        <InformationGroup id="diesel" title="Diésel" isoDate={informationSnapshot.diesel.date} metrics={dieselMetrics} />
      </div>
    </section>
  );
}
