import { detectCrisis, isSafeMascotText, scenarioEligibility } from '@gunluk/core';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { Mascot, TextRequest } from './ai';
import type { Config } from './config';
import type { Embedder } from './embeddings';
import { cleanProps, EVENT_NAMES, type EventSink } from './events';
import { dailyHash, type QuotaStore } from './quota';
import {
  chatTask,
  EXTRACT_TASK,
  letterTask,
  MARKER_OPEN,
  page,
  parseChatTag,
  PROFILE_TASK,
  reactionTask,
  scenarioTask,
  type Persona,
} from './prompts';

/*
 * Stateless AI proxy. It keeps the API key off the device, re-applies the
 * safety rules, and stores no diary content: request bodies are never logged
 * or persisted. The only thing it keeps is anonymous per-day event counts.
 */

const MAX_TEXT = 6000;

const persona = z.object({
  tone: z.enum(['calm', 'energetic', 'minimal']).default('calm'),
  mascotName: z.string().trim().min(1).max(24).default('Pusula'),
  hasName: z.boolean().default(false),
});

const text = z.string().max(MAX_TEXT);
const notes = z.array(z.string().max(200)).max(40).default([]);

const schemas = {
  reaction: persona.extend({
    kind: z.enum(['new_person', 'short_streak', 'recurring_theme', 'support', 'crisis', 'celebrate', 'welcome']),
    subject: z.string().max(80).nullable(),
    draft: z.string().max(600),
    entry: text,
    notes,
  }),
  chat: persona.extend({
    messages: z
      .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
      .min(1)
      .max(24)
      .refine((m) => m[0].role === 'user' && m[m.length - 1].role === 'user', 'must start and end with the user'),
    notes,
    goals: z.array(z.string().max(200)).max(5).default([]),
    pages: z.array(z.object({ id: z.string().max(64), date: z.string().max(40), text })).max(4).default([]),
    longHeavy: z.boolean().default(false),
  }),
  extract: z.object({ text }),
  profile: z.object({
    notes: z.array(z.object({ category: z.string().max(20), text: z.string().max(200) })).max(40),
    pages: z.array(z.object({ date: z.string().max(40), text })).min(1).max(8),
  }),
  letter: persona.extend({
    periodLabel: z.string().max(60),
    topPeople: z.array(z.string().max(60)).max(5),
    topThemes: z.array(z.string().max(60)).max(5),
    excerpts: z.array(z.object({ date: z.string().max(40), text })).max(12),
    fallback: z.string().max(2000),
  }),
  scenario: persona.extend({ text, notes }),
  embed: z.object({ texts: z.array(text).min(1).max(32), kind: z.enum(['document', 'query']) }),
  report: z.object({ reason: z.enum(['harmful', 'diagnostic', 'wrong', 'other']), text: z.string().max(2000) }),
  events: z.object({
    events: z
      .array(z.object({ name: z.enum(EVENT_NAMES), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), props: z.record(z.string(), z.unknown()).optional() }))
      .max(100),
  }),
};

const Extracted = z.object({ people: z.array(z.object({ name: z.string() })), places: z.array(z.object({ name: z.string() })) });
const CATEGORIES = ['kisi', 'durum', 'deger', 'iyi_gelen', 'an', 'zorluk'] as const;
const ProfileOut = z.object({ notes: z.array(z.object({ category: z.enum(CATEGORIES), text: z.string() })) });

const CHAT_FALLBACK = 'Şu an toparlayamadım, kusura bakma. Bir daha yazar mısın? Buradayım.';
const RETRY_NOTE = 'Önceki taslağın bir etiket ya da teşhis içeriyordu. Hiçbir etiket kullanmadan, sadece gözlemle yeniden yaz.';

class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private perHour: number) {}
  allow(id: string, now = Date.now()): boolean {
    const recent = (this.hits.get(id) ?? []).filter((t) => now - t < 3_600_000);
    const ok = recent.length < this.perHour;
    if (ok) recent.push(now);
    this.hits.set(id, recent);
    if (this.hits.size > 50_000) this.hits.clear();
    return ok;
  }
}

export interface Deps {
  config: Config;
  /** The mascot's voice (Sonnet-class). Null when no API key is configured. */
  voice: Mascot | null;
  /** Cheap extraction model (Haiku-class). */
  fast: Mascot | null;
  embedder: Embedder | null;
  events: EventSink;
  quotas: QuotaStore;
  /** Platform rate limiter (Cloudflare's binding) when available; otherwise a best-effort in-memory one is used. */
  rateLimit?: (key: string) => Promise<boolean>;
}

const LEVEL = { none: 0, concern: 1, acute: 2 } as const;
type Level = keyof typeof LEVEL;
const maxLevel = (a: Level, b: Level): Level => (LEVEL[a] >= LEVEL[b] ? a : b);

export function createApp({ config, voice, fast, embedder, events, quotas, rateLimit }: Deps) {
  const app = new Hono();
  const limiter = new RateLimiter(config.hourlyLimit);

  app.onError((err, c) => {
    // Log the error class only, never request content.
    console.error(`[${c.req.method} ${c.req.path}]`, err.name, (err as { status?: number }).status ?? '');
    return c.json({ error: 'upstream_error' }, 502);
  });

  // No cookies or sessions exist, so open CORS is safe; it lets the web preview talk to the server.
  app.use('*', cors({ origin: '*', allowHeaders: ['content-type', 'x-app-key', 'x-install-id', 'x-admin-key'] }));

  app.get('/health', (c) => c.json({ ok: true, ai: !!voice, embeddings: !!embedder }));

  app.use('/v1/*', bodyLimit({ maxSize: 160 * 1024 }), async (c, next) => {
    if (config.appKey && c.req.header('x-app-key') !== config.appKey) return c.json({ error: 'unauthorized' }, 401);
    if (c.req.path === '/v1/events' || c.req.path === '/v1/stats') return next();
    const id = c.req.header('x-install-id') ?? c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'anon';
    const allowed = rateLimit ? await rateLimit(id) : limiter.allow(id);
    if (!allowed) return c.json({ error: 'rate_limited' }, 429);
    await next();
  });

  /**
   * Daily ceilings per install, per IP and for the whole service. Messages with
   * crisis language are never refused because of a limit.
   */
  async function spend(c: Context, exempt = false): Promise<Response | null> {
    if (exempt) return null;
    const day = new Date().toISOString().slice(0, 10);
    const install = c.req.header('x-install-id') ?? 'none';
    const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'none';
    const [byInstall, byIp, total] = await Promise.all([
      quotas.hit(day, `i:${await dailyHash(install, day, config.hashSalt)}`),
      quotas.hit(day, `a:${await dailyHash(ip, day, config.hashSalt)}`),
      quotas.hit(day, 'global'),
    ]);
    if (total > config.globalDailyLimit) return c.json({ error: 'busy' }, 503);
    if (byInstall > config.installDailyLimit || byIp > config.ipDailyLimit) return c.json({ error: 'daily_limit' }, 429);
    return null;
  }

  async function body<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S> | Response> {
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    return parsed.success ? parsed.data : c.json({ error: 'invalid_request' }, 400);
  }

  const unavailable = (c: Context) => c.json({ error: 'ai_unavailable' }, 503);

  /** Generates text; if it slips into diagnostic language, asks once more, then gives up (null). */
  async function safeText(m: Mascot, req: TextRequest, maxLen: number): Promise<string | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await m.text(attempt === 0 ? req : { ...req, task: `${req.task}\n\n${RETRY_NOTE}` });
      if (out && out.length <= maxLen && isSafeMascotText(out)) return out;
    }
    return null;
  }

  app.post('/v1/reaction', async (c) => {
    const b = await body(c, schemas.reaction);
    if (b instanceof Response) return b;
    if (!voice) return unavailable(c);
    const intent = b.kind === 'support' && detectCrisis(b.entry).level === 'acute' ? 'crisis' : b.kind;
    const limited = await spend(c, intent === 'crisis' || intent === 'support');
    if (limited) return limited;
    const heavy = intent === 'crisis' || intent === 'support';
    const out = await safeText(
      voice,
      {
        task: reactionTask(intent, b as Persona, b.subject, b.notes),
        messages: [{ role: 'user', content: page(b.entry, {}, 'entry') }],
        effort: heavy ? 'medium' : 'low',
        maxTokens: heavy ? 4000 : 2000,
      },
      heavy ? 700 : 320,
    );
    return c.json(out ? { text: out, source: 'ai' } : { text: b.draft, source: 'template' });
  });

  // Streams the reply as server-sent events: `delta` chunks, then one `done` event
  // carrying the final, safety-checked text (which the app shows in place of the stream).
  app.post('/v1/chat', async (c) => {
    const b = await body(c, schemas.chat);
    if (b instanceof Response) return b;
    if (!voice) return unavailable(c);
    const keyword = detectCrisis(b.messages[b.messages.length - 1].content).level;
    const limited = await spend(c, keyword !== 'none');
    if (limited) return limited;

    const req: TextRequest = {
      task: chatTask(b as Persona, { notes: b.notes, goals: b.goals, pages: b.pages, crisis: keyword === 'acute', longHeavy: b.longHeavy }),
      messages: b.messages,
      effort: keyword === 'none' ? 'low' : 'medium',
      maxTokens: 6000,
    };

    return streamSSE(c, async (sse) => {
      let full = '';
      let sent = 0;
      let chain: Promise<void> = Promise.resolve();
      let final: string | null = null;
      try {
        final = await voice.stream(req, (delta) => {
          full += delta;
          const cut = full.indexOf(MARKER_OPEN);
          const visible = cut >= 0 ? full.slice(0, cut) : full;
          if (visible.length > sent) {
            const chunk = visible.slice(sent);
            sent = visible.length;
            chain = chain.then(() => sse.writeSSE({ event: 'delta', data: JSON.stringify({ t: chunk }) }));
          }
        });
      } catch (err) {
        console.error('[POST /v1/chat stream]', (err as Error).name, (err as { status?: number }).status ?? '');
      }
      await chain;
      const parsed = parseChatTag(final ?? '');
      const modelLevel: Level = parsed.risk === 'kriz' ? 'acute' : parsed.risk === 'endişe' ? 'concern' : 'none';
      const ok = !!final && parsed.reply.length > 0 && parsed.reply.length <= 3000 && isSafeMascotText(parsed.reply);
      const known = new Set(b.pages.map((p) => p.id));
      await sse.writeSSE({
        event: 'done',
        data: JSON.stringify({
          reply: ok ? parsed.reply : CHAT_FALLBACK,
          usedPageIds: ok ? parsed.pageIds.filter((id) => known.has(id)) : [],
          crisis: maxLevel(keyword, modelLevel),
          source: ok ? 'ai' : 'template',
        }),
      });
    });
  });

  app.post('/v1/extract', async (c) => {
    const b = await body(c, schemas.extract);
    if (b instanceof Response) return b;
    if (!fast) return unavailable(c);
    const limited = await spend(c);
    if (limited) return limited;
    const out = await fast.json({
      task: EXTRACT_TASK,
      persona: false,
      messages: [{ role: 'user', content: page(b.text, {}, 'entry') }],
      effort: 'low',
      maxTokens: 1500,
      schema: Extracted,
    });
    const clean = (xs: { name: string }[] = []) =>
      [...new Set(xs.map((x) => x.name.trim()).filter((n) => n.length >= 2 && n.length <= 40))].slice(0, 12);
    return c.json({ people: clean(out?.people), places: clean(out?.places) });
  });

  app.post('/v1/profile', async (c) => {
    const b = await body(c, schemas.profile);
    if (b instanceof Response) return b;
    if (!voice) return unavailable(c);
    // Pages with crisis language never become memory notes.
    const pages = b.pages.filter((p) => detectCrisis(p.text).level === 'none');
    if (!pages.length) return c.json({ notes: b.notes });
    const limited = await spend(c);
    if (limited) return limited;
    const current = b.notes.length ? b.notes.map((n) => `- [${n.category}] ${n.text}`).join('\n') : '(henüz not yok)';
    const out = await voice.json({
      task: PROFILE_TASK,
      persona: false,
      messages: [{ role: 'user', content: `Mevcut notlar:\n${current}\n\nYeni sayfalar:\n${pages.map((p) => page(p.text, { date: p.date })).join('\n')}` }],
      effort: 'low',
      maxTokens: 6000,
      schema: ProfileOut,
    });
    if (!out) return c.json({ notes: b.notes });
    const cleaned = out.notes
      .map((n) => ({ category: n.category, text: n.text.trim().slice(0, 200) }))
      .filter((n) => n.text.length > 3 && isSafeMascotText(n.text))
      .slice(0, 40);
    return c.json({ notes: cleaned });
  });

  app.post('/v1/letter', async (c) => {
    const b = await body(c, schemas.letter);
    if (b instanceof Response) return b;
    if (!voice) return unavailable(c);
    const pages = b.excerpts.filter((e) => detectCrisis(e.text).level === 'none');
    const limited = await spend(c);
    if (limited) return limited;
    const out = await safeText(
      voice,
      {
        task: letterTask(b as Persona, b.periodLabel, b.topPeople, b.topThemes),
        messages: [{ role: 'user', content: pages.map((e) => page(e.text, { date: e.date })).join('\n') || '(Bu dönem paylaşılan sayfa yok.)' }],
        effort: 'medium',
        maxTokens: 6000,
      },
      2000,
    );
    return c.json(out ? { text: out, source: 'ai' } : { text: b.fallback, source: 'template' });
  });

  app.post('/v1/scenario', async (c) => {
    const b = await body(c, schemas.scenario);
    if (b instanceof Response) return b;
    const eligibility = scenarioEligibility({ text: b.text, privacy: 'ai_full' });
    if (!eligibility.eligible) return c.json({ error: 'not_eligible', reason: eligibility.reason }, 422);
    if (!voice) return unavailable(c);
    const limited = await spend(c);
    if (limited) return limited;
    const out = await safeText(
      voice,
      {
        task: scenarioTask(b as Persona, eligibility.mode, b.notes),
        messages: [{ role: 'user', content: page(b.text, {}, 'entry') }],
        effort: eligibility.mode === 'heartache' ? 'medium' : 'low',
        maxTokens: 5000,
      },
      2500,
    );
    if (!out) return c.json({ error: 'not_eligible', reason: 'sensitive' }, 422);
    return c.json({ text: out, mode: eligibility.mode });
  });

  app.post('/v1/embed', async (c) => {
    const b = await body(c, schemas.embed);
    if (b instanceof Response) return b;
    if (!embedder) return c.json({ error: 'embeddings_unavailable' }, 501);
    const limited = await spend(c);
    if (limited) return limited;
    return c.json({ vectors: await embedder.embed(b.texts, b.kind) });
  });

  // Google Play AI-content policy: users can flag mascot output. Only the mascot's text is sent, never the diary page.
  app.post('/v1/report', async (c) => {
    const b = await body(c, schemas.report);
    if (b instanceof Response) return b;
    console.log(JSON.stringify({ type: 'ai_report', at: new Date().toISOString(), reason: b.reason, text: b.text }));
    return c.body(null, 204);
  });

  app.post('/v1/events', async (c) => {
    const b = await body(c, schemas.events);
    if (b instanceof Response) return b;
    await events.add(b.events.map((e) => ({ day: e.day, name: e.name, props: cleanProps(e.props) })));
    return c.body(null, 204);
  });

  app.get('/v1/stats', async (c) => {
    if (!config.adminKey || c.req.header('x-admin-key') !== config.adminKey) return c.json({ error: 'unauthorized' }, 401);
    const since = c.req.query('since') ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    return c.json({ rows: await events.summary(since) });
  });

  return app;
}
