import type { ClientStatus, ProjectStatus, PurchaseStatus, QuoteStatus } from '@/types';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const QUOTE_TONES: Record<QuoteStatus, Tone> = {
  brouillon: 'neutral', envoye: 'info', accepte: 'success', refuse: 'danger',
};
export const PROJECT_TONES: Record<ProjectStatus, Tone> = {
  etude: 'neutral', planifie: 'info', en_cours: 'warning', suspendu: 'danger', termine: 'success',
};
export const CLIENT_TONES: Record<ClientStatus, Tone> = {
  prospect: 'info', client: 'success', inactif: 'neutral',
};
export const PURCHASE_TONES: Record<PurchaseStatus, Tone> = {
  brouillon: 'neutral', commande: 'info', recu: 'success', annule: 'danger',
};

// État de règlement d'une facture (voir payState dans services/billing.ts)
export const PAY_TONES: Record<string, Tone> = {
  a_payer: 'info', partielle: 'warning', en_retard: 'danger', payee: 'success', annulee: 'neutral',
};
export const PAY_LABELS: Record<string, string> = {
  a_payer: 'À encaisser', partielle: 'Partiellement payée', en_retard: 'En retard', payee: 'Payée', annulee: 'Annulée',
};
