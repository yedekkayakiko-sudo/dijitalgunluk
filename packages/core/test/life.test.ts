import { describe, expect, it } from 'vitest';
import { insightsFor } from '../src/insights';
import { keepsakeFor } from '../src/keepsakes';
import { traitsFor } from '../src/traits';
import type { Entry, Mood } from '../src/types';

let n = 0;
const page = (text: string, at: string, mood: Mood | null = 3, extra: Partial<Entry> = {}): Entry => ({
  id: `e${n++}`, createdAt: at, updatedAt: at, kind: 'entry', text, mood, weather: null, place: null, photos: [], privacy: 'ai_full', ...extra,
});

describe('keepsakes', () => {
  it('picks what the day was about', () => {
    expect(keepsakeFor(page('Sabah kafede kahve içtim, sonra toplantıya girdim.', '2026-03-01T10:00:00')).glyph).toBe('☕');
    expect(keepsakeFor(page('Mesai 21e kadar sürdü, sonra en yakın arkadaşımla çıktım.', '2026-03-01T22:00:00')).glyph).toBe('💼');
    expect(keepsakeFor(page('Bugün annemin doğum günüydü!', '2026-03-01T22:00:00', 5)).glyph).toBe('🎂');
    expect(keepsakeFor(page("Bugün evden çalışma günümdü. Babam akrabalarının düğüne gitti. Mesai 17.30'da bitiyordu ama 21'e kadar bilgisayardaydım.", '2026-03-01T22:00:00', 2)).glyph).toBe('💼');
  });

  it('falls back to the mood, and heavy pages get a quiet candle', () => {
    expect(keepsakeFor(page('Sıradan bir gündü.', '2026-03-01T10:00:00', 4)).glyph).toBe('🌼');
    expect(keepsakeFor(page('Artık yaşamak istemiyorum.', '2026-03-01T10:00:00', 1)).glyph).toBe('🕯️');
    expect(keepsakeFor(page('Doğum günümdü ama berbattı.', '2026-03-01T10:00:00', 1)).glyph).not.toBe('🎂');
  });
});

describe('traits', () => {
  it('takes after the writer: a night owl coffee lover', () => {
    const entries = Array.from({ length: 8 }, (_, i) => page(i % 2 ? 'Gece yine kahve içip yazdım.' : 'Uzun bir gün, kahve şart.', `2026-03-0${i + 1}T23:30:00`));
    const ids = traitsFor({ entries, distinctPeople: 1, distinctPlaces: 0 }).map((t) => t.id);
    expect(ids).toContain('night_owl');
    expect(ids).toContain('coffee');
  });

  it('says nothing until it knows the person a little, and never reads private pages', () => {
    expect(traitsFor({ entries: [page('kahve', '2026-03-01T10:00:00')], distinctPeople: 0, distinctPlaces: 0 })).toEqual([]);
    const hidden = Array.from({ length: 8 }, (_, i) => page('kahve kahve', `2026-03-0${i + 1}T12:00:00`, 3, { privacy: 'private' }));
    expect(traitsFor({ entries: hidden, distinctPeople: 0, distinctPlaces: 0 }).map((t) => t.id)).not.toContain('coffee');
  });
});

describe('insights', () => {
  it('unlocks observations as pages accumulate', () => {
    const few = insightsFor([page('iş toplantı', '2026-03-01T21:00:00'), page('iş mesai', '2026-03-02T21:00:00')], []);
    expect(few.every((c) => !c.unlocked)).toBe(true);
    expect(few[0].unlockAt).toBe(3);
  });

  it('finds the person around whom days are brighter and what drains energy', () => {
    const entries = [
      ...Array.from({ length: 6 }, (_, i) => page('Mesai uzadı, toplantı bitmedi.', `2026-03-${10 + i}T21:00:00`, 2)),
      ...Array.from({ length: 6 }, (_, i) => page('Akşam yürüyüş yaptım, spor iyi geldi.', `2026-03-${20 + i}T20:00:00`, 5)),
    ];
    const cards = insightsFor(entries, [{ name: 'Ayşe', mentionCount: 3, moodSum: 14, moodCount: 3 }]);
    const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
    expect(byId.rhythm.unlocked).toBe(true);
    expect(byId.bright_person.text).toContain('Ayşe');
    expect(byId.energy.text).toMatch(/spor ve hareket/i);
    expect(byId.energy.text).toContain('iş');
    expect(byId.trend.unlocked).toBe(false);
  });
});
