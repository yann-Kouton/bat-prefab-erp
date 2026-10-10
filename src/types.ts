export type Role = 'admin' | 'direction' | 'commercial' | 'chef_chantier' | 'comptable' | 'magasinier';
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

/* ------------------------------------------------------------ Chantier */

export type Weather = 'soleil' | 'nuageux' | 'pluie' | 'orage';

export interface DailyLog {
  id: string;
  date: string; // AAAA-MM-JJ
  weather: Weather;
  headcount: number;
  notes: string;
  issues?: string;
  authorName?: string;
  createdBy?: string;
  createdAt?: unknown;
}

export type ExpenseCategory = 'materiaux' | 'main_oeuvre' | 'sous_traitance' | 'transport' | 'location' | 'autre';

/** Photo ou justificatif hébergé sur Cloudinary. */
export interface Attachment {
  publicId: string;
  url: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  label: string;
  amount: number; // montant total TTC de la dépense
  quantity?: number | null;
  unit?: string;
  unitPrice?: number | null;
  supplierName?: string;
  invoiceNumber?: string;
  /** Déjà décaissé. Absent sur les anciennes dépenses : elles sont considérées comme entièrement payées. */
  paidAmount?: number;
  articlePhotos?: Attachment[]; // photos des articles achetés
  invoicePhotos?: Attachment[]; // photos de la facture / du reçu
  noInvoiceReason?: string; // renseigné quand il n'existe pas de facture
  notes?: string;
  authorName?: string;
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Mouvement de trésorerie d'un chantier : argent reçu (entrée) ou sorti (décaissement). */
export type CashflowType = 'entree' | 'decaissement';

export interface Cashflow {
  id: string;
  type: CashflowType;
  date: string;
  amount: number;
  method: PaymentMethod;
  label: string; // source de l'entrée ou objet du décaissement
  reference?: string;
  expenseId?: string; // décaissement qui règle une dépense
  expenseLabel?: string;
  proofPhotos?: Attachment[]; // reçu, bordereau, capture Mobile Money…
  authorName?: string;
  createdBy?: string;
  createdAt?: unknown;
}

/* ------------------------------------------------------------ Achats & stock */

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  country: CountryCode;
  notes?: string;
  createdAt?: unknown;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: string;
  unit: string;
  qty: number; // stock courant, modifié uniquement via un mouvement
  minQty: number; // seuil d'alerte
  lastCost?: number; // dernier prix d'achat unitaire
  createdAt?: unknown;
}

export type MovementType = 'entree' | 'sortie' | 'ajustement';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  qty: number; // toujours positif ; le sens vient du type (ajustement : signé)
  delta: number; // variation réelle appliquée au stock (+/-)
  balanceAfter: number;
  projectId?: string;
  projectCode?: string;
  purchaseOrderId?: string;
  reason?: string;
  createdBy?: string;
  authorName?: string;
  createdAt?: unknown;
}

export type PurchaseStatus = 'brouillon' | 'commande' | 'recu' | 'annule';

export interface PurchaseItem {
  id: string;
  productId?: string; // lié au catalogue => alimente le stock à la réception
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  supplierId: string;
  supplierName: string;
  projectId?: string;
  projectCode?: string;
  country: CountryCode;
  currency: CurrencyCode;
  items: PurchaseItem[];
  total: number; // HT
  status: PurchaseStatus;
  expectedDate?: string;
  notes?: string;
  receivedAt?: unknown;
  createdAt?: unknown;
}

/* ------------------------------------------------------------ Facturation */

export type InvoiceKind = 'acompte' | 'situation' | 'solde' | 'complete';
export type InvoiceStatus = 'emise' | 'annulee';
export type PaymentMethod = 'virement' | 'especes' | 'cheque' | 'mobile_money';

export interface Invoice {
  id: string;
  number: string;
  kind: InvoiceKind;
  label: string;
  quoteId: string;
  quoteNumber: string;
  projectId?: string;
  clientId: string;
  clientName: string;
  country: CountryCode;
  currency: CurrencyCode;
  netHT: number;
  vatPct: number;
  vatAmount: number;
  totalTTC: number;
  paidAmount: number; // somme des paiements, mise à jour avec chaque paiement
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt?: unknown;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  reference?: string;
  createdBy?: string;
  createdAt?: unknown;
}
