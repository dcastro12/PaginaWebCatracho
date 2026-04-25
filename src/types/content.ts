export type SectionId =
  | 'historia'
  | 'mision-vision'
  | 'servicios'
  | 'requisitos'
  | 'informacion'
  | 'leyes-y-otros'
  | 'distancias'
  | 'contactenos';

export interface SectionLink {
  id: SectionId;
  label: string;
  eyebrow: string;
  description: string;
}

export interface ServiceItem {
  title: string;
  description: string;
}

export interface ServiceGroup {
  id: string;
  label: string;
  detailTitle: string;
  items: ServiceItem[];
}

export interface RequirementDownload {
  title: string;
  href: string;
  format: string;
}

export interface RequirementCategory {
  title: string;
  items: string[];
}

export interface InfoMetric {
  label: string;
  value: string;
  helper: string;
}

export type PublicationKind = 'pdf' | 'image' | 'video' | 'link';

export interface PublicationItem {
  title: string;
  summary: string;
  kind: PublicationKind;
  category: string;
  dateLabel: string;
  previewHref: string;
  downloadHref?: string;
  thumbnail?: string;
}

export interface DistanceRow {
  id: number;
  from: string;
  to: string;
  km: number;
}

export interface ContactItem {
  label: string;
  href: string;
  detail: string;
}

export interface ContactGroup {
  title: string;
  items: ContactItem[];
}
