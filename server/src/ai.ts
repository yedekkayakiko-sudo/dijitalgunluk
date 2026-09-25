import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { z } from 'zod';

export type Effort = 'low' | 'medium' | 'high';

export interface TextRequest {
  system: string;
  prompt: string;
  effort: Effort;
  maxTokens?: number;
}

export interface JsonRequest<S extends z.ZodType> extends TextRequest {
  schema: S;
}

/** The only surface routes depend on, so tests can swap in a fake. */
export interface Mascot {
  text(req: TextRequest): Promise<string | null>;
  json<S extends z.ZodType>(req: JsonRequest<S>): Promise<z.infer<S> | null>;
}

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
    return {
      model: this.model,
      max_tokens: req.maxTokens ?? 4000,
      system: req.system,
      messages: [{ role: 'user' as const, content: req.prompt }],
      output_config: { effort: req.effort },
      // If a safety classifier declines, let the API retry on its recommended fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default' as const,
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
