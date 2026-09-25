import type { MascotTone } from '@gunluk/core';
import { kvGet, kvSet, newId } from './db';
import { readSettings, type Settings } from './settings';

/*
 * Client for the mascot server. Every call is best-effort: on any failure it
 * returns null and the app falls back to on-device behaviour.
 */

const TIMEOUT_MS = 25_000;

async function installId(): Promise<string> {
  let id = await kvGet('install-id');
  if (!id) {
    id = newId();
    await kvSet('install-id', id);
  }
  return id;
}

async function post<T>(path: string, body: unknown, s?: Settings): Promise<T | null> {
  const settings = s ?? (await readSettings());
  if (!settings.aiEnabled || !settings.serverUrl) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-install-id': await installId(),
        ...(process.env.EXPO_PUBLIC_APP_KEY ? { 'x-app-key': process.env.EXPO_PUBLIC_APP_KEY } : {}),
      },
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

function persona(s: Settings): { tone: MascotTone; mascotName: string; userName: string | null } {
  return { tone: s.tone, mascotName: s.mascotName || 'Pusula', userName: s.userName || null };
}

export const api = {
  async reaction(p: { kind: string; subject: string | null; draft: string; entry: string }) {
    const s = await readSettings();
    return post<{ text: string }>('/v1/reaction', { ...persona(s), ...p }, s);
  },
  async ask(question: string, entries: { id: string; date: string; text: string; people: string[] }[]) {
    const s = await readSettings();
    return post<{ answer: string; entryIds: string[]; crisis?: string }>('/v1/ask', { ...persona(s), question, entries }, s);
  },
  extract(text: string) {
    return post<{ people: string[]; places: string[] }>('/v1/extract', { text });
  },
  async letter(p: { periodLabel: string; topPeople: string[]; topThemes: string[]; excerpts: { date: string; text: string }[]; fallback: string }) {
    const s = await readSettings();
    return post<{ text: string }>('/v1/letter', { ...persona(s), ...p }, s);
  },
  async scenario(text: string) {
    const s = await readSettings();
    return post<{ text: string }>('/v1/scenario', { ...persona(s), text }, s);
  },
  /** Sends only the mascot's own text, never the diary entry. */
  async report(reason: 'harmful' | 'diagnostic' | 'wrong' | 'other', text: string): Promise<boolean> {
    const s = await readSettings();
    if (!s.serverUrl) return false;
    try {
      const res = await fetch(`${s.serverUrl.replace(/\/$/, '')}/v1/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-install-id': await installId(), ...(process.env.EXPO_PUBLIC_APP_KEY ? { 'x-app-key': process.env.EXPO_PUBLIC_APP_KEY } : {}) },
        body: JSON.stringify({ reason, text }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },
  async embed(texts: string[], kind: 'document' | 'query') {
    const r = await post<{ vectors: number[][] }>('/v1/embed', { texts, kind });
    return r?.vectors ?? null;
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
