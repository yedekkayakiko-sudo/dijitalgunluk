import { describe, expect, it } from 'vitest';
import { parseTimeWindow, searchEntries } from '../src/search';

const now = new Date('2026-09-25T12:00:00');

describe('parseTimeWindow', () => {
  it('parses "3 yıl önce"', () => {
    const w = parseTimeWindow('3 yıl önce tanıştığım çocuk kimdi?', now)!;
    expect(w.from.getFullYear()).toBe(2023);
    expect(w.to.getFullYear()).toBe(2024);
  });
  it('parses word numbers and months', () => {
    expect(parseTimeWindow('iki ay önce ne yapıyordum', now)!.from.getMonth()).toBe(6);
    const w = parseTimeWindow("Mart 2024'te nereye gitmiştim?", now)!;
    expect([w.from.getFullYear(), w.from.getMonth()]).toEqual([2024, 2]);
  });
  it('parses "geçen yaz" as the last finished summer', () => {
    const w = parseTimeWindow('geçen yaz tatilde kimle tanıştım', now)!;
    expect([w.from.getFullYear(), w.from.getMonth(), w.to.getMonth()]).toEqual([2026, 5, 8]);
  });
  it('returns null without a time hint', () => {
    expect(parseTimeWindow('Ayşe kimdi?', now)).toBeNull();
  });
});

describe('searchEntries', () => {
  const docs = [
    { id: 'a', createdAt: '2023-10-02T20:00:00', text: 'Kafede Emre diye bir çocukla tanıştım, fotoğraf çekiyordu.' },
    { id: 'b', createdAt: '2026-09-20T20:00:00', text: 'Yeni işyerinde bir çocukla tanıştım, adı Can.' },
    { id: 'c', createdAt: '2023-09-15T20:00:00', text: 'Bütün gün ders çalıştım.' },
  ];

  it('finds the entry matching both topic and time', () => {
    const hits = searchEntries('3 yıl önce tanıştığım çocuk kimdi?', docs, { now });
    expect(hits[0].id).toBe('a');
    expect(hits[0].inWindow).toBe(true);
  });

  it('understands questions about feelings, not just words', () => {
    const moodDocs = [
      { id: 'sad', createdAt: '2026-08-01T20:00:00', text: 'Toplantı berbattı, eve gelip ağladım.', mood: 1 },
      { id: 'happy', createdAt: '2026-08-02T20:00:00', text: 'Sahilde yürüdük, çok güldük.', mood: 5 },
      { id: 'plain', createdAt: '2026-08-03T20:00:00', text: 'Market alışverişi yaptım.', mood: 3 },
    ];
    expect(searchEntries('üzgün olduğum günler', moodDocs, { now })[0].id).toBe('sad');
    expect(searchEntries('en mutlu olduğum anlar', moodDocs, { now })[0].id).toBe('happy');
  });

  it('uses embeddings when available', () => {
    const withVec = docs.map((d, i) => ({ ...d, embedding: i === 2 ? [1, 0] : [0, 1] }));
    const hits = searchEntries('sınava hazırlık', withVec, { now, queryEmbedding: [1, 0] });
    expect(hits[0].id).toBe('c');
  });
});
