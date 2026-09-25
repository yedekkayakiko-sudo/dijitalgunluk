# KVKK notları (avukata götürülecek dosya)

> Ben avukat değilim. Bu dosya, bir KVKK avukatıyla yapılacak tek seferlik görüşmeyi hızlandırmak için hazırlandı. Uygulamadaki metinler `mobile/src/lib/legal.ts` dosyasında; yayından önce `[KÖŞELİ PARANTEZ]` alanlarını doldur.

## Mimarinin KVKK açısından güçlü yanları

- **Local-first:** Günlük verisi cihazda şifreli durur. Yapay zekâ kapalıyken veri sorumlusu olarak işlediğimiz hiçbir günlük içeriği yok.
- **Yapay zekâ varsayılan olarak kapalı:** Açmak için iki ayrı açık rıza gerekiyor.
- **Veri minimizasyonu:**
  - Kullanıcının adı hiç gönderilmez.
  - Telefon, e-posta, TCKN, IBAN ve kart numaraları cihazda maskelenir.
  - "Sadece ben" sayfaları, fotoğraflar ve konum gönderilmez.
- **Sunucu içerik saklamaz:** Loglarda içerik yok. Tek kalıcı veri, kimliksiz günlük sayılardır (anonim veri).
- **Silme ve itiraz uygulama içinden yapılır:** Tek sayfa, tek kişi, hafıza notları ya da her şey silinebilir. Rıza, yapay zekâ kapatılarak geri alınabilir.
- **Hafıza notlarında hassas konu yok:** Sağlık, din, siyaset, cinsel hayat ve kendine zarar verme konuları not edilmez.

## Avukata sorulacaklar

1. **Yurt dışına aktarım (m. 9):** Kullanıcı yapay zekâyı açtığında izin verilen metinler Anthropic'e (ABD) gidiyor.
   - 2024 değişikliğinden sonra açık rıza yalnızca *arızi* aktarımlar için bir dayanak olarak görünüyor.
   - Bu kullanım "arızi" sayılır mı? Sayılmazsa standart sözleşme gerekir mi, ve Anthropic'in ticari şartları/DPA'sı ile bu nasıl kurulur?
   - Standart sözleşme imzalanırsa Kurum'a 5 iş günü içinde bildirim gerekiyor.
2. **Özel nitelikli veri (m. 6):** Açık rıza metni yeterli mi? Aydınlatma metninden ayrı sunulması doğru mu? (Uygulamada ayrı ayrı iki onay kutusu var.)
3. **VERBİS:** Çalışan sayısı ve bilanço eşiklerinin altında kalınıyor. Ama "ana faaliyet özel nitelikli veri işleme" sayılırsa muafiyet kalkar mı?
4. **Bireysel geliştirici olarak veri sorumlusu olmak:** Hangi yükümlülükler ek olarak geliyor? Bir başvuru kanalı (e-posta) yeterli mi?
5. **Anonim istatistikler:** Kimliksiz, günlük toplam sayılar kişisel veri dışında kalıyor mu?
6. **Kriz anları:** Açıkça intihar düşüncesi yazan bir kullanıcının mesajı yapay zekâya gönderiliyor (kullanıcı yapay zekâyı açmışsa). Bu durumda ek bir bilgilendirme gerekir mi?

## Uygulamadaki metinler

### Aydınlatma metni

`mobile/src/lib/legal.ts` → `AYDINLATMA`. Uygulamada **Ayarlar → Aydınlatma metni** yolunda gösteriliyor.

### Açık rıza 1: özel nitelikli veri

> Günlük sayfalarımın ve maskotla yazışmalarımın duygu durumu ve sağlıkla ilgili bilgiler (özel nitelikli kişisel veri) içerebileceğini biliyorum. Bu verilerin, maskotun bana yanıt verebilmesi amacıyla işlenmesine açık rıza veriyorum.

### Açık rıza 2: yurt dışına aktarım

> Bu amaçla, izin verdiğim sayfaların ve mesajlarımın yapay zekâ hizmet sağlayıcısı Anthropic PBC'nin ABD'deki sunucularına aktarılmasına açık rıza veriyorum. Aktarımın, Türkiye ile aynı düzeyde koruma sağlanmayabilecek bir ülkeye yapıldığını ve olası riskleri anladım.

Metinler değişirse `CONSENT_VERSION` değeri artırılır ve kullanıcılardan yeniden onay istenir.
