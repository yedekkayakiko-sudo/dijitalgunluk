/*
 * KVKK texts shown in the app. Fill in the [BRACKETED] fields before
 * publishing and have them reviewed by a lawyer; docs/kvkk.md mirrors them.
 */

export const CONTROLLER = {
  name: '[GELİŞTİRİCİ ADI SOYADI]',
  email: '[E-POSTA ADRESİ]',
};

export const AYDINLATMA: [string, string][] = [
  ['Veri sorumlusu', `${CONTROLLER.name} (bireysel geliştirici). İletişim: ${CONTROLLER.email}`],
  [
    'Hangi veriler, nerede?',
    'Günlük sayfaların, fotoğrafların, ruh hali seçimlerin, mektupların, hedeflerin, maskotla yazışmaların ve maskotun seninle ilgili notları yalnızca kendi cihazında, şifreli olarak saklanır. Bunlara bizim erişimimiz yoktur.',
  ],
  [
    'Yapay zekâ açıkken ne işlenir?',
    'Yalnızca “tam analiz” ya da “görsün, analiz etmesin” olarak işaretlediğin sayfaların metni, maskotla yazışmaların ve maskotun seninle ilgili notları; maskotun sana yanıt verebilmesi, hatırlayabilmesi ve dönem mektubu yazabilmesi amacıyla işlenir. Gönderilmeden önce telefon, e-posta, kimlik, kart ve IBAN numaraları maskelenir; adın hiç gönderilmez. “Sadece ben” sayfaları, fotoğraflar ve konum hiçbir zaman gönderilmez.',
  ],
  [
    'Özel nitelikli veri',
    'Günlük yazıları duygu durumu ve sağlıkla ilgili bilgiler içerebilir. Bu veriler KVKK’da özel nitelikli kişisel veri sayılır ve yalnızca açık rızanla işlenir (KVKK m. 6).',
  ],
  [
    'Yurt dışına aktarım',
    'Yanıtlar, yapay zekâ hizmet sağlayıcısı Anthropic PBC (ABD) tarafından üretilir. Bu nedenle izin verdiğin metinler ABD’deki sunuculara aktarılır (KVKK m. 9). Aktarım yalnızca açık rızanla yapılır; rızanı istediğin an yapay zekâyı kapatarak geri alabilirsin. Anthropic, API üzerinden gönderilen verileri model eğitiminde kullanmaz.',
  ],
  [
    'Sunucumuz ne saklar?',
    'Sunucumuz metinleri yalnızca Anthropic’e iletir; içerik kaydetmez ve loglamaz. İzin verirsen, hiçbir kimlik ve metin içermeyen anonim kullanım sayıları (ör. “bugün 12 sayfa yazıldı”) tutulur.',
  ],
  ['Hukuki sebep ve toplama yöntemi', 'Veriler, uygulamaya senin yazdığın şekilde elektronik ortamda toplanır. Yapay zekâ ile işleme ve yurt dışına aktarım açık rızana (KVKK m. 5/1, 6/2, 9), uygulamanın temel işlevleri ise sözleşmenin ifasına (m. 5/2-c) dayanır.'],
  [
    'Hakların (KVKK m. 11)',
    `Verilerinin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarıldığı kişileri bilme, düzeltilmesini ya da silinmesini isteme, itiraz etme ve zararın giderilmesini talep etme hakkın vardır. Verilerin cihazında olduğu için çoğunu uygulama içinden kendin kullanabilirsin (Ayarlar → Tüm verilerimi sil, Beni nasıl tanıyor?). Diğer talepler için: ${CONTROLLER.email}`,
  ],
];

export const CONSENT_SPECIAL =
  'Günlük sayfalarımın ve maskotla yazışmalarımın duygu durumu ve sağlıkla ilgili bilgiler (özel nitelikli kişisel veri) içerebileceğini biliyorum. Bu verilerin, maskotun bana yanıt verebilmesi amacıyla işlenmesine açık rıza veriyorum.';

export const CONSENT_TRANSFER =
  'Bu amaçla, izin verdiğim sayfaların ve mesajlarımın yapay zekâ hizmet sağlayıcısı Anthropic PBC’nin ABD’deki sunucularına aktarılmasına açık rıza veriyorum. Aktarımın, Türkiye ile aynı düzeyde koruma sağlanmayabilecek bir ülkeye yapıldığını ve olası riskleri anladım.';
