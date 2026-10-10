import type {
  ClientStatus, ClientType, CountryCode, CurrencyCode, ExpenseCategory, InvoiceKind, MovementType, PaymentMethod,
  ProjectStatus, ProjectType, PurchaseStatus, QuoteStatus, Role, Weather,
} from '@/types';

export const COMPANY = {
  name: 'BAT & PREFAB',
  tagline: 'Bâtir Des Edifices Modernes',
  appSubtitle: 'Plateforme de gestion interne',
  email: 'contact@bat-prefab.com',
  phones: ['+225 05 56 12 13 39', '+225 27 21 39 97 17'],
  website: 'www.bat-prefab.com',
  headquarters: "Côte d'Ivoire",
  // À compléter : RCCM, compte contribuable, banque… (affiché en pied de devis si renseigné)
  legalLine: '',
};

export const COUNTRIES: Record<CountryCode, { label: string; currency: CurrencyCode; vat: number }> = {
  CI: { label: "Côte d'Ivoire", currency: 'XOF', vat: 18 },
  TG: { label: 'Togo', currency: 'XOF', vat: 18 },
  BF: { label: 'Burkina Faso', currency: 'XOF', vat: 18 },
  CM: { label: 'Cameroun', currency: 'XAF', vat: 19.25 },
};
export const COUNTRY_OPTIONS = (Object.keys(COUNTRIES) as CountryCode[]).map((v) => ({ value: v, label: COUNTRIES[v].label }));

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  direction: 'Direction',
  commercial: 'Commercial',
  chef_chantier: 'Chef de chantier',
  comptable: 'Comptable',
  magasinier: 'Magasinier',
};
export const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map((v) => ({ value: v, label: ROLE_LABELS[v] }));

export const CLIENT_TYPE_OPTIONS: { value: ClientType; label: string }[] = [
  { value: 'entreprise', label: 'Entreprise' },
  { value: 'particulier', label: 'Particulier' },
];
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  prospect: 'Prospect', client: 'Client', inactif: 'Inactif',
};
export const CLIENT_STATUS_OPTIONS = (Object.keys(CLIENT_STATUS_LABELS) as ClientStatus[]).map((v) => ({
  value: v, label: CLIENT_STATUS_LABELS[v],
}));
export const CLIENT_SOURCES = ['Site web', 'Recommandation', 'Appel d’offres', 'Réseaux sociaux', 'Autre'].map((v) => ({ value: v, label: v }));

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  etude: 'En étude', planifie: 'Planifié', en_cours: 'En cours', suspendu: 'Suspendu', termine: 'Terminé',
};
export const PROJECT_STATUS_OPTIONS = (Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map((v) => ({
  value: v, label: PROJECT_STATUS_LABELS[v],
}));
export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  prefabrique: 'Préfabriqué', modulaire: 'Modulaire', batiment: 'Bâtiment', industriel: 'Industriel', autre: 'Autre',
};
export const PROJECT_TYPE_OPTIONS = (Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]).map((v) => ({
  value: v, label: PROJECT_TYPE_LABELS[v],
}));

export const UNITS = ['u', 'm²', 'ml', 'm³', 'kg', 'forfait', 'jour'];

export const DEFAULT_CONDITIONS =
  'Conditions de paiement : à définir avec le client.\nDélai de réalisation : à confirmer à la commande.';

export const WEATHER_LABELS: Record<Weather, string> = { soleil: 'Soleil', nuageux: 'Nuageux', pluie: 'Pluie', orage: 'Orage' };
export const WEATHER_OPTIONS = (Object.keys(WEATHER_LABELS) as Weather[]).map((v) => ({ value: v, label: WEATHER_LABELS[v] }));

export const EXPENSE_LABELS: Record<ExpenseCategory, string> = {
  materiaux: 'Matériaux', main_oeuvre: "Main-d'œuvre", sous_traitance: 'Sous-traitance',
  transport: 'Transport', location: 'Location engins', autre: 'Autre',
};
export const EXPENSE_OPTIONS = (Object.keys(EXPENSE_LABELS) as ExpenseCategory[]).map((v) => ({ value: v, label: EXPENSE_LABELS[v] }));

export const PRODUCT_CATEGORIES = ['Acier & profilés', 'Panneaux', 'Quincaillerie', 'Électricité', 'Plomberie', 'Climatisation', 'Peinture & finition', 'Autre']
  .map((v) => ({ value: v, label: v }));

export const MOVEMENT_LABELS: Record<MovementType, string> = { entree: 'Entrée', sortie: 'Sortie', ajustement: 'Ajustement' };

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  brouillon: 'Brouillon', commande: 'Commandé', recu: 'Reçu', annule: 'Annulé',
};

export const INVOICE_KIND_LABELS: Record<InvoiceKind, string> = {
  acompte: 'Acompte', situation: 'Situation de travaux', solde: 'Solde', complete: 'Facture complète',
};
export const INVOICE_KIND_OPTIONS = (Object.keys(INVOICE_KIND_LABELS) as InvoiceKind[]).map((v) => ({ value: v, label: INVOICE_KIND_LABELS[v] }));

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  virement: 'Virement', especes: 'Espèces', cheque: 'Chèque', mobile_money: 'Mobile Money',
};
export const PAYMENT_OPTIONS = (Object.keys(PAYMENT_LABELS) as PaymentMethod[]).map((v) => ({ value: v, label: PAYMENT_LABELS[v] }));
