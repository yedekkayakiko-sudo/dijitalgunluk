import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ageOf, dropsForEntry, earn, feed, growthFor, INITIAL_PET, type Entry, type PetState } from '@gunluk/core';
import { kvGet, kvSet } from './db';

/* The mascot's growth state lives on the device, next to the diary. */

const KEY = 'pet';

export async function loadPet(): Promise<PetState> {
  const raw = await kvGet(KEY);
  return raw ? { ...INITIAL_PET, ...(JSON.parse(raw) as Partial<PetState>) } : INITIAL_PET;
}

async function save(s: PetState): Promise<PetState> {
  await kvSet(KEY, JSON.stringify(s));
  return s;
}

/** Called once per newly saved page. */
export async function rewardEntry(entry: Pick<Entry, 'kind' | 'text' | 'photos' | 'createdAt'>): Promise<number> {
  const amount = dropsForEntry(entry);
  await save(earn(await loadPet(), amount, entry.createdAt));
  return amount;
}

/** Small rewards for other good moments (reviewing a goal, finishing a breathing round…). */
export async function grantDrops(amount: number): Promise<void> {
  await save(earn(await loadPet(), amount, new Date().toISOString()));
}

export async function feedOne(): Promise<{ state: PetState; grew: boolean }> {
  const r = feed(await loadPet(), new Date().toISOString());
  await save(r.state);
  return r;
}

export function describePet(s: PetState, now = new Date()) {
  const g = growthFor(s.xp);
  const age = ageOf(s.bornAt, now);
  return { ...g, age, aged: (age?.years ?? 0) >= 1 };
}

// ---------- React context: every mascot on screen shows the current stage ----------


interface PetCtx {
  pet: PetState;
  info: ReturnType<typeof describePet>;
  refresh: () => Promise<void>;
  /** Feeds one drop; returns whether the mascot reached a new stage. */
  feedDrop: () => Promise<boolean>;
}

const PetContext = createContext<PetCtx | null>(null);

export function PetProvider({ children }: { children: ReactNode }) {
  const [pet, setPet] = useState<PetState>(INITIAL_PET);
  const refresh = useCallback(async () => setPet(await loadPet()), []);
  useEffect(() => {
    loadPet().then(setPet);
  }, []);
  const feedDrop = useCallback(async () => {
    const r = await feedOne();
    setPet(r.state);
    return r.grew;
  }, []);
  return <PetContext.Provider value={{ pet, info: describePet(pet), refresh, feedDrop }}>{children}</PetContext.Provider>;
}

export function usePet(): PetCtx {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error('usePet outside PetProvider');
  return ctx;
}
