import type {
  ClientStatus, ClientType, CountryCode, CurrencyCode, ProjectStatus, ProjectType, QuoteStatus, Role,
} from '@/types';

export const COMPANY = {
  name: 'BAT & PREFAB',
  tagline: 'Construction préfabriquée, modulaire et industrielle',
  email: 'contact@bat-prefab.com',
  phones: ['+225 05 56 12 13 39', '+225 27 21 39 97 17'],
  website: 'www.bat-prefab.com',
  headquarters: "Côte d'Ivoire",
  logoUrl: 'https://www.bat-prefab.com/logo-bat-prefab.png',
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
