import { fillName, scrubIdentifiers, type MascotTone } from '@gunluk/core';
import { kvGet, kvSet, newId } from './db';
import { hasValidConsent, readSettings, type Settings } from './settings';

/*
 * Client for the mascot server. Every call is best-effort: on any failure it
 * returns null and the app falls back to on-device behaviour.
 * Before anything leaves the device, direct identifiers (phone, e-mail,
 * ID and card numbers) are masked and the user's own name is replaced by {AD}.
 */

const TIMEOUT_MS = 30_000;

async function installId(): Promise<string> {
  let id = await kvGet('install-id');
  if (!id) {
    id = newId();
    await kvSet('install-id', id);
  }
  return id;
}

const appKeyHeader = (): Record<string, string> => (process.env.EXPO_PUBLIC_APP_KEY ? { 'x-app-key': process.env.EXPO_PUBLIC_APP_KEY } : {});
const base = (s: Settings) => s.serverUrl.replace(/\/$/, '');

/** AI is usable only with the switch on, a server, and valid KVKK consent. */
export const aiReady = (s: Settings) => s.aiEnabled && !!s.serverUrl && hasValidConsent(s);

async function post<T>(path: string, body: unknown, s: Settings): Promise<T | null> {
  if (!aiReady(s)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base(s)}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-install-id': await installId(), ...appKeyHeader() },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function persona(s: Settings): { tone: MascotTone; mascotName: string; hasName: boolean } {
  return { tone: s.tone, mascotName: s.mascotName || 'Pusula', hasName: !!s.userName.trim() };
}

export const scrub = (s: Settings, text: string) => scrubIdentifiers(text, [s.userName]);

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export const api = {
  async reaction(p: { kind: string; subject: string | null; draft: string; entry: string; notes: string[] }) {
    const s = await readSettings();
    const r = await post<{ text: string; source: 'ai' | 'template' }>('/v1/reaction', { ...persona(s), ...p, entry: scrub(s, p.entry) }, s);
    return r && { ...r, text: fillName(r.text, s.userName) };
  },

  async chat(p: { messages: ChatTurn[]; notes: string[]; goals: string[]; pages: { id: string; date: string; text: string }[]; longHeavy: boolean }) {
    const s = await readSettings();
    const r = await post<{ reply: string; usedPageIds: string[]; crisis: 'none' | 'concern' | 'acute'; source: 'ai' | 'template' }>(
      '/v1/chat',
      {
        ...persona(s),
        ...p,
        messages: p.messages.map((m) => ({ ...m, content: scrub(s, m.content) })),
        pages: p.pages.map((pg) => ({ ...pg, text: scrub(s, pg.text) })),
      },
      s,
    );
    return r && { ...r, reply: fillName(r.reply, s.userName) };
  },

  async extract(text: string) {
    const s = await readSettings();
    return post<{ people: string[]; places: string[] }>('/v1/extract', { text: scrub(s, text) }, s);
  },

  async profile(notes: { category: string; text: string }[], pages: { date: string; text: string }[]) {
    const s = await readSettings();
    return post<{ notes: { category: string; text: string }[] }>('/v1/profile', { notes, pages: pages.map((p) => ({ ...p, text: scrub(s, p.text) })) }, s);
  },

  async letter(p: { periodLabel: string; topPeople: string[]; topThemes: string[]; excerpts: { date: string; text: string }[]; fallback: string }) {
    const s = await readSettings();
    const r = await post<{ text: string; source: 'ai' | 'template' }>(
      '/v1/letter',
      { ...persona(s), ...p, excerpts: p.excerpts.map((e) => ({ ...e, text: scrub(s, e.text) })) },
      s,
    );
    return r && { ...r, text: fillName(r.text, s.userName) };
  },

  async scenario(text: string, notes: string[]) {
    const s = await readSettings();
    const r = await post<{ text: string; mode: 'light' | 'heartache' }>('/v1/scenario', { ...persona(s), text: scrub(s, text), notes }, s);
    return r && { ...r, text: fillName(r.text, s.userName) };
  },

  /** Optional semantic search; after a failure (e.g. the server has no embedding key) it rests for 6 hours. */
  async embed(texts: string[], kind: 'document' | 'query') {
    const until = await kvGet('embed-off-until');
    if (until && Date.now() < Number(until)) return null;
    const s = await readSettings();
    const r = await post<{ vectors: number[][] }>('/v1/embed', { texts: texts.map((t) => scrub(s, t)), kind }, s);
    if (!r && aiReady(s)) await kvSet('embed-off-until', String(Date.now() + 6 * 3_600_000));
    return r?.vectors ?? null;
  },

  /** Sends only the mascot's own text, never the diary entry. */
  async report(reason: 'harmful' | 'diagnostic' | 'wrong' | 'other', text: string): Promise<boolean> {
    const s = await readSettings();
    if (!s.serverUrl) return false;
    try {
      const res = await fetch(`${base(s)}/v1/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...appKeyHeader() },
        body: JSON.stringify({ reason, text: scrub(s, text) }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Anonymous counters: deliberately sent without the install id. */
  async events(events: { name: string; day: string; props?: Record<string, string | number | boolean> }[]): Promise<boolean> {
    const s = await readSettings();
    if (!s.analytics || !s.serverUrl || !events.length) return false;
    try {
      const res = await fetch(`${base(s)}/v1/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...appKeyHeader() },
        body: JSON.stringify({ events }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async health(serverUrl: string): Promise<{ ai: boolean; embeddings: boolean } | null> {
    try {
      const res = await fetch(`${serverUrl.replace(/\/$/, '')}/health`);
      return res.ok ? ((await res.json()) as { ai: boolean; embeddings: boolean }) : null;
    } catch {
      return null;
    }
  },
};
