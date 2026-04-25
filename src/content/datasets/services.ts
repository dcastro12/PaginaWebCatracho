import type { ServiceGroup, ServiceItem } from '../../types/content';

const carnet: ServiceItem = {
  title: 'Emisión de carnet',
  description:
    'Identificación del motorista para facilitar gestiones operativas y respaldar el tránsito del vehículo en la región centroamericana.',
};

const calcomanias: ServiceItem = {
  title: 'Código aduanero y calcomanías',
  description:
    'Venta de calcomanías del Código Aduanero de Honduras y del Consejo Centroamericano de Transportes.',
};

const dara: ServiceItem = {
  title: 'Asesoría en DARA',
  description:
    'Acompañamiento para emisión de códigos nuevos, incremento o eliminación de unidades y actualización documental.',
};

const ihtt: ServiceItem = {
  title: 'Gestiones ante IHTT',
  description:
    'Soporte para permisos de explotación, certificados de operación, renovaciones e incorporación de unidades.',
};

const boletines: ServiceItem = {
  title: 'Circulares y boletines',
  description:
    'Difusión de información emitida por instituciones vinculadas al transporte, aduanas, puertos y regulación.',
};

const asistencia: ServiceItem = {
  title: 'Asistencia técnica y legal',
  description:
    'Orientación ante incidencias en tránsitos fiscales, accidentes y aplicación de tarifas de fletes terrestres.',
};

export const services: ServiceItem[] = [carnet, calcomanias, dara, ihtt, boletines, asistencia];

export const serviceGroups: ServiceGroup[] = [
  {
    id: 'tramites',
    label: 'Trámites y documentos',
    detailTitle: 'Emisión · renovación · actualización',
    items: [carnet, calcomanias],
  },
  {
    id: 'asesoria',
    label: 'Asesoría y soporte',
    detailTitle: 'Gestiones operativas',
    items: [dara, ihtt],
  },
  {
    id: 'comunicados',
    label: 'Comunicados',
    detailTitle: 'Circulares y boletines',
    items: [boletines],
  },
  {
    id: 'permisos',
    label: 'Permisos y asistencia',
    detailTitle: 'Cobertura técnica y legal',
    items: [asistencia],
  },
];
