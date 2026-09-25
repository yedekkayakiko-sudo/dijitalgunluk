import type { MascotTone, PrivacyLevel } from '@gunluk/core';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { kvGet, kvSet } from './db';

export interface Settings {
  onboarded: boolean;
  userName: string;
  mascotName: string;
  tone: MascotTone;
  /** Master switch: when off, nothing is ever sent to the server. */
  aiEnabled: boolean;
  defaultPrivacy: PrivacyLevel;
  showMoodChart: boolean;
  serverUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  userName: '',
  mascotName: 'Pusula',
  tone: 'calm',
  aiEnabled: false,
  defaultPrivacy: 'ai_full',
  showMoodChart: false,
  serverUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
};

const KEY = 'settings';

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => void;
}

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const current = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    readSettings()
      .then((s) => {
        current.current = s;
        setSettings(s);
      })
      .finally(() => setReady(true));
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...current.current, ...patch };
    current.current = next;
    setSettings(next);
    await kvSet(KEY, JSON.stringify(next));
  }, []);

  const reset = useCallback(() => {
    current.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return <SettingsContext.Provider value={{ settings, ready, update, reset }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside SettingsProvider');
  return ctx;
}

/** Settings snapshot for non-React code (pipeline, api). */
export async function readSettings(): Promise<Settings> {
  const raw = await kvGet(KEY);
  return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS;
}
