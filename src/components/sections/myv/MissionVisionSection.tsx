import { missionVision } from '../../../content/editorial/history';

export function MissionVisionSection() {
  return (
    <section className="section-stack section-stack--mission">
      <div className="mission-vision-stack">
        <article className="statement-card">
          <span className="statement-card__title">Misión</span>
          <p>{missionVision.mission}</p>
        </article>
        <article className="statement-card">
          <span className="statement-card__title">Visión</span>
          <p>{missionVision.vision}</p>
        </article>
      </div>
    </section>
  );
}
