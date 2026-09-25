import { describe, expect, it } from 'vitest';
import { extractEntities, isUnlikelyPerson } from '../src/entities';

const names = (text: string, known = []) => extractEntities(text, known).map((e) => `${e.kind}:${e.name}`);

describe('extractEntities', () => {
  it('finds mid-sentence names and strips suffixes', () => {
    expect(names("Bugün Ayşe'yle kahve içtik, sonra Mehmet geldi.")).toEqual(['person:Ayşe', 'person:Mehmet']);
  });

  it('is careful with sentence-initial words', () => {
    expect(names('Sabah erken kalktım. Yağmur yağıyordu.')).toEqual([]);
    expect(names('Emre ile sinemaya gittik.')).toEqual(['person:Emre']);
  });

  it('recognises places and relations', () => {
    expect(names('Annemle birlikte hafta sonu İzmir’e gittik.')).toEqual(['place:İzmir', 'person:Annem']);
  });

  it('matches known entities even in lowercase', () => {
    const known = [{ key: 'ayse', name: 'Ayşe', kind: 'person' as const }];
    expect(names('ayşeyle konuştum', known)).toEqual(['person:Ayşe']);
  });

  it('ignores days, months and shouting', () => {
    expect(names('Dün Pazartesi değil miydi? Ocak ayı ÇOK soğuk.')).toEqual([]);
  });

  it('reads a real page correctly: titles, brands and shows are not people', () => {
    const page =
      'Bugün evden çalışma günümdü. Sabah uyandım. Babam akrabalarının düğüne gitti evde kardeşimleydim, kız kardeşimleydim. ' +
      'O uyuyordu bense çok yoğun bir gün olduğundan mütevellit sürekli telefondaydım. İnsan Kaynakları Uzmanı olarak çalışıyorum. ' +
      "Arkadaşımla ortak Claude hesabımız var. Seni tanıyorum dizisini izlerken projeler geliştirmeye çalıştım. " +
      'Sonra en yakın arkadaşımla dışarı çıktım gece.';
    expect(names(page).sort()).toEqual(['person:Babam', 'person:En yakın arkadaşım', 'person:Kız kardeşim']);
  });

  it('keeps names that come with a relation or a surname', () => {
    expect(names('İş arkadaşım Selin bugün terfi aldı.').sort()).toEqual(['person:Selin', 'person:İş arkadaşım'].sort());
    expect(names('Toplantıda Ayşe Yılmaz sunum yaptı.')).toEqual(['person:Ayşe Yılmaz']);
  });

  it('treats ambiguous names carefully', () => {
    expect(names('Deniz kenarında yürüdüm.')).toEqual([]);
    expect(names("Bugün Deniz'le konuştum.")).toEqual(['person:Deniz']);
    expect(names('Umut ediyorum ki yarın daha iyi olur.')).toEqual([]);
  });

  it('finds places from their suffixes', () => {
    expect(names("Geçen yaz Kıbrıs'ta direksiyona geçtim.")).toEqual(['place:Kıbrıs']);
    expect(names("Hafta sonu Lizbon'da olacağım.")).toEqual(['place:Lizbon']);
  });

  it('does not confuse everyday words with relations', () => {
    expect(names('Kocaman bir pasta yaptım.')).toEqual([]);
    expect(names('Kocamla sinemaya gittik.')).toEqual(['person:Kocam']);
  });

  it('flags leftovers from the old algorithm', () => {
    expect(isUnlikelyPerson('Kaynakları')).toBe(true);
    expect(isUnlikelyPerson('Uzmanı')).toBe(true);
    expect(isUnlikelyPerson('Claude')).toBe(true);
    expect(isUnlikelyPerson('Ayşe')).toBe(false);
  });
});
