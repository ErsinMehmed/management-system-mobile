export const colors = {
  // Primary accent
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#EEF2FF',

  // Backgrounds
  bg: '#F5F6FA',
  bgCard: '#FFFFFF',
  bgElevated: '#F0F1F7',
  bgInput: '#F7F8FC',

  // Text
  textPrimary: '#1C1C2E',
  textSecondary: '#52527A',
  textMuted: '#A0A0C0',
  textInverse: '#FFFFFF',

  // Status — нова
  new: '#6366F1',
  newBg: '#EEF2FF',
  newText: '#4F46E5',

  // Status — доставена
  delivered: '#16A34A',
  deliveredBg: '#F0FDF4',
  deliveredText: '#15803D',

  // Status — отказана
  rejected: '#DC2626',
  rejectedBg: '#FEF2F2',
  rejectedText: '#B91C1C',

  // Borders & dividers
  border: '#EBEBF5',
  divider: '#F0F0F8',

  // Shadows
  shadowColor: '#6366F1',
  shadowColorNeutral: '#000000',
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const gradients = {
  primary: ['#6366F1', '#8B5CF6'] as const,
  primarySoft: ['#EEF2FF', '#F5F3FF'] as const,
  card: ['#FFFFFF', '#F7F8FC'] as const,
};
