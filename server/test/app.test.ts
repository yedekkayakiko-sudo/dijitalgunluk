import { describe, expect, it, vi } from 'vitest';
import type { Mascot } from '../src/ai';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

function setup(mascot: Partial<Mascot> | null = {}, env: Record<string, string> = {}) {
  const fake = mascot && {
    text: vi.fn(async () => 'Zeynep ile tanışmanız nasıl oldu?'),
    json: vi.fn(async () => null),
    ...mascot,
  };
  const app = createApp({ config: loadConfig({ HOURLY_LIMIT: '5', ...env }), mascot: fake as Mascot | null, embedder: null });
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    app.request(path, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  return { app, post, fake };
}

describe('/v1/reaction', () => {
  const req = { kind: 'new_person', subject: 'Zeynep', draft: 'Zeynep adını ilk kez duyuyorum.', entry: 'Bugün Zeynep ile tanıştım.' };

  it('returns the AI text when it is safe', async () => {
    const { post } = setup();
    const res = await post('/v1/reaction', req);
    expect(await res.json()).toEqual({ text: 'Zeynep ile tanışmanız nasıl oldu?', source: 'ai' });
  });

  it('falls back to the draft when the AI uses diagnostic language', async () => {
    const { post } = setup({ text: async () => 'Bence depresyondasın.' });
    expect(await (await post('/v1/reaction', req)).json()).toEqual({ text: req.draft, source: 'template' });
  });

  it('never sends crisis entries to the AI', async () => {
    const { post, fake } = setup();
    const res = await post('/v1/reaction', { ...req, entry: 'Artık yaşamak istemiyorum' });
    expect(res.status).toBe(422);
    expect(fake!.text).not.toHaveBeenCalled();
  });
});

describe('/v1/ask', () => {
  it('answers crisis questions with resources, without the AI', async () => {
    const { post, fake } = setup();
    const res = await (await post('/v1/ask', { question: 'kendime zarar vermek istiyorum', entries: [] })).json();
    expect(res.crisis).toBe('acute');
    expect(res.answer).toContain('112');
    expect(fake!.json).not.toHaveBeenCalled();
  });

  it('drops ids the model invented', async () => {
    const { post } = setup({ json: async () => ({ answer: '2 Ekim 2023’te Emre ile tanışmıştın.', used_entry_ids: ['a', 'zzz'] }) as never });
    const res = await (await post('/v1/ask', { question: '3 yıl önce tanıştığım çocuk?', entries: [{ id: 'a', date: '2023-10-02', text: 'Emre ile tanıştım' }] })).json();
    expect(res.entryIds).toEqual(['a']);
  });
});

describe('/v1/scenario', () => {
  it('refuses serious entries on the server too', async () => {
    const { post, fake } = setup();
    const res = await post('/v1/scenario', { text: 'Bugün sevgilimle ayrıldık ve çok pişmanım.' });
    expect(res.status).toBe(422);
    expect(fake!.text).not.toHaveBeenCalled();
  });
});

describe('middleware', () => {
  it('requires the app key when configured', async () => {
    const { post } = setup({}, { APP_KEY: 'secret' });
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
    const { post } = setup(null);
    expect((await post('/v1/extract', { text: 'x' })).status).toBe(503);
  });
});
