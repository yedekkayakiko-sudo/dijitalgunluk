import { describe, expect, it } from 'vitest';
import { classifySeverity, detectCrisis, isSafeMascotText } from '../src/safety';

describe('detectCrisis', () => {
  it.each([
    'Artık yaşamak istemiyorum.',
    'Bazen intihar etmeyi düşünüyorum',
    'Kendime zarar vermek istiyorum',
    'Hayatıma son vermek istiyorum',
    'ölsem kimse fark etmez',
    'KENDİMİ ÖLDÜRMEK istiyorum',
    'yasamak istemiyorum artik', // typed without Turkish letters
  ])('flags acute: %s', (text) => {
    expect(detectCrisis(text).level).toBe('acute');
  });

  it('still flags real intent next to figurative speech', () => {
    expect(detectCrisis('Gülmekten öldüm ama gerçekten ölmek istiyorum bazen.').level).toBe('acute');
  });

  it('flags concern', () => {
    expect(detectCrisis('Artık dayanamıyorum, her şey üstüme geliyor').level).toBe('concern');
  });

  it.each([
    'Bugün çok güzel oldu, kahve içtik.',
    'Film çok iyiydi, ölüp bittim gülmekten değil ama eğlendim',
    'Dizide karakter intikam aldı',
    'Olsa da olmasa da fark etmez.',
    'Utançtan ölmek istiyorum, herkesin önünde düştüm!',
    'Gülmekten öldüm, sıcaktan ölüyorum burada.',
  ])('does not flag everyday text: %s', (text) => {
    expect(detectCrisis(text).level).toBe('none');
  });
});

describe('classifySeverity', () => {
  it.each([
    'Dün sevgilimle ayrıldık.',
    'Dedem geçen hafta vefat etti',
    'Babam öldü',
    'Bu karardan çok pişmanım',
    'Annemin kanser olduğunu öğrendik',
    'İşten çıkarıldım',
    'Trafik kazası geçirdik',
  ])('serious: %s', (text) => {
    expect(classifySeverity(text)).toBe('serious');
  });

  it.each([
    'Sabah kahve yerine çay içtim, fena olmadı.',
    'Bugün güzel oldu, yürüyüşe çıktık.',
    'Maçı kazandık!',
  ])('light: %s', (text) => {
    expect(classifySeverity(text)).toBe('light');
  });
});

describe('isSafeMascotText', () => {
  it('rejects diagnostic language', () => {
    expect(isSafeMascotText('Bence depresyondasın.')).toBe(false);
    expect(isSafeMascotText('Anksiyeten var gibi görünüyor')).toBe(false);
    expect(isSafeMascotText('Ruh halin bozuk bu aralar')).toBe(false);
  });
  it('accepts observational language', () => {
    expect(isSafeMascotText('Son birkaç sayfanda yorgunluk sık geçiyor, konuşmak ister misin?')).toBe(true);
  });
});
