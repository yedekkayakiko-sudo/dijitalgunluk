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
  /** Anonymous, aggregate usage counts (no text, no identifier). */
  analytics: boolean;
  /** Daily reminder time "HH:MM", or null when off. */
  reminderTime: string | null;
  /** KVKK: explicit consents given before AI can be enabled. */
  consent: { version: number; at: string; special: boolean; transfer: boolean } | null;
}

/** Bump when the consent texts change materially; users are asked again. */
export const CONSENT_VERSION = 1;

export const hasValidConsent = (s: Pick<Settings, 'consent'>) =>
  !!s.consent && s.consent.version === CONSENT_VERSION && s.consent.special && s.consent.transfer;

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  userName: '',
  mascotName: 'Pusula',
  tone: 'calm',
  aiEnabled: false,
  defaultPrivacy: 'ai_full',
  showMoodChart: false,
  serverUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  analytics: false,
  reminderTime: null,
  consent: null,
};

const KEY = 'settings';

interface Ctx {
  settings: Settings;
  ready: boolean;
  update: (patch: Partial<Settings>) => Promise<void>;
  reset: () => void;
  /** Re-reads settings from the database (after a backup restore). */
  reload: () => Promise<void>;
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

  const reload = useCallback(async () => {
    const s = await readSettings();
    current.current = s;
    setSettings(s);
  }, []);

  return <SettingsContext.Provider value={{ settings, ready, update, reset, reload }}>{children}</SettingsContext.Provider>;
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
