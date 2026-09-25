import { describe, expect, it, vi } from 'vitest';
import type { Mascot, TextRequest } from '../src/ai';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { MemorySink } from '../src/events';

type FakeMascot = Record<string, unknown>;

function setup(over: { voice?: FakeMascot | null; fast?: FakeMascot | null; env?: Record<string, string> } = {}) {
  const make = (m: FakeMascot | null | undefined) =>
    m === null ? null : ({ text: vi.fn(async () => 'Zeynep ile tanışmanız nasıl oldu?'), json: vi.fn(async () => null), ...m } as unknown as Mascot & { text: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> });
  const voice = make(over.voice);
  const fast = make(over.fast);
  const events = new MemorySink();
  const app = createApp({ config: loadConfig({ HOURLY_LIMIT: '5', ADMIN_KEY: 'admin', ...over.env }), voice, fast, embedder: null, events });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { app, post, voice, fast, events };
}

const lastTask = (fn: unknown) => ((fn as { mock: { calls: unknown[][] } }).mock.calls.at(-1)![0] as TextRequest).task;

describe('/v1/reaction', () => {
  const req = { kind: 'new_person', subject: 'Zeynep', draft: 'Zeynep adını ilk kez duyuyorum.', entry: 'Bugün Zeynep ile tanıştım.' };

  it('returns the AI text when it is safe', async () => {
    const { post } = setup();
    expect(await (await post('/v1/reaction', req)).json()).toEqual({ text: 'Zeynep ile tanışmanız nasıl oldu?', source: 'ai' });
  });

  it('retries once, then falls back to the draft when the AI keeps diagnosing', async () => {
    const { post, voice } = setup({ voice: { text: vi.fn(async () => 'Bence depresyondasın.') } });
    expect(await (await post('/v1/reaction', req)).json()).toEqual({ text: req.draft, source: 'template' });
    expect(voice!.text).toHaveBeenCalledTimes(2);
  });

  it('answers crisis entries like a friend, with the crisis protocol switched on', async () => {
    const { post, voice } = setup();
    const res = await post('/v1/reaction', { ...req, kind: 'support', subject: null, entry: 'Artık yaşamak istemiyorum' });
    expect(res.status).toBe(200);
    expect(lastTask(voice!.text)).toContain('KRİZ NOTU');
  });

  it('passes memory notes and never the user name', async () => {
    const { post, voice } = setup();
    await post('/v1/reaction', { ...req, hasName: true, notes: ['Ayşe en yakın arkadaşı.'] });
    const task = lastTask(voice!.text);
    expect(task).toContain('Ayşe en yakın arkadaşı.');
    expect(task).toContain('{AD}');
  });
});

describe('/v1/chat', () => {
  const chat = (content: string) => ({ messages: [{ role: 'user', content }], pages: [{ id: 'a', date: '2 Ekim 2023', text: 'Emre ile tanıştım' }] });

  it('keeps only page ids that were actually provided', async () => {
    const { post } = setup({ voice: { json: vi.fn(async () => ({ reply: '2 Ekim 2023’te Emre ile tanışmıştın.', used_page_ids: ['a', 'zzz'] })) } });
    const res = await (await post('/v1/chat', chat('3 yıl önce tanıştığım çocuk kimdi?'))).json();
    expect(res).toMatchObject({ usedPageIds: ['a'], crisis: 'none', source: 'ai' });
  });

  it('stays in the conversation during a crisis and flags it for the app', async () => {
    const { post, voice } = setup({ voice: { json: vi.fn(async () => ({ reply: 'Buradayım. Güvende misin?', used_page_ids: [] })) } });
    const res = await (await post('/v1/chat', chat('bazen kendimi öldürmek istiyorum'))).json();
    expect(res).toMatchObject({ reply: 'Buradayım. Güvende misin?', crisis: 'acute' });
    expect(lastTask(voice!.json)).toContain('KRİZ NOTU');
  });

  it('rejects a conversation that does not end with the user', async () => {
    const { post } = setup();
    const res = await post('/v1/chat', { messages: [{ role: 'user', content: 'selam' }, { role: 'assistant', content: 'merhaba' }] });
    expect(res.status).toBe(400);
  });
});

describe('/v1/profile', () => {
  it('drops notes with labels and never learns from crisis pages', async () => {
    const json = vi.fn(async () => ({ notes: [{ category: 'kisi', text: 'Ayşe en yakın arkadaşı.' }, { category: 'zorluk', text: 'Depresyonda.' }] }));
    const { post } = setup({ voice: { json } });
    const res = await (await post('/v1/profile', { notes: [], pages: [{ date: '1 Ekim', text: 'Ayşe ile konuştum, iyi geldi.' }] })).json();
    expect(res.notes).toEqual([{ category: 'kisi', text: 'Ayşe en yakın arkadaşı.' }]);

    json.mockClear();
    await post('/v1/profile', { notes: [], pages: [{ date: '1 Ekim', text: 'yaşamak istemiyorum' }] });
    expect(json).not.toHaveBeenCalled();
  });
});

describe('/v1/scenario', () => {
  it('plays heartache in the careful mode', async () => {
    const { post, voice } = setup();
    const res = await (await post('/v1/scenario', { text: 'Bugün sevgilimle ayrıldık ve çok pişmanım.' })).json();
    expect(res.mode).toBe('heartache');
    expect(lastTask(voice!.text)).toContain('Kalp kırıklığı modu');
  });

  it('refuses grief and abuse on the server too', async () => {
    const { post, voice } = setup();
    expect((await post('/v1/scenario', { text: 'Dedem vefat etti, keşke daha sık gitseydim.' })).status).toBe(422);
    expect(voice!.text).not.toHaveBeenCalled();
  });
});

describe('/v1/events and /v1/stats', () => {
  it('stores only anonymous counts and cleans properties', async () => {
    const { app, post } = setup();
    const res = await post('/v1/events', {
      events: [
        { name: 'app_open', day: '2026-09-25', props: { d: 7 } },
        { name: 'app_open', day: '2026-09-25', props: { d: 7 } },
        { name: 'entry_saved', day: '2026-09-25', props: { kind: 'entry', text: 'Bugün Zeynep ile tanıştım', 'Bad Key': 1 } },
      ],
    });
    expect(res.status).toBe(204);
    const stats = await (await app.request('/v1/stats?since=2026-09-01', { headers: { 'x-admin-key': 'admin' } })).json();
    expect(stats.rows).toEqual([
      { day: '2026-09-25', name: 'app_open', props: '{"d":7}', count: 2 },
      { day: '2026-09-25', name: 'entry_saved', props: '{"kind":"entry"}', count: 1 },
    ]);
    expect((await app.request('/v1/stats')).status).toBe(401);
  });

  it('rejects unknown event names', async () => {
    const { post } = setup();
    expect((await post('/v1/events', { events: [{ name: 'whatever', day: '2026-09-25' }] })).status).toBe(400);
  });
});

describe('/v1/report', () => {
  it('accepts a report of mascot output', async () => {
    const { post } = setup();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect((await post('/v1/report', { reason: 'diagnostic', text: 'Bence depresyondasın.' })).status).toBe(204);
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});

describe('middleware', () => {
  it('requires the app key when configured', async () => {
    const { post } = setup({ env: { APP_KEY: 'secret' } });
    expect((await post('/v1/extract', { text: 'x' })).status).toBe(401);
    expect((await post('/v1/extract', { text: 'x' }, { 'x-app-key': 'secret' })).status).toBe(200);
  });

  it('rate-limits per install', async () => {
    const { post } = setup();
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await post('/v1/extract', { text: 'x' }, { 'x-install-id': 'abc' })).status);
    expect(statuses.at(-1)).toBe(429);
  });

  it('reports 503 without an AI key so the app uses templates', async () => {
    const { post } = setup({ voice: null, fast: null });
    expect((await post('/v1/extract', { text: 'x' })).status).toBe(503);
  });
});
