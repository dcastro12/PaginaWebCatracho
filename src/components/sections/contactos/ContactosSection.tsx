import { contactGroups } from '../../../content/datasets/contact';

function actionLabelFor(href: string): string {
  if (href.startsWith('tel:')) return 'Llamar';
  if (href.startsWith('mailto:')) return 'Email';
  return 'Abrir';
}

export function ContactosSection() {
  return (
    <section className="section-stack section-stack--contact">
      <div className="contact-sections">
        {contactGroups.map((group) => (
          <section className="contact-group" key={group.title}>
            <h3 className="contact-group__title">{group.title}</h3>
            <div className="contact-group__list">
              {group.items.map((item) => {
                const actionLabel = actionLabelFor(item.href);
                const buttonClass = 'button-pill button-pill--secondary';

                return (
                  <a
                    className="contact-entry"
                    href={item.href}
                    key={`${group.title}-${item.detail}`}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                  >
                    <div className="contact-entry__copy">
                      <strong>{item.detail}</strong>
                      <span>{item.label}</span>
                    </div>
                    <span className={buttonClass}>{actionLabel}</span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
