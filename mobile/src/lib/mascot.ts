import {
  decideReaction,
  detectCrisis,
  normalizeKey,
  searchEntries,
  type CrisisLevel,
  type Entry,
  type EntityMention,
  type ReactionKind,
} from '@gunluk/core';
import { api } from './api';
import {
  addReaction,
  entityNamesForEntries,
  linkEntities,
  listEntities,
  listEntries,
  recentReactions,
  setEmbedding,
  type StoredEntry,
} from './db';
import { readSettings } from './settings';

export interface MascotReply {
  kind: ReactionKind;
  crisisLevel: CrisisLevel;
  text: string | null;
}

/**
 * Runs after an entry is saved: crisis check, entity memory, embedding and
 * (sometimes) a short reaction. `isNew` is false for edits, which never
 * trigger a new reaction except for crisis signals.
 */
export async function afterSave(entry: Entry, isNew: boolean): Promise<MascotReply> {
  const settings = await readSettings();
  const [known, recent, past] = await Promise.all([listEntities(), listEntries({ limit: 12 }), recentReactions(30)]);

  const decision = decideReaction({
    entry,
    recent: recent.filter((e) => e.id !== entry.id),
    knownEntities: known,
    pastReactions: past,
    tone: settings.tone,
  });

  // Memory: people and places, only for full-analysis entries.
  let mentions: EntityMention[] = decision.mentions;
  if (entry.privacy === 'ai_full' && decision.kind !== 'crisis') {
    const ai = settings.aiEnabled ? await api.extract(entry.text) : null;
    if (ai) {
      const add = (kind: 'person' | 'place', name: string) => {
        const key = normalizeKey(name);
        if (key && !mentions.some((m) => m.key === key)) mentions = [...mentions, { kind, name, key }];
      };
      ai.people.forEach((n) => add('person', n));
      ai.places.forEach((n) => add('place', n));
    }
  } else {
    mentions = [];
  }
  await linkEntities(entry.id, mentions, entry.createdAt);

  // Semantic search index, for entries the AI is allowed to see.
  if (entry.privacy !== 'private' && settings.aiEnabled && detectCrisis(entry.text).level === 'none') {
    api.embed([entry.text], 'document').then((v) => v?.[0] && setEmbedding(entry.id, v[0])).catch(() => {});
  }

  // Edits never trigger a new reaction, except for crisis signals.
  const speak = decision.kind === 'crisis' || (isNew && decision.kind !== 'none');
  if (!speak || !decision.text) return { kind: 'none', crisisLevel: 'none', text: null };

  let text = decision.text;
  if (decision.aiAllowed && decision.kind !== 'crisis') {
    const ai = await api.reaction({ kind: decision.kind, subject: decision.subject, draft: decision.text, entry: entry.text });
    if (ai?.text) text = ai.text;
  }
  await addReaction({ entryId: entry.id, kind: decision.kind, subject: decision.subject, text, at: new Date().toISOString() });
  return { kind: decision.kind, crisisLevel: decision.crisisLevel, text };
}

export interface AskResult {
  answer: string;
  aiGenerated: boolean;
  entries: StoredEntry[];
  crisisLevel: CrisisLevel;
}

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

/** "3 yıl önce tanıştığım çocuk kimdi?" */
export async function askMascot(question: string): Promise<AskResult> {
  const crisis = detectCrisis(question);
  if (crisis.level !== 'none') return { answer: '', aiGenerated: false, entries: [], crisisLevel: crisis.level };

  const docs = await listEntries({ excludePrivate: true });
  const queryEmbedding = docs.some((d) => d.embedding) ? (await api.embed([question], 'query'))?.[0] ?? null : null;
  const hits = searchEntries(question, docs, { queryEmbedding, limit: 6 });
  const byId = new Map(docs.map((d) => [d.id, d]));
  const found = hits.map((h) => byId.get(h.id)!).filter(Boolean);

  if (found.length === 0) {
    return {
      answer: 'Bununla ilgili bir sayfa bulamadım. Farklı kelimelerle ya da yaklaşık bir zaman vererek ("geçen yaz", "2 yıl önce") sorabilirsin.',
      aiGenerated: false,
      entries: [],
      crisisLevel: 'none',
    };
  }

  const people = await entityNamesForEntries(found.map((e) => e.id));
  // Pages with crisis language are shown to the user but never sent to the AI.
  const shareable = found.filter((e) => detectCrisis(e.text).level === 'none');
  const ai = shareable.length
    ? await api.ask(question, shareable.map((e) => ({ id: e.id, date: dateLabel(e.createdAt), text: e.text, people: people[e.id] ?? [] })))
    : null;
  if (ai) {
    const used = ai.entryIds.length ? found.filter((e) => ai.entryIds.includes(e.id)) : found.slice(0, 3);
    return { answer: ai.answer, aiGenerated: true, entries: used, crisisLevel: 'none' };
  }
  return {
    answer: found.length === 1 ? 'Sanırım şu sayfadan bahsediyorsun:' : 'Aradığın şey bu sayfalardan birinde olabilir:',
    aiGenerated: false,
    entries: found.slice(0, 4),
    crisisLevel: 'none',
  };
}
