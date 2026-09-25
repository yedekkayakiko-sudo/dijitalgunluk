import type Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { ClaudeMascot } from '../src/ai';
import { personaText } from '../persona/bundle.mjs';
import { PERSONA } from '../src/persona.generated';

function fakeClient(response: object) {
  const create = vi.fn(async (_: unknown) => response);
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}
const argOf = (create: ReturnType<typeof vi.fn>) => create.mock.calls[0][0] as Record<string, unknown>;
const req = { task: 't', messages: [{ role: 'user' as const, content: 'p' }], effort: 'low' as const };

describe('ClaudeMascot', () => {
  it('sends the cached persona first, then the task', async () => {
    const { client, create } = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: ' Merhaba ' }] });
    expect(await new ClaudeMascot('claude-sonnet-5', client).text(req)).toBe('Merhaba');
    const arg = argOf(create);
    expect(arg.system).toEqual([
      { type: 'text', text: PERSONA, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: 't' },
    ]);
    expect(arg.output_config).toEqual({ effort: 'low' });
    expect(arg).not.toHaveProperty('fallbacks');
  });

  it('adds default fallbacks for Opus and skips unsupported params for Haiku', async () => {
    const opus = fakeClient({ stop_reason: 'end_turn', content: [] });
    await new ClaudeMascot('claude-opus-5', opus.client).text(req);
    expect(argOf(opus.create)).toMatchObject({ fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] });

    const haiku = fakeClient({ stop_reason: 'end_turn', content: [] });
    await new ClaudeMascot('claude-haiku-4-5', haiku.client).text({ ...req, persona: false });
    expect(argOf(haiku.create)).toMatchObject({ output_config: {}, system: 't' });
  });

  it('streams text deltas and returns the full text', async () => {
    const events = [
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Mer' } },
      { type: 'content_block_delta', delta: { type: 'text_delta', text: 'haba' } },
    ];
    const stream = vi.fn(() => ({
      async *[Symbol.asyncIterator]() {
        yield* events;
      },
      finalMessage: async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Merhaba' }] }),
    }));
    const client = { beta: { messages: { stream } } } as unknown as Anthropic;
    const seen: string[] = [];
    expect(await new ClaudeMascot('claude-sonnet-5', client).stream(req, (d) => seen.push(d))).toBe('Merhaba');
    expect(seen).toEqual(['Mer', 'haba']);
  });

  it('returns null on refusal so the app uses its template', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', content: [] });
    expect(await new ClaudeMascot('claude-sonnet-5', client).text(req)).toBeNull();
  });

  it('ships the persona exactly as written in persona/', () => {
    expect(PERSONA, 'run: npm run persona -w server').toBe(personaText());
    expect(PERSONA).toContain('Dost acı da söyler');
  });
});
