import type { ClientStatus, ProjectStatus, QuoteStatus } from '@/types';

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
