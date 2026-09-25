import { decideReaction, detectCrisis, normalizeKey, type CrisisLevel, type Entry, type EntityMention, type ReactionKind } from '@gunluk/core';
import { track } from './analytics';
import { aiReady, api } from './api';
import { addReaction, linkEntities, listEntities, listEntries, recentReactions, setEmbedding } from './db';
import { maybeUpdateNotes, noteTexts } from './memory';
import { rewardEntry } from './pet';
import { readSettings } from './settings';

export interface MascotReply {
  kind: ReactionKind;
  crisisLevel: CrisisLevel;
  text: string | null;
  /** Water drops earned by this page (new pages only). */
  drops: number;
}

/**
 * Runs after an entry is saved: crisis check, memory (people, places, notes),
 * search index, the mascot's reaction, and the drops the mascot can be fed.
 * Edits never trigger a new reaction or reward, except for crisis language.
 */
export async function afterSave(entry: Entry, isNew: boolean): Promise<MascotReply> {
  const settings = await readSettings();
  const ai = aiReady(settings);
  const [known, recent, past] = await Promise.all([listEntities(), listEntries({ limit: 12 }), recentReactions(30)]);

  const decision = decideReaction({ entry, recent: recent.filter((e) => e.id !== entry.id), knownEntities: known, pastReactions: past, tone: settings.tone });
  const crisis = decision.crisisLevel !== 'none';

  // People and places, only for full-analysis entries without crisis language.
  let mentions: EntityMention[] = [];
  if (entry.privacy === 'ai_full' && !crisis) {
    mentions = decision.mentions;
    const extracted = ai ? await api.extract(entry.text) : null;
    if (extracted) {
      const add = (kind: 'person' | 'place', name: string) => {
        const key = normalizeKey(name);
        if (key && !mentions.some((m) => m.key === key)) mentions = [...mentions, { kind, name, key }];
      };
      extracted.people.forEach((n) => add('person', n));
      extracted.places.forEach((n) => add('place', n));
    }
  }
  await linkEntities(entry.id, mentions, entry.createdAt);

  // Semantic search index and memory notes run in the background.
  if (ai && entry.privacy !== 'private' && !crisis) {
    api.embed([entry.text], 'document').then((v) => v?.[0] && setEmbedding(entry.id, v[0])).catch(() => {});
    if (entry.privacy === 'ai_full') maybeUpdateNotes().catch(() => {});
  }

  const drops = isNew ? await rewardEntry(entry) : 0;
  track('entry_saved', { kind: entry.kind, privacy: entry.privacy, photo: entry.photos.length > 0 });

  const speak = decision.kind === 'crisis' || decision.kind === 'support' ? true : isNew && decision.kind !== 'none';
  if (!speak || !decision.text) return { kind: 'none', crisisLevel: decision.crisisLevel, text: null, drops };

  let text = decision.text;
  if (decision.aiAllowed && ai) {
    const r = await api.reaction({ kind: decision.kind, subject: decision.subject, draft: decision.text, entry: entry.text, notes: await noteTexts() });
    if (r?.text) text = r.text;
  }
  await addReaction({ entryId: entry.id, kind: decision.kind, subject: decision.subject, text, at: new Date().toISOString() });
  track(crisis ? 'support_shown' : 'reaction_shown', { kind: decision.kind });
  return { kind: decision.kind, crisisLevel: decision.crisisLevel, text, drops };
}

/** Long heavy stretch: mostly hard moods (or repeated support) over two weeks. Never a diagnosis. */
export async function isLongHeavyPeriod(): Promise<boolean> {
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const entries = await listEntries({ from: since });
  const moods = entries.map((e) => e.mood).filter((m): m is NonNullable<typeof m> => m != null);
  const heavyMoods = moods.length >= 5 && moods.filter((m) => m <= 2).length / moods.length >= 0.7;
  const supports = (await recentReactions(30)).filter((r) => (r.kind === 'support' || r.kind === 'crisis') && r.at >= since).length;
  return heavyMoods || supports >= 3 || entries.some((e) => detectCrisis(e.text).level === 'acute');
}
