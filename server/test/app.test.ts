import { describe, expect, it, vi } from 'vitest';
import type { Mascot, TextRequest } from '../src/ai';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { MemorySink } from '../src/events';
import { MemoryQuotaStore } from '../src/quota';

type FakeMascot = Record<string, unknown>;

function setup(over: { voice?: FakeMascot | null; fast?: FakeMascot | null; env?: Record<string, string> } = {}) {
  const make = (m: FakeMascot | null | undefined) =>
    m === null
      ? null
      : ({
          text: vi.fn(async () => 'Zeynep ile tanışmanız nasıl oldu?'),
          json: vi.fn(async () => null),
          stream: vi.fn(async (_req: TextRequest, onText: (d: string) => void) => {
            onText('Anlattığın için ');
            onText('teşekkürler.\n⟦sayfalar: ; ');
            onText('risk: yok⟧');
            return 'Anlattığın için teşekkürler.\n⟦sayfalar: ; risk: yok⟧';
          }),
          ...m,
        } as unknown as Mascot & { text: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; stream: ReturnType<typeof vi.fn> });
  const voice = make(over.voice);
  const fast = make(over.fast);
  const events = new MemorySink();
  const app = createApp({ config: loadConfig({ HOURLY_LIMIT: '5', ADMIN_KEY: 'admin', ...over.env }), voice, fast, embedder: null, events, quotas: new MemoryQuotaStore() });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { app, post, voice, fast, events };
}

/** Reads a server-sent event stream into its `delta` texts and the final `done` payload. */
async function readSSE(res: Response) {
  const events = (await res.text())
    .split('\n\n')
    .filter(Boolean)
    .map((block) => ({ event: /event: (\w+)/.exec(block)?.[1], data: JSON.parse(/data: (.*)/.exec(block)?.[1] ?? 'null') }));
  return { deltas: events.filter((e) => e.event === 'delta').map((e) => e.data.t as string), done: events.find((e) => e.event === 'done')?.data };
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
  const streaming = (full: string) => ({
    stream: vi.fn(async (_r: TextRequest, onText: (d: string) => void) => {
      for (const part of full.match(/.{1,7}/gs) ?? []) onText(part);
      return full;
    }),
  });

  it('streams the reply and never shows the hidden tag', async () => {
    const { post } = setup();
    const { deltas, done } = await readSSE(await post('/v1/chat', chat('selam')));
    expect(deltas.join('')).toBe('Anlattığın için teşekkürler.\n');
    expect(done).toEqual({ reply: 'Anlattığın için teşekkürler.', usedPageIds: [], crisis: 'none', source: 'ai' });
  });

  it('keeps only page ids that were actually provided', async () => {
    const { post } = setup({ voice: streaming('2 Ekim 2023’te Emre ile tanışmıştın.\n⟦sayfalar: a, zzz; risk: yok⟧') });
    const { done } = await readSSE(await post('/v1/chat', chat('3 yıl önce tanıştığım çocuk kimdi?')));
    expect(done.usedPageIds).toEqual(['a']);
  });

  it('flags crisis from keywords and turns on the protocol', async () => {
    const { post, voice } = setup();
    const { done } = await readSSE(await post('/v1/chat', chat('bazen kendimi öldürmek istiyorum')));
    expect(done.crisis).toBe('acute');
    expect(lastTask(voice!.stream)).toContain('KRİZ NOTU');
  });

  it('also trusts the model when it spots risk the keywords missed', async () => {
    const { post } = setup({ voice: streaming('Buradayım. Bu söylediğin beni düşündürdü; güvende misin?\n⟦sayfalar: ; risk: kriz⟧') });
    const { done } = await readSSE(await post('/v1/chat', chat('Eşyalarımı arkadaşlarıma dağıttım, artık gerek kalmadı.')));
    expect(done.crisis).toBe('acute');
  });

  it('replaces a reply that slipped into diagnostic language', async () => {
    const { post } = setup({ voice: streaming('Bence depresyondasın.\n⟦sayfalar: ; risk: yok⟧') });
    const { done } = await readSSE(await post('/v1/chat', chat('nasılım sence')));
    expect(done.source).toBe('template');
    expect(done.reply).not.toContain('depresyon');
  });

  it('rejects a conversation that does not end with the user', async () => {
    const { post } = setup();
    const res = await post('/v1/chat', { messages: [{ role: 'user', content: 'selam' }, { role: 'assistant', content: 'merhaba' }] });
    expect(res.status).toBe(400);
  });
});

describe('daily ceilings', () => {
  it('stops an install after its daily AI limit, but never for crisis messages', async () => {
    const { post } = setup({ env: { INSTALL_DAILY_LIMIT: '2', HOURLY_LIMIT: '100' } });
    const h = { 'x-install-id': 'abc' };
    expect((await post('/v1/extract', { text: 'x' }, h)).status).toBe(200);
    expect((await post('/v1/extract', { text: 'x' }, h)).status).toBe(200);
    expect((await post('/v1/extract', { text: 'x' }, h)).status).toBe(429);
    const crisis = await post('/v1/chat', { messages: [{ role: 'user', content: 'yaşamak istemiyorum' }] }, h);
    expect(crisis.status).toBe(200);
  });

  it('has a global circuit breaker for the whole service', async () => {
    const { post } = setup({ env: { GLOBAL_DAILY_LIMIT: '1', HOURLY_LIMIT: '100' } });
    expect((await post('/v1/extract', { text: 'x' }, { 'x-install-id': 'a' })).status).toBe(200);
    expect((await post('/v1/extract', { text: 'x' }, { 'x-install-id': 'b' })).status).toBe(503);
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
