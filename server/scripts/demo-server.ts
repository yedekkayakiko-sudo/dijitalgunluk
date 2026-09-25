/*
 * Demo server with a scripted, offline "mascot" — no API key, no cost.
 * Shows the app's AI flows end to end; it is NOT the real mascot's voice.
 * npx tsx scripts/demo-server.ts
 */
import { serve } from '@hono/node-server';
import type { Mascot, TextRequest } from '../src/ai';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { MemorySink } from '../src/events';
import { MemoryQuotaStore } from '../src/quota';

const lastUser = (req: TextRequest) => req.messages[req.messages.length - 1].content;

/*
 * Every reply starts with "Demo:" so nobody mistakes these canned lines for
 * the real mascot. They never invent people or memories: when pages are
 * given, the demo only quotes the first sentence of the first one.
 */
const DEMO = 'Demo: ';
const CRISIS = 'Bunu bana söylediğin için iyi ki söyledin. Buradayım, bir yere gitmiyorum. Sana açıkça sormak istiyorum: şu an kendine zarar vermeyi düşünüyor musun? Güvende değilsen lütfen hemen 112\'yi ara ya da yanındaki birine haber ver.';

function pages(task: string): { id: string; text: string }[] {
  return [...task.matchAll(/<page id="([^"]+)"[^>]*>\n([\s\S]*?)\n<\/page>/g)].map((m) => ({ id: m[1], text: m[2] }));
}

function firstSentence(text: string): string {
  const s = text.split(/(?<=[.!?…])\s/)[0] ?? text;
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
}

function chatReply(req: TextRequest): string {
  const found = pages(req.task);
  const crisis = req.task.includes('KRİZ NOTU') || /veda|biriktir/i.test(lastUser(req));
  const text = crisis
    ? CRISIS
    : found.length
      ? `Sayfalarında buna en yakın şunu buldum: “${firstSentence(found[0].text)}” Gerçek maskot burada o günle bugünü bağlayıp sana bir soru sorardı.`
      : 'Anlattığın için teşekkürler. Gerçek maskot burada seni anlamak için tek, isabetli bir soru sorardı. Mesela: en çok hangi kısmı yordu seni?';
  return `${DEMO}${text}\n⟦sayfalar: ${crisis ? '' : found.slice(0, 1).map((p) => p.id).join(',')}; risk: ${crisis ? 'kriz' : 'yok'}⟧`;
}

const demo: Mascot = {
  async stream(req, onText) {
    const full = chatReply(req);
    await new Promise((r) => setTimeout(r, 900)); // "thinking" before the first word
    for (const word of full.split(/(?<= )/)) {
      onText(word);
      await new Promise((r) => setTimeout(r, 45));
    }
    return full;
  },
  async text(req) {
    if (req.task.includes('KRİZ NOTU')) return DEMO + CRISIS;
    if (req.task.includes('Kalp kırıklığı modu')) return `${DEMO}Bu, kalp kırıklığı modunun hazır bir örneği. Gerçek maskot senin sayfandaki seçimi bulur, öbür yolu bedelleriyle dürüstçe yürür ve bugün atabileceğin küçük bir adımla biter. Her zaman bir çıkış yolu vardır.`;
    if (req.task.includes('Alternatif senaryo')) return `${DEMO}Bu, hafif modun hazır bir örneği. Gerçek maskot senin sayfandaki küçük bir seçimi bulup "Ya … seçseydin?" diye kısa, eğlenceli bir hayal kurar.`;
    if (req.task.includes('mektup')) return `${DEMO}Sevgili {AD},\n\nBu, dönem mektubunun hazır bir örneği. Gerçek maskot bu dönemin sayfalarından, en çok andığın insanlardan ve tekrar eden konulardan sana içten bir mektup yazar.`;
    if (req.task.includes('ilk günlük sayfası')) return `${DEMO}İlk sayfan! Seni tanımaya başladım bile. Hoş geldin.`;
    if (req.task.includes('zor bir gün')) return `${DEMO}Bugün seni yormuş gibi. Gerçek maskot burada sayfandaki ayrıntıyı görür, dürüst bir gözlem paylaşır ve tek bir soru sorardı.`;
    if (req.task.includes('ilk kez bir isim')) return `${DEMO}Yeni bir isim duydum. Onunla nasıl tanıştınız?`;
    return `${DEMO}Bunu benimle paylaştığın için teşekkürler.`;
  },
  async json(req) {
    if (req.task.includes('kişileri ve yerleri çıkar')) return { people: [], places: [] } as never;
    if (req.task.includes('hafıza notlarını')) return { notes: [] } as never;
    const found = pages(req.task);
    return { reply: chatReply(req).split('\n⟦')[0], used_page_ids: found.slice(0, 1).map((p) => p.id) } as never;
  },
};

const config = loadConfig({ ...process.env, HOURLY_LIMIT: '10000' });
const app = createApp({ config, voice: demo, fast: demo, embedder: null, events: new MemorySink(), quotas: new MemoryQuotaStore() });
const port = Number(process.env.PORT ?? 8799);
serve({ fetch: app.fetch, port }, () => console.log(`demo mascot server on :${port} (scripted, offline — replies start with "Demo:")`));
