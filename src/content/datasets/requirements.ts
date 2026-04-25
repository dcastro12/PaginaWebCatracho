import type { RequirementCategory, RequirementDownload } from '../../types/content';

export const requirementDownloads: RequirementDownload[] = [
  {
    title: 'Código de aduana - Comerciante Individual',
    href: '/documents/requisitos/codigo-aduana-comerciante-individual.doc',
    format: 'DOC',
  },
  {
    title: 'Código de aduana - Sociedad Mercantil',
    href: '/documents/requisitos/codigo-aduana-sociedad-mercantil.doc',
    format: 'DOC',
  },
  {
    title: 'Requisitos de incorporación a CATRACHO',
    href: '/documents/requisitos/incorporacion-catracho.doc',
    format: 'DOC',
  },
];

export const requirementCategories: RequirementCategory[] = [
  {
    title: 'Incorporación a CATRACHO',
    items: [
      'Copia de escritura de constitución como comerciante individual o sociedad mercantil.',
      'Copia del certificado de operación y permiso de explotación.',
      'Copia de la boleta de revisión de los vehículos.',
      'Copia de identidad y RTN numérico del representante y de la empresa.',
      'Copia de identidad y licencia de conducir del motorista.',
      'Copia de recibo de servicios públicos.',
      'Copia de antecedentes penales.',
      'Copia legible de la resolución e inscripción del código de aduana ante DARA.',
    ],
  },
];
