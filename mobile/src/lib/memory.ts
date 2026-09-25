import { detectCrisis } from '@gunluk/core';
import { api } from './api';
import { kvGet, kvSet, listEntries, newId } from './db';

/*
 * "Pusula seni nasıl tanıyor": short notes the mascot keeps about the user,
 * distilled from full-analysis pages every few entries. They live only on the
 * device, are shown to the user, and every note can be edited or deleted.
 */

export type NoteCategory = 'kisi' | 'durum' | 'deger' | 'iyi_gelen' | 'an' | 'zorluk';

export const CATEGORY_LABELS: Record<NoteCategory, string> = {
  kisi: 'Hayatındaki insanlar',
  durum: 'Şu sıralar hayatında',
  deger: 'Değerlerin ve hayallerin',
  iyi_gelen: 'Sana iyi gelenler',
  an: 'Önemli anlar ve sözlerin',
  zorluk: 'Zorlandığın şeyler',
};

export interface MemoryNote {
  id: string;
  category: NoteCategory;
  text: string;
  /** Written by the user rather than the mascot: never overwritten by updates. */
  pinned?: boolean;
}

const KEY = 'memory-notes';
const CURSOR = 'memory-cursor';
/** Update after this many new analysable pages. */
const BATCH = 5;

export async function loadNotes(): Promise<MemoryNote[]> {
  return JSON.parse((await kvGet(KEY)) ?? '[]') as MemoryNote[];
}

export async function saveNotes(notes: MemoryNote[]): Promise<void> {
  await kvSet(KEY, JSON.stringify(notes.slice(0, 60)));
}

export async function noteTexts(): Promise<string[]> {
  return (await loadNotes()).map((n) => n.text).slice(0, 40);
}

export async function forgetAllNotes(): Promise<void> {
  await saveNotes([]);
  await kvSet(CURSOR, new Date().toISOString());
}

let running = false;

/** Called after saving a page; runs only every few pages, in the background. */
export async function maybeUpdateNotes(force = false): Promise<boolean> {
  if (running) return false;
  running = true;
  try {
    const cursor = (await kvGet(CURSOR)) ?? '1970-01-01T00:00:00.000Z';
    const fresh = (await listEntries({ from: cursor }))
      .filter((e) => e.privacy === 'ai_full' && e.kind === 'entry' && detectCrisis(e.text).level === 'none')
      .reverse();
    if (!fresh.length || (!force && fresh.length < BATCH)) return false;
    const pages = fresh.slice(-8);
    const notes = await loadNotes();
    const pinned = notes.filter((n) => n.pinned);
    const res = await api.profile(
      notes.filter((n) => !n.pinned).map((n) => ({ category: n.category, text: n.text })),
      pages.map((p) => ({ date: new Date(p.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }), text: p.text })),
    );
    if (!res) return false;
    const updated: MemoryNote[] = res.notes
      .filter((n): n is { category: NoteCategory; text: string } => n.category in CATEGORY_LABELS)
      .map((n) => ({ id: notes.find((o) => o.text === n.text)?.id ?? newId(), category: n.category, text: n.text }));
    await saveNotes([...pinned, ...updated]);
    await kvSet(CURSOR, pages[pages.length - 1].updatedAt);
    return true;
  } finally {
    running = false;
  }
}
