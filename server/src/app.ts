import {
  CRISIS_TEXT,
  detectCrisis,
  isSafeMascotText,
  scenarioEligibility,
} from '@gunluk/core';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { Mascot } from './ai';
import type { Config } from './config';
import type { Embedder } from './embeddings';
import {
  askSystem,
  EXTRACT_SYSTEM,
  letterSystem,
  reactionSystem,
  scenarioSystem,
  type Persona,
} from './prompts';

/*
 * Stateless AI proxy. It keeps the API key off the device, applies the
 * safety rules a second time, and stores nothing: request bodies are never
 * logged or persisted.
 */

const MAX_ENTRY_CHARS = 6000;

const persona = z.object({
  tone: z.enum(['calm', 'energetic', 'minimal']).default('calm'),
  mascotName: z.string().trim().min(1).max(24).default('Pusula'),
  userName: z.string().trim().max(40).nullable().default(null),
});

const entryText = z.string().max(MAX_ENTRY_CHARS);

const schemas = {
  reaction: persona.extend({
    kind: z.enum(['new_person', 'short_streak', 'recurring_theme']),
    subject: z.string().max(80).nullable(),
    draft: z.string().max(400),
    entry: entryText,
  }),
  ask: persona.extend({
    question: z.string().min(1).max(500),
    entries: z
      .array(z.object({ id: z.string().max(64), date: z.string().max(40), text: entryText, people: z.array(z.string().max(60)).max(20).default([]) }))
      .max(8),
  }),
  extract: z.object({ text: entryText }),
  letter: persona.extend({
    periodLabel: z.string().max(60),
    topPeople: z.array(z.string().max(60)).max(5),
    topThemes: z.array(z.string().max(60)).max(5),
    excerpts: z.array(z.object({ date: z.string().max(40), text: entryText })).max(12),
    fallback: z.string().max(2000),
  }),
  scenario: persona.extend({ text: entryText }),
  embed: z.object({ texts: z.array(entryText).min(1).max(32), kind: z.enum(['document', 'query']) }),
  report: z.object({ reason: z.enum(['harmful', 'diagnostic', 'wrong', 'other']), text: z.string().max(2000) }),
};

const AskAnswer = z.object({ answer: z.string(), used_entry_ids: z.array(z.string()) });
const Extracted = z.object({
  people: z.array(z.object({ name: z.string() })),
  places: z.array(z.object({ name: z.string() })),
});

const tag = (name: string, attrs: Record<string, string>, body: string) =>
  `<${name}${Object.entries(attrs).map(([k, v]) => ` ${k}="${v.replace(/"/g, "'")}"`).join('')}>\n${body.replace(new RegExp(`</?${name}`, 'gi'), '')}\n</${name}>`;

/** Accepts AI text only if it passes the diagnostic-language filter and a length cap. */
function safeOr(text: string | null, fallback: string, maxLen: number): { text: string; source: 'ai' | 'template' } {
  if (text && text.length <= maxLen && isSafeMascotText(text)) return { text, source: 'ai' };
  return { text: fallback, source: 'template' };
}

class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private perHour: number) {}
  allow(id: string, now = Date.now()): boolean {
    const recent = (this.hits.get(id) ?? []).filter((t) => now - t < 3_600_000);
    if (recent.length >= this.perHour) {
      this.hits.set(id, recent);
      return false;
    }
    recent.push(now);
    this.hits.set(id, recent);
    if (this.hits.size > 50_000) this.hits.clear();
    return true;
  }
}

export interface Deps {
  config: Config;
  mascot: Mascot | null;
  embedder: Embedder | null;
}

export function createApp({ config, mascot, embedder }: Deps) {
  const app = new Hono();
  const limiter = new RateLimiter(config.hourlyLimit);

  app.onError((err, c) => {
    // Log the error class only, never request content.
    console.error(`[${c.req.method} ${c.req.path}]`, err.name, (err as { status?: number }).status ?? '');
    return c.json({ error: 'upstream_error' }, 502);
  });

  app.get('/health', (c) => c.json({ ok: true, ai: !!mascot, embeddings: !!embedder }));

  app.use('/v1/*', bodyLimit({ maxSize: 128 * 1024 }), async (c, next) => {
    if (config.appKey && c.req.header('x-app-key') !== config.appKey) return c.json({ error: 'unauthorized' }, 401);
    const id = c.req.header('x-install-id') ?? c.req.header('x-forwarded-for') ?? 'anon';
    if (!limiter.allow(id)) return c.json({ error: 'rate_limited' }, 429);
    await next();
  });

  async function body<S extends z.ZodType>(c: Context, schema: S): Promise<z.infer<S> | Response> {
    const parsed = schema.safeParse(await c.req.json().catch(() => null));
    return parsed.success ? parsed.data : c.json({ error: 'invalid_request' }, 400);
  }

  const needsAI = (c: Context) => c.json({ error: 'ai_unavailable' }, 503);

  app.post('/v1/reaction', async (c) => {
    const b = await body(c, schemas.reaction);
    if (b instanceof Response) return b;
    if (detectCrisis(b.entry).level !== 'none') return c.json({ error: 'crisis_handled_on_device' }, 422);
    if (!mascot) return needsAI(c);
    const prompt = [
      `Intent: ${b.kind}${b.subject ? ` (about: ${b.subject})` : ''}`,
      `Safe draft: ${b.draft}`,
      tag('entry', {}, b.entry),
    ].join('\n\n');
    const text = await mascot.text({ system: reactionSystem(b as Persona), prompt, effort: 'low', maxTokens: 2000 });
    return c.json(safeOr(text, b.draft, 300));
  });

  app.post('/v1/ask', async (c) => {
    const b = await body(c, schemas.ask);
    if (b instanceof Response) return b;
    const crisis = detectCrisis(b.question);
    if (crisis.level !== 'none') return c.json({ answer: CRISIS_TEXT[crisis.level], entryIds: [], crisis: crisis.level, source: 'template' });
    const empty = 'Bununla ilgili bir sayfa bulamadım. Belki farklı kelimelerle ya da yaklaşık bir tarih vererek sorabilirsin.';
    if (b.entries.length === 0) return c.json({ answer: empty, entryIds: [], source: 'template' });
    if (!mascot) return needsAI(c);

    const pages = b.entries
      .map((e) => tag('page', { id: e.id, date: e.date, ...(e.people.length ? { people: e.people.join(', ') } : {}) }, e.text))
      .join('\n\n');
    const prompt = `${b.userName ? `The user's name is ${b.userName}.\n\n` : ''}${pages}\n\n${tag('question', {}, b.question)}`;
    const out = await mascot.json({ system: askSystem(b as Persona), prompt, effort: 'medium', maxTokens: 8000, schema: AskAnswer });
    if (!out) return c.json({ answer: empty, entryIds: [], source: 'template' });
    const known = new Set(b.entries.map((e) => e.id));
    const safe = safeOr(out.answer, 'Bu soruya dair sayfaları aşağıda bulabilirsin.', 1200);
    return c.json({ answer: safe.text, entryIds: out.used_entry_ids.filter((id) => known.has(id)), source: safe.source });
  });

  app.post('/v1/extract', async (c) => {
    const b = await body(c, schemas.extract);
    if (b instanceof Response) return b;
    if (!mascot) return needsAI(c);
    const out = await mascot.json({ system: EXTRACT_SYSTEM, prompt: tag('entry', {}, b.text), effort: 'low', maxTokens: 2000, schema: Extracted });
    const clean = (xs: { name: string }[] = []) => [...new Set(xs.map((x) => x.name.trim()).filter((n) => n.length >= 2 && n.length <= 40))].slice(0, 12);
    return c.json({ people: clean(out?.people), places: clean(out?.places) });
  });

  app.post('/v1/letter', async (c) => {
    const b = await body(c, schemas.letter);
    if (b instanceof Response) return b;
    if (!mascot) return needsAI(c);
    const pages = b.excerpts.filter((e) => detectCrisis(e.text).level === 'none');
    const prompt = [
      `Period: ${b.periodLabel}`,
      b.userName ? `Name: ${b.userName}` : 'Name: (none)',
      `Most mentioned people: ${b.topPeople.join(', ') || '-'}`,
      `Recurring topics: ${b.topThemes.join(', ') || '-'}`,
      ...pages.map((e) => tag('page', { date: e.date }, e.text)),
    ].join('\n\n');
    const text = await mascot.text({ system: letterSystem(b as Persona), prompt, effort: 'medium', maxTokens: 6000 });
    return c.json(safeOr(text, b.fallback, 2000));
  });

  app.post('/v1/scenario', async (c) => {
    const b = await body(c, schemas.scenario);
    if (b instanceof Response) return b;
    const eligibility = scenarioEligibility({ text: b.text, privacy: 'ai_full' });
    if (!eligibility.eligible) return c.json({ error: 'not_eligible', reason: eligibility.reason }, 422);
    if (!mascot) return needsAI(c);
    const text = await mascot.text({ system: scenarioSystem(b as Persona), prompt: tag('entry', {}, b.text), effort: 'low', maxTokens: 3000 });
    if (!text || !isSafeMascotText(text) || scenarioEligibility({ text, privacy: 'ai_full' }).eligible === false) {
      return c.json({ error: 'not_eligible', reason: 'sensitive' }, 422);
    }
    return c.json({ text });
  });

  // Google Play AI-content policy: users can flag mascot output. Only the mascot's text is sent, never the diary page.
  app.post('/v1/report', async (c) => {
    const b = await body(c, schemas.report);
    if (b instanceof Response) return b;
    console.log(JSON.stringify({ type: 'ai_report', at: new Date().toISOString(), reason: b.reason, text: b.text }));
    return c.body(null, 204);
  });

  app.post('/v1/embed', async (c) => {
    const b = await body(c, schemas.embed);
    if (b instanceof Response) return b;
    if (!embedder) return c.json({ error: 'embeddings_unavailable' }, 501);
    return c.json({ vectors: await embedder.embed(b.texts, b.kind) });
  });

  return app;
}
