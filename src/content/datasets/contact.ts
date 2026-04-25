import type { ContactGroup } from '../../types/content';

export const contactGroups: ContactGroup[] = [
  {
    title: 'Teléfonos',
    items: [
      {
        label: 'Celular',
        href: 'tel:+50499350588',
        detail: '(+504) 9935-0588',
      },
    ],
  },
  {
    title: 'Correos',
    items: [
      {
        label: 'Presidencia',
        href: 'mailto:presidencia@catrachohn.com',
        detail: 'presidencia@catrachohn.com',
      },
      {
        label: 'Administración',
        href: 'mailto:administracion@catrachohn.com',
        detail: 'administracion@catrachohn.com',
      },
      {
        label: 'Servicios',
        href: 'mailto:servicios@catrachohn.com',
        detail: 'servicios@catrachohn.com',
      },
    ],
  },
  {
    title: 'Redes',
    items: [
      {
        label: 'Facebook oficial',
        href: 'https://www.facebook.com/catracho.camaradetransporte',
        detail: 'facebook.com/catracho.camaradetransporte',
      },
    ],
  },
];
