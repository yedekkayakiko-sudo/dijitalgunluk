/*
 * Demo server with a scripted, offline "mascot" — no API key, no cost.
 * Useful for trying the app's AI flows end to end:  npx tsx scripts/demo-server.ts
 */
import { serve } from '@hono/node-server';
import type { Mascot, TextRequest } from '../src/ai';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { MemorySink } from '../src/events';
import { MemoryQuotaStore } from '../src/quota';

const lastUser = (req: TextRequest) => req.messages[req.messages.length - 1].content;

function chatReply(req: TextRequest): string {
  const ids = [...req.task.matchAll(/<page id="([^"]+)"/g)].map((m) => m[1]);
  const crisis = req.task.includes('KRİZ NOTU') || /veda|biriktir/i.test(lastUser(req));
  const text = crisis
    ? 'Bunu bana söylediğin için iyi ki söyledin. Buradayım, bir yere gitmiyorum. Sana açıkça sormak istiyorum: şu an kendine zarar vermeyi düşünüyor musun? Güvende değilsen lütfen hemen 112\'yi ara ya da yanındaki birine haber ver.'
    : ids.length
      ? 'Hatırlıyorum! Kafede Zeynep ile tanışmıştın; saatlerce kitaplardan konuşmuş, eve dönerken yağmura yakalanmıştın. Yağmuru umursamaman çok senlik bir detaydı. 🌧'
      : 'Anlattığın için teşekkürler. Biraz daha açar mısın, en çok hangi kısmı yordu seni?';
  return `${text}\n⟦sayfalar: ${crisis ? '' : ids.slice(0, 1).join(',')}; risk: ${crisis ? 'kriz' : 'yok'}⟧`;
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
    if (req.task.includes('KRİZ NOTU')) return 'Bunu bana yazdığın için iyi ki yazdın. Buradayım ve seni dinliyorum. Şu an güvende misin? Kendini güvende hissetmiyorsan lütfen hemen 112\'yi ara ya da yanındaki birine haber ver.';
    if (req.task.includes('Kalp kırıklığı modu')) return 'Bu konuyu açman cesaret istiyor. Öbür yolda da kolay günler seni beklemiyordu: o şehirde tanıdığın kimse olmayacaktı ve ilişkinizdeki sorular muhtemelen seninle birlikte taşınacaktı. O gün, o günkü bilginle karar verdin. Bu süreçte neye ihtiyacın olduğunu daha net görüyorsun. Bugün elinde olan küçük adım ne olabilir? Her zaman bir çıkış yolu var.';
    if (req.task.includes('Alternatif senaryo')) return 'Ya çay yerine kahve içseydin? Belki toplantıda göz kapakların bu kadar ağırlaşmazdı ama öğleden sonra kalbin küt küt atardı. Yürüyüşte gördüğün o sokak kedisini de kaçırırdın belki. Bence çay iyi seçimdi. ☕';
    if (req.task.includes('mektup')) return 'Sevgili {AD},\n\nBu hafta sayfalarında Zeynep\'in adı sık geçti ve her seferinde satırların biraz daha aydınlandı. Yorgun günlerin de oldu ama yine de yazmaya devam ettin. Bu, kendine verdiğin sessiz bir sözün işareti.\n\nGelecek hafta da buradayım.';
    if (req.task.includes('ilk günlük sayfası')) {
      const note = /- Hayatındaki önemli insanlar: (.+)/.exec(req.task)?.[1];
      return `İlk sayfan! 🌱 ${note ? `${note} hakkında anlattıklarını unutmadım; ` : ''}seni tanımaya başladım bile. Hoş geldin.`;
    }
    if (req.task.includes('zor bir gün')) return 'Bugün seni çok yormuş gibi. İyi ki yazdın. Anlatmak istersen buradayım, acele yok.';
    if (req.task.includes('ilk kez bir isim')) return 'Zeynep ile tanışmanız nasıl oldu? Kafede kitaplardan konuşmanız çok tatlı geldi. 📚';
    return 'Bunu benimle paylaştığın için teşekkürler. 🌱';
  },
  async json(req) {
    if (req.task.includes('kişileri ve yerleri çıkar')) {
      const names = [...lastUser(req).matchAll(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})(?=['’]|\s+ile|\s+ve)/g)].map((m) => ({ name: m[1] }));
      return { people: names, places: [] } as never;
    }
    if (req.task.includes('hafıza notlarını')) {
      return { notes: [{ category: 'kisi', text: 'Zeynep ile kafede tanıştı; kitaplar üzerine konuşmayı seviyorlar.' }, { category: 'iyi_gelen', text: 'Yağmurda yürümek ona iyi geliyor.' }] } as never;
    }
    const ids = [...req.task.matchAll(/<page id="([^"]+)"/g)].map((m) => m[1]);
    const crisis = req.task.includes('KRİZ NOTU');
    const reply = crisis
      ? 'Bunu bana söylediğin için iyi ki söyledin. Buradayım, bir yere gitmiyorum. Sana açıkça sormak istiyorum: şu an kendine zarar vermeyi düşünüyor musun? Güvende değilsen lütfen hemen 112\'yi ara ya da yanındaki birine haber ver.'
      : ids.length
        ? 'Hatırlıyorum! 25 Eylül\'de kafede Zeynep ile tanışmıştın; saatlerce kitaplardan konuşmuş, eve dönerken yağmura yakalanmıştın. Yağmuru umursamaman çok senlik bir detaydı. 🌧'
        : 'Anlattığın için teşekkürler. Biraz daha açar mısın, en çok hangi kısmı yordu seni?';
    return { reply, used_page_ids: crisis ? [] : ids.slice(0, 1) } as never;
  },
};

const config = loadConfig({ ...process.env, HOURLY_LIMIT: '10000' });
const app = createApp({ config, voice: demo, fast: demo, embedder: null, events: new MemorySink(), quotas: new MemoryQuotaStore() });
const port = Number(process.env.PORT ?? 8799);
serve({ fetch: app.fetch, port }, () => console.log(`demo mascot server on :${port} (scripted, offline)`));
