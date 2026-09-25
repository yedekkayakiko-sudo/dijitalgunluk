import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';
import { PERSONA } from './persona.generated';

export type Effort = 'low' | 'medium' | 'high';

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TextRequest {
  /** Route-specific instructions, placed after the (cached) persona. */
  task: string;
  /** The conversation; a single user turn for one-shot routes. */
  messages: Turn[];
  effort: Effort;
  maxTokens?: number;
  /** Include the mascot persona (default true). Extraction skips it to stay cheap. */
  persona?: boolean;
}

export interface JsonRequest<S extends z.ZodType> extends TextRequest {
  schema: S;
}

/** The only surface routes depend on, so tests can swap in a fake. */
export interface Mascot {
  text(req: TextRequest): Promise<string | null>;
  json<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S> | null>;
}

const FALLBACK_MODELS = new Set(['claude-opus-5', 'claude-opus-5-5', 'claude-fable-5', 'claude-fable-5-1']);

/**
 * Claude-backed implementation. Returns null (never throws for model-side
 * declines) so callers can fall back to on-device templates.
 */
export class ClaudeMascot implements Mascot {
  private client: Anthropic;

  constructor(private model: string, client?: Anthropic) {
    this.client = client ?? new Anthropic();
  }

  private base(req: TextRequest) {
    // The persona is identical for every user and route, so it is cached once and
    // read back at a fraction of the price; everything that varies comes after it.
    const system =
      req.persona === false
        ? req.task
        : [
            { type: 'text' as const, text: PERSONA, cache_control: { type: 'ephemeral' as const } },
            { type: 'text' as const, text: req.task },
          ];
    // `effort` is rejected by Haiku 4.5; server-side fallbacks apply to the Opus/Fable tier.
    const effort = this.model.startsWith('claude-haiku') ? {} : { effort: req.effort };
    const fallback = FALLBACK_MODELS.has(this.model)
      ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
      : {};
    return {
      model: this.model,
      max_tokens: req.maxTokens ?? 4000,
      system,
      messages: req.messages,
      output_config: effort,
      ...fallback,
    };
  }

  async text(req: TextRequest): Promise<string | null> {
    const res = await this.client.beta.messages.create(this.base(req));
    if (res.stop_reason === 'refusal') return null;
    const text = res.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    return text || null;
  }

  async json<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S> | null> {
    const base = this.base(req);
    const res = await this.client.beta.messages.parse({
      ...base,
      output_config: { ...base.output_config, format: betaZodOutputFormat(req.schema) },
    });
    if (res.stop_reason === 'refusal') return null;
    return (res.parsed_output as z.infer<S> | null) ?? null;
  }
}
