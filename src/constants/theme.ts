import { Platform } from 'react-native';

import '@/global.css';

export const palette = {
  bg: '#F7F3EC',
  paper: '#E7DCC8',
  ink: '#2C332E',
  palm: '#3E6B45',
  leaf: '#2F6B45',
  gold: '#C4A06A',
  clay: '#A33B3B',
  muted: '#7A7368',
  line: '#D9CDB8',
  mist: '#E4EFE4',
  warn: '#F6E7A1',
  dangerBg: '#F6D4D4',
  cream: '#F7F3EC',
  orange: '#F08C2E',
  tab: '#C4A574',
} as const;

export const font = {
  serif: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    web: 'Inter, "Segoe UI", system-ui, sans-serif',
    default: 'sans-serif',
  }) as string,
};

export const lift = {
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 3,
} as const;

export const tabBar = {
  backgroundColor: palette.tab,
  borderTopWidth: 0,
  marginHorizontal: 16,
  marginBottom: 12,
  height: 64,
  borderRadius: 28,
  paddingTop: 6,
  paddingBottom: 6,
  position: 'absolute' as const,
  shadowColor: palette.ink,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.16,
  shadowRadius: 16,
  elevation: 8,
};
