import { detectCrisis, goalPhase, searchEntries, type CrisisLevel } from '@gunluk/core';
import { track } from './analytics';
import { aiReady, api } from './api';
import { addChat, entityNamesForEntries, kvGet, kvSet, listChat, listCheckins, listEntries, listGoals, type ChatMessage } from './db';
import { isLongHeavyPeriod } from './mascot';
import { noteTexts } from './memory';
import { takeQuota } from './quota';
import { readSettings } from './settings';

/*
 * The conversation with the mascot. It remembers through the diary: each
 * message pulls in the most relevant pages (never private ones), the memory
 * notes and active goals. Without AI it still answers memory questions by
 * showing matching pages.
 */

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });

const OFFLINE = {
  noAi: 'Sohbet için yapay zekâyı açman gerekiyor (Ayarlar). Ama sayfalarını yine de karıştırabilirim, geçmişine dair bir şey sor.',
  quota: 'Bugünlük sohbet hakkımız doldu; yarın yine buradayım. Bu arada yazmak istersen sayfan hep açık. 🌱',
  error: 'Şu an sana ulaşamadım, bağlantı kopmuş olabilir. Birazdan tekrar dener misin?',
  found: 'Aradığın şey bu sayfalardan birinde olabilir:',
  notFound: 'Buna dair bir sayfa bulamadım. Farklı kelimelerle ya da yaklaşık bir zaman vererek ("geçen yaz", "2 yıl önce") sorabilirsin.',
  crisis: 'Bunu bana yazdığın için iyi ki yazdın. Buradayım. Şu an kendini güvende hissetmiyorsan lütfen hemen 112\'yi ara ya da yanında olabilecek birine haber ver.',
};

async function relevantPages(question: string) {
  const docs = (await listEntries({ excludePrivate: true })).filter((d) => detectCrisis(d.text).level === 'none');
  const hits = searchEntries(question, docs, { limit: 4 }).filter((h, _, all) => h.inWindow || h.score >= 0.35 * (all[0]?.score ?? 0));
  const byId = new Map(docs.map((d) => [d.id, d]));
  return hits.map((h) => byId.get(h.id)!).filter(Boolean);
}

/** `onPartial` receives the reply as it streams in. */
export async function sendChat(text: string, onPartial?: (soFar: string) => void): Promise<ChatMessage> {
  const settings = await readSettings();
  const now = new Date().toISOString();
  const crisis: CrisisLevel = detectCrisis(text).level;
  await addChat({ at: now, role: 'user', text, pageIds: [], crisis });
  track('chat_sent', { crisis: crisis !== 'none' });

  const pages = await relevantPages(text);
  const reply = async (t: string, pageIds: string[] = [], c: CrisisLevel = crisis) =>
    addChat({ at: new Date().toISOString(), role: 'assistant', text: t, pageIds, crisis: c });

  if (!aiReady(settings)) {
    if (crisis === 'acute') return reply(OFFLINE.crisis);
    return pages.length ? reply(OFFLINE.found, pages.map((p) => p.id)) : reply(OFFLINE.noAi);
  }
  // Crisis messages are never blocked by the daily limit.
  if (crisis === 'none' && !(await takeQuota('chat'))) {
    track('quota_reached', { key: 'chat' });
    return reply(OFFLINE.quota, pages.map((p) => p.id));
  }

  const history = (await listChat(14)).map((m) => ({ role: m.role, content: m.text }));
  while (history.length && history[0].role !== 'user') history.shift();
  const [notes, goals, checkins, people] = await Promise.all([noteTexts(), listGoals(), listCheckins(), entityNamesForEntries(pages.map((p) => p.id))]);
  const active = goals.filter((g) => goalPhase(g, checkins) !== 'reviewed').map((g) => g.text);

  // The "long heavy period" hint is passed at most once a week.
  let longHeavy = false;
  const lastHint = await kvGet('long-heavy-hint');
  if (!lastHint || Date.now() - new Date(lastHint).getTime() > 7 * 86_400_000) {
    longHeavy = await isLongHeavyPeriod();
    if (longHeavy) await kvSet('long-heavy-hint', now);
  }

  const res = await api.chat(
    {
      messages: history,
      notes,
      goals: active,
      pages: pages.map((p) => ({ id: p.id, date: dateLabel(p.createdAt), text: people[p.id]?.length ? `${p.text}\n(Geçenler: ${people[p.id].join(', ')})` : p.text })),
      longHeavy,
    },
    onPartial,
  );
  if (!res) return crisis === 'acute' ? reply(OFFLINE.crisis) : reply(OFFLINE.error);
  return reply(res.reply, res.usedPageIds, res.crisis);
}
