import { THEMES } from './emotion';

/*
 * "Günün sorusu": one small, personal writing prompt per day, so the page is
 * never blank. Deterministic per date, computed on the device (free).
 */

const GENERAL = [
  'Bugün seni gülümseten küçük bir şey neydi?',
  'Bugün kendin için yaptığın bir iyilik var mı?',
  'Şu an aklından en çok geçen düşünce ne?',
  'Bugün neye teşekkür etmek istersin?',
  'Bugünün sesi, kokusu ya da rengi neydi?',
  'Bugün seni şaşırtan bir şey oldu mu?',
  'Bugün kime daha çok vakit ayırmak isterdin?',
  'Bugün vücudun sana ne söyledi: yorgun muydu, dinç mi?',
  'Bugün ertelediğin bir şey var mı? Neden olabilir?',
  'Bir yıl sonra bu günden neyi hatırlamak isterdin?',
  'Bugün öğrendiğin küçük bir şey neydi?',
  'Bugün seni ne zorladı, onunla nasıl başa çıktın?',
  'Bugün kendinle gurur duyduğun bir an oldu mu?',
  'Bu hafta seni en çok ne yordu, en çok ne dinlendirdi?',
  'Şu an bir kelimeyle nasılsın? Neden o kelime?',
  'Bugün birine söylemek isteyip söyleyemediğin bir şey var mı?',
  'Bugün hangi an keşke biraz daha uzun sürseydi?',
  'Çocukluğundan bugün aklına gelen bir anı var mı?',
  'Şu an kendine bir tavsiye verecek olsan ne derdin?',
  'Bugün seni ne sakinleştirdi?',
  'Yarın için küçük bir dileğin var mı?',
  'Bugün ne dinledin, ne izledin, ne okudun?',
  'Bugün evden çıktığında gözüne ne çarptı?',
  'Bugün seni kim düşündü, sen kimi düşündün?',
];

const THEMED: Record<string, string> = {
  is: 'İşte bugün seni en çok ne meşgul etti?',
  okul: 'Derslerle aran bugün nasıldı?',
  aile: 'Ailenden biriyle bugün nasıl bir an yaşadın?',
  arkadaslik: 'Arkadaşlarınla son zamanlarda aklında kalan bir an var mı?',
  iliski: 'İlişkinde bugün seni ne düşündürdü?',
  yorgunluk: 'Son günlerde dinlenmek için kendine alan açabildin mi?',
  endise: 'Seni endişelendiren şeylerden hangisi senin elinde, hangisi değil?',
  yalnizlik: 'Bugün kiminle birkaç cümle konuşmak iyi gelirdi?',
  hareket: 'Bugün vücudunu nasıl hareket ettirdin?',
  keyif: 'Bugün kendine hangi küçük keyfi yaşattın?',
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface PromptContext {
  now?: Date;
  /** Recent theme ids (see THEMES). */
  themes?: string[];
  /** Recently mentioned people's names. */
  people?: string[];
  /** Text of the active goal, if any. */
  goal?: string | null;
}

export function dailyPrompt(ctx: PromptContext = {}): string {
  const now = ctx.now ?? new Date();
  const seed = hash(`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`);
  const options: string[] = [...GENERAL];
  for (const t of ctx.themes ?? []) if (THEMED[t] && THEMES[t]) options.push(THEMED[t], THEMED[t]);
  for (const p of (ctx.people ?? []).slice(0, 3)) options.push(`${p} ile en son ne konuştunuz?`);
  if (ctx.goal) options.push(`"${ctx.goal}" hedefin için bugün küçük bir adım attın mı?`);
  return options[seed % options.length];
}
