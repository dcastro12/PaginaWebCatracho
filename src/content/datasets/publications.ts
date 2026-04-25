import type { PublicationItem } from '../../types/content';
import amigosCatracho from '../../assets/thumbnails/amigos-catracho.jpeg';
import catrachoAgentes from '../../assets/thumbnails/catracho-agentes.jpeg';
import amnistiaThumb from '../../assets/thumbnails/amnistia.jpeg';
import preciosNavierosThumb from '../../assets/thumbnails/precios-navieros.jpeg';
import comunicado2018Thumb from '../../assets/thumbnails/comunicado-2018.jpg';
import vacunaThumb from '../../assets/thumbnails/vacuna.jpg';
import climaGuateThumb from '../../assets/thumbnails/clima-guate.jpeg';

export const publicationCategories = ['Todos', 'PDF', 'Imagen', 'Video', 'Enlace'];

export const publications: PublicationItem[] = [
  {
    title: 'Acuerdo Ministerial PFI Agua Caliente',
    summary: 'Documento de referencia para horario temporal del puesto fronterizo integrado.',
    kind: 'pdf',
    category: 'PDF',
    dateLabel: '2020',
    previewHref: '/documents/leyes-y-otros/acuerdo-pfi-agua-caliente.pdf',
    downloadHref: '/documents/leyes-y-otros/acuerdo-pfi-agua-caliente.pdf',
  },
  {
    title: 'Decreto Seguro Carga 07 diciembre 2018',
    summary: 'Archivo normativo relacionado con seguridad y operación del transporte de carga.',
    kind: 'pdf',
    category: 'PDF',
    dateLabel: '2018',
    previewHref: '/documents/leyes-y-otros/decreto-seguro-carga-2018.pdf',
    downloadHref: '/documents/leyes-y-otros/decreto-seguro-carga-2018.pdf',
  },
  {
    title: 'Nueva Ley Terrestre de Honduras',
    summary: 'Documento legal disponible para consulta normativa y descarga directa.',
    kind: 'pdf',
    category: 'PDF',
    dateLabel: 'Archivo institucional',
    previewHref: '/documents/leyes-y-otros/ley-transporte-terrestre-honduras.pdf',
    downloadHref: '/documents/leyes-y-otros/ley-transporte-terrestre-honduras.pdf',
  },
  {
    title: 'Rutas Fiscales 1',
    summary: 'Documento de referencia para consulta operativa sobre rutas fiscales.',
    kind: 'pdf',
    category: 'PDF',
    dateLabel: 'Archivo institucional',
    previewHref: '/documents/leyes-y-otros/rutas-fiscales-1.pdf',
    downloadHref: '/documents/leyes-y-otros/rutas-fiscales-1.pdf',
  },
  {
    title: 'Rutas Fiscales 2',
    summary: 'Complemento documental para seguimiento de rutas fiscales y trazados de apoyo.',
    kind: 'pdf',
    category: 'PDF',
    dateLabel: 'Archivo institucional',
    previewHref: '/documents/leyes-y-otros/rutas-fiscales-2.pdf',
    downloadHref: '/documents/leyes-y-otros/rutas-fiscales-2.pdf',
  },
  {
    title: 'Amigos de CATRACHO',
    summary: 'Registro fotográfico institucional sobre actividades gremiales y relación con aliados.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: 'Archivo institucional',
    previewHref: amigosCatracho,
    thumbnail: amigosCatracho,
  },
  {
    title: 'CATRACHO, Agentes y Aduanas',
    summary: 'Material visual sobre coordinación regional con actores logístico-aduaneros.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: 'Archivo institucional',
    previewHref: catrachoAgentes,
    thumbnail: catrachoAgentes,
  },
  {
    title: '3 meses más de amnistía',
    summary: 'Pieza informativa sobre medidas de alivio y contexto operativo para el sector.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: '2018',
    previewHref: amnistiaThumb,
    thumbnail: amnistiaThumb,
  },
  {
    title: 'Precios navieras: fletes terrestres',
    summary: 'Comunicado visual sobre tarifas y referencia de fletes.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: '2018',
    previewHref: preciosNavierosThumb,
    thumbnail: preciosNavierosThumb,
  },
  {
    title: 'Comunicado 02/11/2018',
    summary: 'Aviso visual para consulta rápida dentro del catálogo documental.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: '2018',
    previewHref: comunicado2018Thumb,
    thumbnail: comunicado2018Thumb,
  },
  {
    title: 'Vacunas',
    summary: 'Material informativo visual de consulta para operaciones y personal del sector.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: 'Archivo institucional',
    previewHref: vacunaThumb,
    thumbnail: vacunaThumb,
  },
  {
    title: 'Modelo Climático Guatemala',
    summary: 'Recurso visual de referencia con interés operativo para el sector.',
    kind: 'image',
    category: 'Imagen',
    dateLabel: 'Archivo institucional',
    previewHref: climaGuateThumb,
    thumbnail: climaGuateThumb,
  },
  {
    title: 'Carretera Panamericana bloqueada',
    summary: 'Video informativo sobre afectaciones viales y contexto operativo en ruta.',
    kind: 'video',
    category: 'Video',
    dateLabel: 'Archivo institucional',
    previewHref: '/media/carretera-panamericana-bloqueada.mp4',
    downloadHref: '/media/carretera-panamericana-bloqueada.mp4',
  },
  {
    title: 'Asamblea General Ordinaria CIT en San Pedro Sula',
    summary: 'Enlace externo de referencia sobre actividad institucional y relación regional.',
    kind: 'link',
    category: 'Enlace',
    dateLabel: '2019',
    previewHref: 'https://hondudiario.com/2019/11/04/cit-celebra-xxxii-asamblea-general-ordinaria-en-sps/',
  },
];
