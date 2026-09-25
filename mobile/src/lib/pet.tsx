import {
  ageOf, award, bondInfo, INITIAL_BOND, levelFor, migrateFromDrops, traitsFor,
  type Accessory, type Award, type BondEvent, type BondState, type Trait,
} from '@gunluk/core';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MascotLook } from '@/components/Mascot';
import { kvGet, kvSet, listEntities, listEntries } from './db';

/*
 * The bond with the mascot lives on the device, next to the diary. Any screen
 * can award a moment (a page, a goal check-in, a breath together); every
 * mascot on screen follows along.
 */

const KEY = 'bond';
const listeners = new Set<(s: BondState) => void>();

export async function loadBond(): Promise<BondState> {
  const raw = await kvGet(KEY);
  if (raw) return { ...INITIAL_BOND, ...(JSON.parse(raw) as Partial<BondState>) };
  // Coming from v0.3's water drops: keep every bit of growth.
  const old = await kvGet('pet');
  const s = old ? migrateFromDrops(JSON.parse(old)) : INITIAL_BOND;
  await kvSet(KEY, JSON.stringify(s));
  return s;
}

async function save(s: BondState): Promise<BondState> {
  await kvSet(KEY, JSON.stringify(s));
  listeners.forEach((l) => l(s));
  return s;
}

/** Records meaningful moments. Returns what was gained, and any level up. */
export async function awardBond(events: BondEvent[]): Promise<Award> {
  const r = award(await loadBond(), events);
  await save(r.state);
  return r;
}

export async function setAccessory(id: Accessory['id']): Promise<void> {
  await save({ ...(await loadBond()), accessory: id });
}

async function ackLevel(level: number): Promise<void> {
  const s = await loadBond();
  if (level > s.seenLevel) await save({ ...s, seenLevel: level });
}

export function describeBond(s: BondState, traits: Trait[], now = new Date()) {
  const info = bondInfo(s.xp);
  const age = ageOf(s.bornAt, now);
  const aged = (age?.years ?? 0) >= 1;
  const look: MascotLook = { form: info.form.id, accessory: s.accessory, prop: traits[0]?.glyph ?? null, aged };
  return { ...info, age, aged, look };
}

async function loadAll(): Promise<{ bond: BondState; traits: Trait[] }> {
  const [bond, entries, people, places] = await Promise.all([loadBond(), listEntries({ limit: 60 }), listEntities('person'), listEntities('place')]);
  return { bond, traits: traitsFor({ entries, distinctPeople: people.length, distinctPlaces: places.length }) };
}

// ---------- React context ----------

interface PetCtx {
  bond: BondState;
  traits: Trait[];
  info: ReturnType<typeof describeBond>;
  /** Reloads the bond and recomputes traits from the diary. */
  refresh: () => Promise<void>;
  /** A level the user has not seen celebrated yet. */
  pendingLevel: number | null;
  ackLevel: (level: number) => Promise<void>;
}

const PetContext = createContext<PetCtx | null>(null);

export function PetProvider({ children }: { children: ReactNode }) {
  const [bond, setBond] = useState<BondState>(INITIAL_BOND);
  const [traits, setTraits] = useState<Trait[]>([]);

  const apply = useCallback((r: Awaited<ReturnType<typeof loadAll>>) => {
    setBond(r.bond);
    setTraits(r.traits);
  }, []);
  const refresh = useCallback(() => loadAll().then(apply), [apply]);

  useEffect(() => {
    loadAll().then(apply).catch(() => {});
    listeners.add(setBond);
    return () => {
      listeners.delete(setBond);
    };
  }, [apply]);

  const info = useMemo(() => describeBond(bond, traits), [bond, traits]);
  const level = levelFor(bond.xp);
  const pendingLevel = level > bond.seenLevel ? level : null;

  return <PetContext.Provider value={{ bond, traits, info, refresh, pendingLevel, ackLevel }}>{children}</PetContext.Provider>;
}

export function usePet(): PetCtx {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error('usePet outside PetProvider');
  return ctx;
}
