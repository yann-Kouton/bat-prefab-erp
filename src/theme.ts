// Palette issue du logo BAT & PREFAB : bleu vif + jaune doré sur fond blanc.
// Le bleu des surfaces (en-têtes, boutons) est légèrement plus profond que le bleu du logo (#0F75F3)
// pour garder un texte blanc lisible (contraste ≥ 5:1).
export const colors = {
  brand: '#0B66E4', // bleu BAT & PREFAB : en-têtes, boutons, onglet actif
  brandLight: '#2C7FF0', // bleu du logo, pour accents et liens
  brandSoft: '#E3EEFE', // fond bleu très clair
  gold: '#F8B608', // jaune du logo : accent (fonds uniquement, jamais en texte sur blanc)
  goldSoft: '#FFF1C2',
  canvas: '#F3F6FB', // fond des écrans
  surface: '#FFFFFF',
  border: '#D7DFEA',
  text: '#12233F', // bleu nuit
  muted: '#5C6B82',
  success: '#1F8A4C',
  successSoft: '#DDF1E5',
  danger: '#C8372D',
  dangerSoft: '#F8DEDB',
  info: '#0B57C9',
  infoSoft: '#E3EEFE',
  warningText: '#6B4E00',
  neutralSoft: '#E4E9F1',
  onBrandMuted: 'rgba(255,255,255,0.85)', // texte secondaire sur fond bleu
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Rayons différenciés selon la hiérarchie
export const radius = { input: 8, card: 12, pill: 999 };

import { Platform } from 'react-native';

// Le logo est en empattements : on reprend un serif système pour les titres (aucun chargement de police).
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });

export const font = {
  title: { fontSize: 20, fontWeight: '700' as const },
  display: { fontSize: 22, fontWeight: '700' as const, fontFamily: serif },
  heading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15 },
  small: { fontSize: 13 },
};
