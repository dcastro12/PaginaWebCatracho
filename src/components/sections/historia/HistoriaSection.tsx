import historiaImage from '../../../assets/sections/historia.jpg';
import { historyIntro, historyParagraphs } from '../../../content/editorial/history';

export function HistoriaSection() {
  return (
    <section className="section-stack section-stack--history">
      <div className="history-layout">
        <div className="history-layout__media">
          <img
            className="content-image content-image--history"
            src={historiaImage}
            alt="Fotografía representativa de la historia de CATRACHO"
          />
        </div>
        <div className="history-layout__copy">
          <div className="history-scroll">
            <p className="history-lead">{historyIntro}</p>
            {historyParagraphs.map((paragraph) => (
              <p className="mb-0" key={paragraph}>
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
