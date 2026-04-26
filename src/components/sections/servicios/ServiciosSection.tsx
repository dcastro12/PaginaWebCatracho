import serviciosImage from '../../../assets/sections/servicios.jpg';
import { services } from '../../../content/datasets/services';

export function ServiciosSection() {
  return (
    <section className="section-stack section-stack--services">
      <img
        className="content-image content-image--banner"
        src={serviciosImage}
        alt="Imagen representativa de servicios de transporte de carga"
      />

      <article className="service-list-card">
        <ul className="service-list" role="list">
          {services.map((item) => (
            <li key={item.title} className="service-list__item">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}
