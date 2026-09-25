import { CRISIS_RESOURCES, PROFESSIONAL_SUPPORT } from '@gunluk/core';
import { Gap, Screen, T } from '@/components/ui';
import { space } from '@/theme';

const SECTIONS: [string, string][] = [
  ['Verilerin nerede?', 'Sayfaların, fotoğrafların, mektupların, hedeflerin, sohbetin ve maskotun seninle ilgili notları sadece bu cihazda saklanır. Veritabanı, anahtarı telefonunun güvenli deposunda tutulan 256-bit bir anahtarla şifrelenir (SQLCipher). Hesap açman gerekmez.'],
  ['Yapay zekâ ne görür?', 'Yapay zekâ varsayılan olarak kapalıdır ve açık rızan olmadan açılmaz. Açıksa: sohbet mesajların, “tam analiz” ya da “görsün, analiz etmesin” sayfaların ve maskotun notları, yanıt üretmek için sunucumuz üzerinden Anthropic’in Claude modeline gider. “Sadece ben” sayfaları, fotoğraflar ve konum asla gitmez. Adın, telefon, e-posta, kimlik ve kart numaraları gönderilmeden önce gizlenir.'],
  ['Sunucu ne saklar?', 'Hiçbir metin saklamaz ve loglamaz. İzin verirsen yalnızca kimlik ve metin içermeyen günlük sayılar (ör. “bugün 12 sayfa yazıldı”) tutulur. Anthropic, API üzerinden gönderilen verileri model eğitiminde kullanmaz.'],
  ['Maskot seni nasıl tanıyor?', 'Birkaç sayfada bir, maskot seninle ilgili kısa notlar çıkarır (ör. “Ayşe en yakın arkadaşı”). Bu notlar cihazında durur; Ben → Beni nasıl tanıyor? ekranından hepsini görebilir, düzeltebilir ya da silebilirsin. Sağlık, din, siyaset ve kendine zarar verme gibi konular not edilmez.'],
  ['Maskot ne söylemez?', 'Sana asla teşhis ya da etiket koymaz, ilaç önermez. Bir dost gibi dinler, gözlemini paylaşır ve kararı sana bırakır. Bu kurallar hem cihazda hem sunucuda ayrıca denetlenir.'],
  ['Zor anlar', 'Dert yandığında maskot seni bir dost gibi dinler. Kendine zarar verme ya da ölüm düşüncesinden açıkça bahsedersen konuyu geçiştirmez: yanında kalır, güvende olup olmadığını sorar ve küçük bir destek satırı gösterir. Yapay zekâ açıksa bu mesajlar da yanıt üretmek için gönderilir; ama asla maskotun notlarına ya da aramaya eklenmez.'],
  ['Yedekleme', 'Yedek dosyası, senin belirlediğin şifreyle (scrypt + AES-256-GCM) kilitlenir. Şifre olmadan kimse, biz de dahil, açamaz.'],
  ['Konum', 'İsteğe bağlıdır. Sadece “Kadıköy, İstanbul” gibi kaba bir etiket saklanır; koordinat saklanmaz ve yapay zekâya gönderilmez.'],
  ['Silme hakkı', 'Tek bir sayfayı, bir kişiye dair hatırlananları, maskotun notlarını ya da tüm verilerini istediğin an kalıcı olarak silebilirsin.'],
];

export default function Privacy() {
  return (
    <Screen>
      {SECTIONS.map(([h, b]) => (
        <T key={h} v="body" style={{ marginBottom: space.m }}>
          <T v="heading">{h}{'\n'}</T>
          {b}
        </T>
      ))}
      <T v="heading">Destek kaynakları</T>
      <Gap h={space.s} />
      {CRISIS_RESOURCES.map((r) => (
        <T key={r.label} v="muted" style={{ marginBottom: space.s }}>
          {r.label}{r.phone ? ` (${r.phone})` : ''}: {r.note}
        </T>
      ))}
      <T v="muted" style={{ marginBottom: space.s }}>{PROFESSIONAL_SUPPORT}</T>
      <Gap />
      <T v="small">Bu uygulama bir sağlık hizmeti değildir ve profesyonel desteğin yerini tutmaz.</T>
    </Screen>
  );
}
