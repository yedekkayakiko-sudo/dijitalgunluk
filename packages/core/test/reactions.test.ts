import { describe, expect, it } from 'vitest';
import { decideReaction, type ReactionInput } from '../src/reactions';
import type { Entry } from '../src/types';

const now = new Date('2026-09-25T21:00:00');
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const e = (text: string, h: number, extra: Partial<Entry> = {}) => ({
  text, createdAt: hoursAgo(h), privacy: 'ai_full' as const, kind: 'entry' as const, ...extra,
});

const base = (over: Partial<ReactionInput>): ReactionInput => ({
  entry: e('Bugün sakin bir gündü, akşam biraz kitap okudum ve erkenden uyudum, yarın için planlarım var.', 0),
  recent: [],
  knownEntities: [],
  pastReactions: [{ kind: 'welcome', at: '2026-01-01T00:00:00Z' }],
  tone: 'calm',
  now,
  random: () => 0, // always "roll" success
  ...over,
});

describe('decideReaction', () => {
  const earlier = { recent: [e('Dün sakin bir gündü.', 24)], pastReactions: [{ kind: 'welcome' as const, at: hoursAgo(48) }] };

  it('always welcomes the very first page', () => {
    expect(decideReaction(base({ pastReactions: [] })).kind).toBe('welcome');
    expect(decideReaction(base({ pastReactions: [], entry: e('ilk', 0, { privacy: 'private' }) }))).toMatchObject({ kind: 'welcome', aiAllowed: false });
  });

  it('is silent by default', () => {
    expect(decideReaction(base(earlier)).kind).toBe('none');
  });

  it('always answers a crisis, even for private entries, with on-device words only', () => {
    const d = decideReaction(base({ entry: e('yaşamak istemiyorum', 0, { privacy: 'private' }) }));
    expect(d.kind).toBe('crisis');
    expect(d.aiAllowed).toBe(false);
    expect(d.text).toContain('112');
  });

  it('lets the AI answer a crisis like a friend when the entry allows it', () => {
    const d = decideReaction(base({ entry: e('yaşamak istemiyorum', 0), pastReactions: [{ kind: 'crisis', at: hoursAgo(1) }] }));
    expect(d).toMatchObject({ kind: 'crisis', crisisLevel: 'acute', aiAllowed: true });
  });

  it('meets venting ("dayanamıyorum") with support, not an emergency', () => {
    const d = decideReaction(base({ entry: e('Artık dayanamıyorum bu işe, her gün aynı şey.', 0) }));
    expect(d).toMatchObject({ kind: 'support', crisisLevel: 'concern' });
    expect(d.text).not.toContain('112');
  });

  it('notices a hard day even right after another reaction', () => {
    const d = decideReaction(base({
      entry: e('Bugün çok kötü geçti, eve gelince ağladım. Kırıldım, bunaldım.', 0),
      pastReactions: [{ kind: 'new_person', at: hoursAgo(2), subject: 'Ali' }],
    }));
    expect(d.kind).toBe('support');
  });

  it('sometimes celebrates a joyful day', () => {
    const d = decideReaction(base({ entry: e('Bugün terfi aldım, çok mutluyum! Harika bir gündü, akşam kutladık.', 0) }));
    expect(d.kind).toBe('celebrate');
  });

  it('does not analyse private or read-only entries', () => {
    for (const privacy of ['private', 'ai_read'] as const) {
      const d = decideReaction(base({ entry: e('Bugün Zeynep ile tanıştım.', 0, { privacy }) }));
      expect(d.kind).toBe('none');
      expect(d.mentions).toEqual([]);
    }
  });

  it('asks about a new person', () => {
    const d = decideReaction(base({ entry: e('Bugün kafede Zeynep ile tanıştım, çok tatlıydı.', 0) }));
    expect(d.kind).toBe('new_person');
    expect(d.text).toContain('Zeynep');
  });

  it('does not ask about someone already known', () => {
    const d = decideReaction(base({
      entry: e('Bugün kafede Zeynep ile kahve içtik.', 0),
      knownEntities: [{ key: 'zeynep', name: 'Zeynep', kind: 'person' }],
    }));
    expect(d.kind).toBe('none');
  });

  it('nudges only after three short entries in a row', () => {
    expect(decideReaction(base({ entry: e('yorucu', 0), recent: [e('iyi', 24)] })).kind).toBe('none');
    const d = decideReaction(base({ entry: e('yorucu', 0), recent: [e('iyi', 24), e('idare eder', 48)] }));
    expect(d.kind).toBe('short_streak');
  });

  it('does not repeat the short-entry nudge within a week', () => {
    const d = decideReaction(base({
      entry: e('yorucu', 0),
      recent: [e('iyi', 24), e('idare eder', 48)],
      pastReactions: [{ kind: 'short_streak', at: hoursAgo(72) }],
    }));
    expect(d.kind).toBe('none');
  });

  it('observes a recurring theme without diagnosing', () => {
    const d = decideReaction(base({
      entry: e('Yine çok yorgunum, uykusuz bir gece daha geçirdim.', 0),
      recent: [e('Bugün de yorgun hissettim.', 24), e('Uyku düzenim bozuldu, bitkinim.', 48)],
    }));
    expect(d.kind).toBe('recurring_theme');
    expect(d.text).toMatch(/ister misin\?/);
  });

  it('respects the cooldown between reactions', () => {
    const d = decideReaction(base({
      entry: e('Bugün kafede Zeynep ile tanıştım.', 0),
      pastReactions: [{ kind: 'new_person', at: hoursAgo(5), subject: 'Ali' }],
    }));
    expect(d.kind).toBe('none');
    expect(d.mentions.map((m) => m.name)).toContain('Zeynep'); // still remembered
  });

  it('stays silent when the dice say so', () => {
    const d = decideReaction(base({ entry: e('Bugün kafede Zeynep ile tanıştım.', 0), random: () => 0.99 }));
    expect(d.kind).toBe('none');
  });
});
