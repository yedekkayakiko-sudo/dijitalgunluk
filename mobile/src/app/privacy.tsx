import { CRISIS_RESOURCES } from '@gunluk/core';
import { Gap, Screen, T } from '@/components/ui';
import { space } from '@/theme';

const SECTIONS: [string, string][] = [
  ['Verilerin nerede?', 'Sayfaların, fotoğrafların ve mektupların sadece bu cihazda saklanır. Veritabanı, anahtarı telefonunun güvenli deposunda tutulan 256-bit bir anahtarla şifrelenir (SQLCipher). Bir hesap açmana gerek yoktur.'],
  ['Yapay zekâ ne görür?', 'Yapay zekâ varsayılan olarak kapalıdır. Açarsan, sadece izin verdiğin sayfalar maskotun yanıt üretmesi için sunucumuza gönderilir. “Sadece ben” sayfaları asla gönderilmez. “Görsün, analiz etmesin” sayfaları sadece sen bir soru sorduğunda aranır; kişi, tema ya da tepki çıkarılmaz.'],
  ['Sunucu ne saklar?', 'Hiçbir şey. Sunucu, istekleri Anthropic’in Claude modeline iletir ve yanıtı geri döner; sayfa içeriği kaydedilmez ya da loglanmaz. Anthropic, API üzerinden gönderilen verileri model eğitiminde kullanmaz.'],
  ['Maskot ne söylemez?', 'Maskot sana asla bir teşhis koymaz, psikolojik ya da tıbbi yorum yapmaz. Sadece yazdıklarında gözlemlediğini, yargısız ve isteğe bağlı sorularla paylaşır. Bu kurallar hem cihazda hem sunucuda ayrıca denetlenir.'],
  ['Zor anlar', 'Yazdıklarında kendine zarar verme ya da intihar düşüncesine dair bir işaret görülürse maskot konuyu geçiştirmez; sakin bir şekilde destek kaynaklarını gösterir. Bu kontrol cihazında yapılır ve bu sayfalar hiçbir zaman yapay zekâya gönderilmez.'],
  ['Konum', 'Konum eklemek isteğe bağlıdır. Sadece “Kadıköy, İstanbul” gibi kaba bir etiket saklanır; koordinatlar saklanmaz.'],
  ['Silme hakkı', 'Tek bir sayfayı, bir kişiye dair hatırlananları ya da tüm verilerini istediğin an kalıcı olarak silebilirsin. Silinen veriler şifreli veritabanında üzerine yazılarak temizlenir.'],
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
      <Gap />
      <T v="small">Bu uygulama bir sağlık hizmeti değildir ve profesyonel desteğin yerini tutmaz.</T>
    </Screen>
  );
}
