import type { SectionLink } from '../../types/content';

export const siteMeta = {
  name: 'CATRACHO',
  fullName: 'Cámara de Transporte de Carga de Honduras',
  slogan: 'Servir al transporte de carga es nuestra prioridad',
  heroBadge: 'Organización gremial del transporte de carga en Honduras',
  heroSummary:
    'Acceso directo a información institucional, servicios, requisitos, referencias operativas, publicaciones y canales oficiales de contacto.',
  footer: 'CATRACHO | Cámara de Transporte de Carga de Honduras',
};

export const sectionLinks: SectionLink[] = [
  {
    id: 'historia',
    label: 'Historia',
    eyebrow: 'Institucional',
    description: 'Trayectoria, origen y momentos clave de la cámara.',
  },
  {
    id: 'mision-vision',
    label: 'Misión & Visión',
    eyebrow: 'Propósito',
    description: 'Marco institucional que orienta la organización.',
  },
  {
    id: 'servicios',
    label: 'Servicios',
    eyebrow: 'Soporte gremial',
    description: 'Asistencia operativa, técnica y documental.',
  },
  {
    id: 'requisitos',
    label: 'Requisitos',
    eyebrow: 'Afiliación',
    description: 'Documentos, descargas y pasos de incorporación.',
  },
  {
    id: 'informacion',
    label: 'Información',
    eyebrow: 'Actualización',
    description: 'Dólar, diésel y referencia operativa puntual.',
  },
  {
    id: 'leyes-y-otros',
    label: 'Leyes & Otros',
    eyebrow: 'Publicaciones',
    description: 'Catálogo de archivos, avisos y material de consulta.',
  },
  {
    id: 'distancias',
    label: 'Distancias',
    eyebrow: 'Consulta',
    description: 'Tabla de rutas, orígenes y kilometrajes.',
  },
  {
    id: 'contactenos',
    label: 'Contáctenos',
    eyebrow: 'Canales',
    description: 'Teléfonos, correos y redes oficiales.',
  },
];
