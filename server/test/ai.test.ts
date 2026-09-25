import type Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it, vi } from 'vitest';
import { ClaudeMascot } from '../src/ai';

function fakeClient(response: object) {
  const create = vi.fn(async () => response);
  return { client: { beta: { messages: { create } } } as unknown as Anthropic, create };
}

describe('ClaudeMascot', () => {
  it('sends effort and default fallbacks for Opus', async () => {
    const { client, create } = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: ' Merhaba ' }] });
    const text = await new ClaudeMascot('claude-opus-5', client).text({ system: 's', prompt: 'p', effort: 'low' });
    expect(text).toBe('Merhaba');
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      model: 'claude-opus-5', output_config: { effort: 'low' }, fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'],
    }));
  });

  it('omits unsupported params for Haiku', async () => {
    const { client, create } = fakeClient({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'ok' }] });
    await new ClaudeMascot('claude-haiku-4-5', client).text({ system: 's', prompt: 'p', effort: 'low' });
    const arg = (create.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
    expect(arg.output_config).toEqual({});
    expect(arg).not.toHaveProperty('fallbacks');
  });

  it('returns null on refusal so the app uses its template', async () => {
    const { client } = fakeClient({ stop_reason: 'refusal', content: [] });
    expect(await new ClaudeMascot('claude-opus-5', client).text({ system: 's', prompt: 'p', effort: 'low' })).toBeNull();
  });
});
