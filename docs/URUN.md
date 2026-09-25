# Ürün: Pusula Günlük

## Tek cümlede

Seni tanıdıkça büyüyen, zor günlerde bir dost gibi yanında olan, geçmişini hatırlayan tatlı bir maskotla şifreli dijital günlük.

## İlkeler (her karar bunlara göre verilir)

1. **Maskot uygulamanın kalbi.** Büyür, yaşlanır, sevilir, sallanınca başı döner, yazınca su içer. İnsanlar bir not defterine değil, onu tanıyan bir karaktere geri döner.
2. **Dost, terapist değil.** Dinler, hatırlar, dürüst konuşur, kararı sana bırakır. Asla teşhis koymaz. Zor anlarda da bir dost gibi yanında kalır; yalnızca açık kriz dilinde küçük bir destek satırı gösterir.
3. **Suçluluk yok, kıyas yok, kayıp yok.** Seri kırılmaz, maskot solmaz ya da ölmez, sıralama tablosu yoktur. Yazılmayan günler "boşluk"tur.
4. **Mahremiyet ürünün kendisi.** Günlük cihazda şifreli durur, yapay zekâ isteğe bağlıdır, her şey silinebilir.
5. **Hedef "uygulamada kalmak" değil, "geri gelmek istemek".** İyi oluş uygulamasında süre maksimize edilmez.

## Kuzey yıldızı ve ölçüler

- **Kuzey yıldızı:** Haftada en az 3 gün yazan kullanıcı sayısı.
- **Geri dönüş:** 1., 7. ve 30. gün (hedef: D7 %25 ve üzeri, D30 %12 ve üzeri).
- **Sağlık göstergeleri:**
  - Yapay zekâyı açan kullanıcıların oranı
  - Sohbet başlatanların oranı
  - "Bildir" sayısı (0'a yakın olmalı)
  - Kota dolan kullanıcı sayısı (Pusula+ için sinyal)

Hepsi anonim, kimliksiz sayılardan okunur (`docs/DEPLOY.md`).

## İş modeli

**v1.0:** Tamamen ücretsiz. Günlük yapay zekâ kotasıyla (12 sohbet, 3 senaryo, 3 mektup) maliyet kontrol altında tutuluyor.

**v1.1:** Pusula+ aboneliği. İlke: "ücretsiz ama kaliteli, devamlılık için ödemeye değer".

| | Ücretsiz | Pusula+ |
|---|---|---|
| Yazma, fotoğraf, takvim, mektuplar, hedef zinciri, nefes, yedek | ✅ sınırsız | ✅ |
| Maskotun büyümesi ve tepkileri | ✅ | ✅ |
| Sohbet | Günde 12 mesaj | Sınırsız |
| Alternatif senaryo, dönem mektubu | Günde 3 | Sınırsız, haftalık otomatik mektup |
| Maskot kıyafetleri ve türleri, yıllık "hayatının filmi" | | ✅ |

- **Fiyat önerisi:** Aylık ₺79–99, yıllık ₺599–749, 7 gün deneme.
- **Ödeme altyapısı:** Google Play Billing + RevenueCat.
- **Vergi:** Bireysel gelir için GVK 20/B istisnası; mali müşavire doğrulat.
- **Reklam yok, veri satışı yok.** Bu, mahremiyet vaadinin parçası.

## Maliyet (Sonnet 5 maskotun sesi, Haiku 4.5 çıkarım)

| | Kullanıcı başına / ay |
|---|---|
| Sadece yazan (tepki, not, mektup) | ~$0,35 |
| Düzenli sohbet eden | ~$0,85 |
| Ücretsiz kotayı her gün sonuna kadar kullanan (en kötü durum) | ~$6–8 |

- **100 kullanıcı:** Gerçekçi senaryoda (30–40 aktif) ayda $15–30.
- **Maliyeti düşüren önlemler:**
  - Karakter dosyası önbelleğe alınır; her çağrıda ~%10 fiyatına okunur.
  - Dönem mektupları dönem başına bir kez üretilir.
  - İsim/yer çıkarımı en ucuz modelle yapılır.
- **Sigorta:** Anthropic konsolundaki aylık harcama limiti. Limit dolarsa maskot hazır metinlere geçer, uygulama bozulmaz.
- **Sunucu:** Cloudflare ücretsiz planı, $0.

## SWOT

| **Güçlü yanlar** | **Zayıf yanlar** |
|---|---|
| Veriler cihazda ve şifreli | İlk uygulama, tek kişi |
| Seni tanıyan, Türkçe konuşan, büyüyen bir maskot | Maskot çizimi henüz profesyonel değil |
| Etik öncelikli tasarım ve test seti | Şifreli yedek elle alınıyor, otomatik bulut yedeği yok |
| Sunucu maliyeti sıfır | Gerçek telefonlarda henüz test edilmedi |
| **Fırsatlar** | **Tehditler** |
| Türkçe, karakterli, yapay zekâlı günlük alanı boş | ChatGPT ve Gemini'ye hafıza özellikleri geliyor |
| İnsanlar dertlerini zaten Gemini ve ChatGPT'ye anlatıyor: talep kanıtlanmış | Bir kriz anında yaşanacak bir güvenlik olayı |
| Sevimli karakterler sosyal medyada kendiliğinden yayılır | KVKK yurt dışı aktarım kuralları |
| Hedef zinciri ve alternatif senaryo gibi farklılaştırıcılar | Maliyet dolar, gelir TL: kur riski |

## En büyük 5 risk ve önlemleri

1. **Kriz anında zarar.**
   - Açık kriz dilinde maskot özel protokolle yanıt verir ve küçük destek satırı her zaman çıkar.
   - Mecazlar ("gülmekten öldüm") ayrılır; "gerçekten ölmek istiyorum" gibi zarflar gözden kaçmaz.
   - Test setinde kriz senaryoları var.
2. **KVKK.** Mimari veri minimizasyonuna dayanıyor; yayından önce tek seferlik avukat görüşmesi yapılmalı (`docs/kvkk.md`).
3. **Veri kaybı.** Şifreli yedek var. v1.1'de otomatik Google Drive yedeği ve aylık yedek hatırlatması gelecek.
4. **Maliyet ya da kötüye kullanım.** Kotalar, uygulama anahtarı, hız sınırı ve harcama limiti var. v1.1'de Play Integrity eklenecek.
5. **Yenilik etkisinin geçmesi (2. haftada bırakma).**
   - Maskotun büyümesi ve doğum günleri, hedef zinciri, "bu tarihte" anıları, günün sorusu ve nazik hatırlatmalar bunu karşılamak için tasarlandı.
   - Kapalı testte ölçülecek.

## Yol haritası

**v1.0 (bu sürüm, kapalı teste çıkacak):**
- Büyüyen, yaşlanan ve etkileşimli maskot (su verme, sevme, sarılma, sallama)
- Hafızalı sohbet
- "Beni nasıl tanıyor?" notları
- Dost gibi destek ve yeni kriz akışı
- Kalp kırıklığı modlu alternatif senaryo
- Hedef zinciri
- Günün sorusu, birlikte nefes
- Nazik hatırlatmalar
- Şifreli yedek
- KVKK onayları
- Anonim istatistik
- Ücretsiz Cloudflare sunucusu

**v1.0'a eklenen "vay be" paketi (v0.3):**
- Tanışma soruları ve kişisel ilk karşılama
- Göz kırpan, mevsime göre giyinen maskot
- Yazarken eşlik eden maskot
- Akan sohbet yanıtları
- "Hatırlıyor musun?" anıları
- Paylaşılabilir maskot kartı
- Duygu üzerinden hatırlama
- Dolaylı kriz işaretleri ve modelin risk değerlendirmesi
- Sunucu tarafı günlük tavanlar
- Sistem kontrolü ekranı
- Bellek dostu şifreli yedek

**v1.1 (kapalı testten öğrendiklerimizle):**
- **Android ana ekran widget'ı:** maskot ve günün sorusu. Geri dönüşü en çok artıracak özellik; yerel modül gerektirdiği için ilk cihaz testinden sonraya bırakıldı.
- Ses notu (Android'in cihaz içi Türkçe tanımasıyla, ücretsiz ve cihazdan çıkmadan)
- Hafıza bahçesi: her sayfa bir çiçek, her insan bir ağaç
- Pusula+ aboneliği
- Otomatik Google Drive yedeği
- Play Integrity
- Maskot kıyafetleri

**v1.2 ve sonrası:**
- Yıllık "hayatının filmi"
- Farklı maskot türleri
- Fotoğraflardan anı hatırlama
- **Günün ortak sorusu:** herkes aynı soruyu anonim yanıtlar; beğeni yok, sadece "ben de" tepkisi, moderasyonlu.
  - "Günün en iyi yazısı" yerine bunu öneriyorum. Sıralama, günlüğü bir performansa çevirir ve dürüst yazmayı öldürür.
