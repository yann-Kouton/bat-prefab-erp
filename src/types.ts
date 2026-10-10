export type Role = 'admin' | 'direction' | 'commercial' | 'chef_chantier' | 'comptable';
export type CountryCode = 'CI' | 'TG' | 'BF' | 'CM';
export type CurrencyCode = 'XOF' | 'XAF';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  country: CountryCode;
  active: boolean;
}

export type ClientType = 'entreprise' | 'particulier';
export type ClientStatus = 'prospect' | 'client' | 'inactif';

export interface Client {
  id: string;
  name: string;
  type: ClientType;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  country: CountryCode;
  status: ClientStatus;
  source?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface QuoteItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse';

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  projectTitle: string;
  country: CountryCode;
  currency: CurrencyCode;
  items: QuoteItem[];
  discountPct: number;
  vatPct: number;
  subtotal: number;
  discountAmount: number;
  netHT: number;
  vatAmount: number;
  totalTTC: number;
  status: QuoteStatus;
  validityDays: number;
  notes?: string;
  conditions?: string;
  projectId?: string;
  statusChangedAt?: unknown;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ProjectType = 'prefabrique' | 'modulaire' | 'batiment' | 'industriel' | 'autre';
export type ProjectStatus = 'etude' | 'planifie' | 'en_cours' | 'suspendu' | 'termine';

export interface Project {
  id: string;
  code: string;
  title: string;
  clientId: string;
  clientName: string;
  quoteId?: string;
  country: CountryCode;
  currency: CurrencyCode;
  location?: string;
  type: ProjectType;
  status: ProjectStatus;
  budget: number;
  progress: number; // 0 à 100
  startDate?: string; // AAAA-MM-JJ
  endDate?: string;
  managerName?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ProjectDocument {
  id: string;
  kind: 'photo';
  publicId: string;
  url: string;
  caption?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  createdAt?: unknown;
}
