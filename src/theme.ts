// Palette inspirée du chantier : acier, béton, jaune d'engin.
export const colors = {
  steel: '#22313F',
  steelLight: '#33475A',
  concrete: '#ECEFF1',
  surface: '#FFFFFF',
  border: '#D5DBE0',
  text: '#17212B',
  muted: '#66737F',
  machine: '#F5B800', // jaune d'engin : accent (fonds uniquement, jamais en texte)
  machineSoft: '#FFF3C4',
  success: '#2F8F5B',
  successSoft: '#DDF1E5',
  danger: '#C8372D',
  dangerSoft: '#F8DEDB',
  info: '#2F6FA8',
  infoSoft: '#DCE9F5',
  neutralSoft: '#E3E7EA',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// Rayons différenciés selon la hiérarchie
export const radius = { input: 8, card: 12, pill: 999 };

export const font = {
  title: { fontSize: 20, fontWeight: '700' as const },
  heading: { fontSize: 16, fontWeight: '700' as const },
  body: { fontSize: 15 },
  small: { fontSize: 13 },
};
