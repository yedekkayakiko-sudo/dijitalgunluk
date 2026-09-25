import { useColorScheme } from 'react-native';

const light = {
  bg: '#FBF7F0',
  card: '#FFFFFF',
  sunken: '#F3ECE1',
  text: '#2B2622',
  muted: '#7A7069',
  border: '#EAE2D6',
  accent: '#D9694A',
  accentText: '#FFFFFF',
  accentSoft: '#F7E1D8',
  mascot: '#8CC5C0',
  mascotShade: '#6FAEA8',
  danger: '#B3261E',
  dangerSoft: '#FBE4E1',
  mood: ['#9AA6B2', '#B7C1CC', '#E6D7B8', '#F2C27B', '#EE9A6A'],
};

export type Palette = typeof light;

const dark: Palette = {
  bg: '#1A1816',
  card: '#25221F',
  sunken: '#2F2B27',
  text: '#F2ECE4',
  muted: '#A89F95',
  border: '#3A342F',
  accent: '#EE8A6A',
  accentText: '#1A1816',
  accentSoft: '#3E2A22',
  mascot: '#7DB8B3',
  mascotShade: '#5E9E98',
  danger: '#F2B8B5',
  dangerSoft: '#44211F',
  mood: ['#5C6773', '#7A8591', '#A89C80', '#C99A55', '#D07A4E'],
};

export function useColors(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const serif = 'serif';

export const space = { xs: 4, s: 8, m: 16, l: 24, xl: 32 } as const;
