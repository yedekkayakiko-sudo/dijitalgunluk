# Gizlilik Politikası: Pusula Günlük

*Son güncelleme: [TARİH]. Yayından önce köşeli parantez içindeki alanları doldur ve metni bir KVKK avukatına kontrol ettir (bkz. docs/kvkk.md).*

Pusula Günlük ("uygulama"), [GELİŞTİRİCİ ADI] tarafından bireysel olarak geliştirilmiştir. Günlüğün sana aittir. Bu politika, hangi verilerin nerede tutulduğunu ve ne zaman cihazından çıktığını açıklar.

## 1. Cihazında saklananlar

Şunlar **yalnızca cihazında** saklanır:
- günlük sayfaların ve fotoğrafların,
- ruh hali seçimlerin,
- geleceğe mektupların ve hedeflerin,
- maskotla sohbetin,
- maskotun seninle ilgili notları ve büyüme durumu.

Veritabanı, anahtarı cihazının güvenli deposunda tutulan 256-bit bir anahtarla şifrelenir. Bir hesap oluşturman gerekmez. Bu veriler bize ulaşmaz.

## 2. Yapay zekâ özelliği (isteğe bağlı, varsayılan olarak kapalı)

Yapay zekâ ancak iki ayrı açık rıza verirsen açılır:
1. özel nitelikli veri (duygu durumu ve sağlıkla ilgili içerik) işlenmesi,
2. yurt dışına aktarım.

Açıkken:
- **Gönderilenler:** "Tam analiz" ya da "görsün, analiz etmesin" olarak işaretlediğin sayfaların metni, maskotla sohbet mesajların ve maskotun seninle ilgili notları. Bunlar, maskotun yanıt verebilmesi için sunucumuz üzerinden Anthropic PBC'nin (ABD) Claude modeline gönderilir.
- **Gönderilmeden önce maskelenenler:** Adın hiç gönderilmez. Telefon, e-posta, TC kimlik, kart ve IBAN numaraları gizlenir.
- **Hiç gönderilmeyenler:** "Sadece ben" sayfaları, fotoğraflar ve konum.
- **Zor anlar:** Kendine zarar verme ya da intihar düşüncesi içeren sohbet mesajları da, maskotun seni yalnız bırakmadan yanıt verebilmesi için gönderilir. Bu metinler asla maskotun notlarına ya da aramaya eklenmez.
- **Sunucumuz:** Metinleri **saklamaz ve loglamaz**.
- **Anthropic:** API üzerinden gönderilen verileri model eğitiminde kullanmaz; güvenlik amacıyla sınırlı süre saklayabilir. Ayrıntılar: [anthropic.com/legal/privacy](https://www.anthropic.com/legal/privacy).
- **Anlamsal arama (isteğe bağlı):** Açıksa, izin verilen sayfaların metni Voyage AI'ya gönderilerek sayısal bir özet (embedding) oluşturulur. Bu özet yalnızca cihazında saklanır.

Rızanı istediğin an **Ayarlar → İzinlerim** yolundan geri alabilirsin.

## 3. Teknik veriler ve istatistikler

- **Kurulum kimliği:** Kötüye kullanımı önlemek için, rastgele oluşturulan bir kurulum kimliği yapay zekâ isteklerinde sunucuya gönderilir. Yalnızca saatlik istek sınırı için bellekte tutulur ve kaydedilmez.
- **Anonim istatistikler (isteğe bağlı):** "Bugün kaç sayfa yazıldı" gibi günlük toplam sayılardır. Hiçbir metin ya da kimlik içermez ve kurulum kimliği olmadan gönderilir.

## 4. Bildirimler

Hatırlatmalar telefonunda yerel olarak planlanır. Bunun için bir sunucu ya da bildirim servisi kullanılmaz.

## 5. Yapay zekâ yanıtını bildirme

Bir maskot mesajını "Bildir" ile işaretlersen, **yalnızca maskotun o mesajı** ve seçtiğin sebep incelenmek üzere gönderilir. Senin sayfan gönderilmez.

## 6. Yedekleme

Yedek dosyası, senin belirlediğin şifreyle (scrypt + AES-256-GCM) kilitlenir ve senin seçtiğin yere kaydedilir. Şifre olmadan kimse, biz de dahil, yedeği açamaz.

## 7. Silme hakkın

Şunları uygulama içinden istediğin an **kalıcı olarak** silebilirsin:
- tek bir sayfayı,
- maskotun bir kişiye dair hatırladıklarını,
- maskotun notlarını,
- sohbeti,
- ya da tüm verilerini.

Uygulamayı kaldırmak da tüm verileri siler. Sunucumuzda sana ait saklanan bir içerik yoktur.

## 8. Yaş sınırı

Uygulama 18 yaş ve üzeri kullanıcılar içindir.

## 9. Sağlık uyarısı

Uygulama bir sağlık hizmeti ya da tıbbi cihaz değildir, teşhis koymaz ve profesyonel desteğin yerini tutmaz. Acil durumlarda 112'yi ara.

## 10. İletişim ve KVKK başvuruları

[E-POSTA ADRESİ]
