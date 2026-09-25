import { describe, expect, it } from 'vitest';
import { extractEntities } from '../src/entities';

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
});
