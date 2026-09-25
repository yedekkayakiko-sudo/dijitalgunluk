import { useColorScheme } from 'react-native';

/*
 * A calm, grown-up palette: warm paper, ink and a deep green that echoes the
 * mascot's sprout. The mascot is the only cute thing on screen; everything
 * around it stays quiet so it can shine.
 */

const light = {
  bg: '#F6F3EE',
  card: '#FFFFFF',
  sunken: '#EEE9E1',
  text: '#211E1B',
  muted: '#6E6862',
  border: '#E4DED4',
  accent: '#2F6B5A',
  accentText: '#FFFFFF',
  accentSoft: '#E2EEE8',
  warm: '#F4E7DA',
  gold: '#C98F2B',
  mascot: '#BDE7DC',
  mascotShade: '#97D3C4',
  danger: '#B3261E',
  dangerSoft: '#FBE4E1',
  mood: ['#8E99A6', '#AAB6C2', '#D9CBAE', '#E9B872', '#E38F62'],
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#131615',
  card: '#1C201F',
  sunken: '#252A28',
  text: '#EDF1EE',
  muted: '#98A29E',
  border: '#2D3431',
  accent: '#7CC2A8',
  accentText: '#0E1311',
  accentSoft: '#1E3830',
  warm: '#2E2620',
  gold: '#E2B35A',
  mascot: '#9FD6C8',
  mascotShade: '#7DC0B0',
  danger: '#F2B8B5',
  dangerSoft: '#44211F',
  mood: ['#5C6773', '#7A8591', '#A89C80', '#C99A55', '#D07A4E'],
};

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const serif = 'serif';

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
