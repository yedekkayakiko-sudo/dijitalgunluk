# Google Play'e ilk yayın rehberi

Bu liste Eylül 2026 itibarıyla hazırlandı. Google kuralları sık değişir; her adımda Play Console'daki güncel metni esas al.

## 0. Yayından önce vermen gereken kararlar

- [ ] **Uygulama adı** (Play'de en fazla 30 karakter). Çalışma adı: "Pusula Günlük".
- [ ] **Paket adı:** `mobile/app.json` içindeki `android.package`. Şu an `com.dijitalgunluk.pusula`. **İlk yüklemeden sonra değiştirilemez.**
- [ ] **Sunucu nereye kurulacak?** Örnekler: Fly.io, Render, Railway. `server/Dockerfile` hazır. Sunucunun adresini `mobile/eas.json` dosyasındaki `EXPO_PUBLIC_API_URL` alanına yaz.
- [ ] **Kriz hatları:** `packages/core/src/safety.ts` içindeki `CRISIS_RESOURCES` listesindeki numaraları yayından önce doğrula (112 ve ALO 183).

## 1. Geliştirici hesabı

1. [play.google.com/console](https://play.google.com/console) adresinden **kişisel** hesap aç. Tek seferlik 25 USD ücret alınır.
2. Kimlik ve telefon doğrulamasını tamamla (birkaç gün sürebilir).
3. **Önemli:** Yeni kişisel hesaplar, üretime (herkese açık yayına) çıkmadan önce **en az 12 test kullanıcısıyla, kesintisiz 14 gün kapalı test** yapmak zorunda. 12 kişilik listeni şimdiden hazırla: arkadaşlar, aile. Test edenlerin Gmail adreslerine ihtiyacın olacak.

## 2. Derleme (EAS)

```bash
cd mobile
npx eas-cli@latest login            # ücretsiz Expo hesabı
npx eas-cli@latest init             # projeyi Expo hesabına bağlar
npx eas-cli@latest build --profile preview --platform android      # önce kendi telefonunda dene (APK)
npx eas-cli@latest build --profile production --platform android   # Play için .aab
```

İmza anahtarını EAS senin için oluşturur ve saklar. Bu anahtarı kaybetme; EAS'te güvende durur.

## 3. Play Console'da uygulama oluşturma

**Uygulama içeriği** bölümündeki formlar:

| Form | Bu uygulama için yanıt |
|---|---|
| Gizlilik politikası | `docs/gizlilik-politikasi.md` dosyasını bir web sayfasında yayınla (GitHub Pages ücretsiz) ve URL'sini gir. |
| Uygulama erişimi | Giriş gerekmiyor, tüm özellikler erişilebilir. |
| Reklamlar | Reklam yok. |
| İçerik derecelendirmesi | Anketi doldur. Kullanıcı içeriği paylaşımı yok; yapay zekâ özelliği var. |
| Hedef kitle | **18 ve üzeri.** Uygulama zaten açılışta 18+ onayı istiyor. |
| Veri güvenliği | Aşağıdaki bölüme bak. |
| Sağlık uygulamaları beyanı | Ruh hali takibi nedeniyle bu form sorulabilir. "Tıbbi cihaz değil, teşhis koymaz" diye beyan et. |
| Yapay zekâ ile üretilen içerik | Uygulama içinden bildirme var: maskot mesajlarının altındaki "⚑ Bildir". |

### Veri güvenliği formu (taslak yanıtlar)

- **Veri toplanıyor mu?** Evet, ama sadece yapay zekâ açıkken ve sadece kullanıcının izin verdiği sayfalar için. Bunlar işlenip atılır, saklanmaz.
  - *Kişisel bilgiler / Diğer kullanıcı içeriği (günlük metni):* toplanıyor, geçici işleniyor, paylaşılmıyor (hizmet sağlayıcı Anthropic, "service provider" sayılır), isteğe bağlı.
  - *Fotoğraflar:* cihazdan çıkmıyor, toplanmıyor.
  - *Konum:* sadece "semt, şehir" etiketi cihazda saklanıyor, sunucuya gönderilmiyor. Bu sayfa yapay zekâya gönderilirse etiket gitmez; sadece metin gider.
  - *Uygulama etkinliği / tanımlayıcılar:* rastgele bir kurulum kimliği yalnızca hız sınırlaması için kullanılıyor.
- **Aktarım sırasında şifreleniyor mu?** Evet (HTTPS). Sunucun HTTPS kullanmalı.
- **Kullanıcı verilerinin silinmesini isteyebilir mi?** Evet: uygulama içinden anında ve kalıcı olarak.

## 4. Mağaza sayfası

- **Kısa açıklama** (80 karakter): "Seni tanıyan, nazik bir maskotla şifreli, yapay zekâ destekli dijital günlük."
- **Uzun açıklama:** README'deki özellik listesinden, samimi bir dille yaz. "Terapi", "tedavi", "teşhis" gibi tıbbi iddialardan kaçın.
- **Grafikler:** 512×512 simge (`mobile/assets/images/icon.png` 1024×1024, küçültmen yeterli), 1024×500 öne çıkan görsel, en az 2 telefon ekran görüntüsü.

## 5. Test ve yayın sırası

1. **Dahili test:** kendin ve 1-2 kişiyle hızlı deneme.
2. **Kapalı test:** 12+ kişi, **14 gün kesintisiz**. Bu sürede gelen geri bildirimleri düzelt.
3. **Üretim erişimi başvurusu:** Play Console birkaç soru sorar (test nasıl geçti, neler değişti).
4. **Üretim:** önce kademeli yayın (%10 → %50 → %100).

## 6. Yayından önce son kontrol

- [ ] Sunucuda `ANTHROPIC_API_KEY` ve `APP_KEY` ayarlı, HTTPS açık.
- [ ] Kriz numaraları doğrulandı.
- [ ] Gizlilik politikası URL'si çalışıyor ve uygulamadaki metinle tutarlı.
- [ ] Gerçek bir Android telefonda: sayfa yaz, fotoğraf ekle, uygulamayı kapatıp aç (taslak geri geliyor mu?), "tüm verilerimi sil" çalışıyor mu?
- [ ] Yapay zekâ kapalıyken uygulama tamamen çalışıyor mu? (Çalışması gerekir.)
