# Pusula Günlük

Seni tanıdıkça büyüyen, zor günlerde bir dost gibi yanında olan, geçmişini hatırlayan tatlı bir maskotla şifreli dijital günlük.

> "Pusula" bir çalışma adı. Paket adı (`com.dijitalgunluk.pusula`) Play Store'a ilk yüklemeden sonra **değiştirilemez**.

📌 Ürün vizyonu, iş modeli, SWOT ve yol haritası: [docs/URUN.md](docs/URUN.md)

## v0.3'te neler var

**İlk dakikadan "beni tanıyor" hissi**
- Tanışırken 3 kısa soru sorulur (hayatındaki önemli biri, sana iyi gelenler, şu sıralar neler oluyor). Cevaplar maskotun ilk hafıza notları olur.
- İlk sayfaya her zaman sıcak ve kişisel bir karşılama gelir.
- **"Hatırlıyor musun?":** haftada en fazla bir kez, 1 ay / 3 ay / 6 ay / 1 yıl önceki güzel bir sayfa ana sayfada anılır.

**Maskot**
- **Yaşıyor:** göz kırpar. Mevsime göre aksesuar takar (ilkbaharda çiçek, yazın güneş tokası, sonbaharda yaprak, kışın atkı), gece yarısından sonra takke giyer.
- **Yazarken yanında:** köşeden seni izler, yazdıkça heyecanlanır, sayfa ağırsa şefkatle bakar, uzun sayfalarda kutlar. Takıldığında dokun, sana bir soru önersin.
- **Paylaşılabilir kart:** "Pusula'm çiçek açtı!" gibi. Günlük içeriği değil, sadece maskot paylaşılır.
- Tohumdan bilge ağaca **7 büyüme evresi** geçirir. Yazdıkça damla kazanırsın, maskota sen su verirsin, büyüyünce kutlama yapılır.
- **Yaşlanır.** "12 günlük", "3 aylık" diye yaşını söyler; her yıl doğum günü kutlanır, bir yaşından sonra minik gözlük takar.
- **Dokununca sevilir**, basılı tutunca sarılır, **telefonu sallayınca başı döner** ve yaprak döker.
- Bir süre yazmadığında kızmaz ya da solmaz, sadece uyur. Döndüğünde sevinçle uyanır.
- 8 farklı yüz ifadesi var.

**Dost gibi destek**
- Hafızalı **sohbet** ("Konuş" sekmesi). Seni sayfalarından tanır: "Kıbrıs'ta direksiyona geçtiğin o günü hatırlıyor musun?"
- Yanıtlar **kelime kelime akar**; maskot düşünürken başını sallar.
- **Duygu üzerinden hatırlama:** "Üzgün olduğum günler", "en mutlu anlarım" gibi sorular da çalışır.
- **"Beni nasıl tanıyor?":** maskotun seninle ilgili notları. Hepsini görür, düzeltir ya da silersin.
- **Zor günlerde:** maskot önce yanında olur, kendiliğinden konuşmaya başlar. Dert yanmak kriz sayılmaz.
- **Açık kriz dilinde:** konuşmayı kesmeden küçük bir destek satırı gösterilir (112, 183, birlikte nefes).
- Mecazlar ayrılır ("gülmekten öldüm"), gerçek niyet gözden kaçmaz ("gerçekten ölmek istiyorum").
- **Dolaylı işaretler de yakalanır** ("ilaçları biriktiriyorum", "herkese veda ettim"). Sohbette yapay zekâ ayrıca kendi risk değerlendirmesini yapar; anahtar kelimelerin kaçırdığını yakalar.
- **Birlikte nefes:** maskot 4-2-6 nefes egzersizine rehberlik eder.

**Oyunlar ve ritüeller**
- **Alternatif senaryo:** gündelik seçimler için eğlenceli mod. Ayrılık, pişmanlık ve kötü günler için dikkatli "kalp kırıklığı" modu: öbür yolu bedelleriyle dürüstçe yürür, suçlamaz ve her zaman "bir çıkış yolu var" diye biter. Yas, istismar, ağır hastalık ve krizde bu oyun kapalıdır.
- **Hedef zinciri:** "1 ay sonra…" diye hedef koyarsın. Hedef mühürlenir, arada maskot nasıl gittiğini sorar, günü gelince "başardım / kısmen / bu sefer olmadı" diye bakarsınız ve sonraki hedef öncekine bağlanır.
- **Günün sorusu:** sana özel bir yazma önerisi.
- Geleceğe mühürlü mektup, dönem mektubu, "bu tarihte" anıları, takvim.
- Tek kelime modu ve günde bir kez **nazik hatırlatma**.

**Güven**
- Veriler telefonda, SQLCipher ile şifreli.
- Yapay zekâ varsayılan olarak kapalı ve **iki ayrı KVKK açık rızası** olmadan açılmaz.
- Adın hiç gönderilmez. Telefon, e-posta, TCKN ve IBAN gönderilmeden önce maskelenir.
- **Şifreli yedek** (scrypt + AES-256-GCM): telefon değişse de günlük kaybolmaz.
- Anonim, kimliksiz ve isteğe bağlı kullanım istatistiği.
- **Kötüye kullanıma karşı:** kurulum, IP ve tüm hizmet için günlük tavanlar ve Cloudflare hız sınırı. Kriz mesajları hiçbir sınıra takılmaz.
- **Sistem kontrolü ekranı** ve bir hata olursa boş ekran yerine dost canlısı bir hata sayfası.
- Yapay zekâ yanıtlarını bildirme, unutulma hakkı.

**Sonraki sürümlerde:** ses notu, hafıza bahçesi, Pusula+ aboneliği, otomatik bulut yedeği, maskot kıyafetleri (bkz. [docs/URUN.md](docs/URUN.md)).

## Mimari

```
packages/core   Saf TypeScript: güvenlik filtreleri, tepki motoru, büyüme, hedefler, arama,
                gizlilik maskeleme. Uygulama ve sunucu ortak kullanır. 84 test.
server          Hono sunucusu. Cloudflare Workers'ta ücretsiz çalışır, içerik saklamaz. 26 test.
  persona/PUSULA.md   Maskotun karakter anayasası: her yapay zekâ çağrısının başında.
  eval/               12 senaryoluk değerlendirme seti (kriz, hafıza, teşhis tuzağı…).
mobile          Expo (React Native) SDK 57 uygulaması.
```

**Modeller:** Maskotun sesi (tepki, sohbet, mektup, senaryo, notlar) Claude Sonnet 5; isim ve yer çıkarımı Claude Haiku 4.5. İkisi de `wrangler.toml` dosyasından değiştirilebilir.

**Maliyet:** 100 kullanıcıda gerçekçi senaryoda ayda ~$15–30. Anthropic konsolundaki harcama limiti asıl sigortadır; limit dolarsa maskot hazır metinlere geçer, uygulama bozulmaz. Ayrıntı: [docs/URUN.md](docs/URUN.md).

## Çalıştırma

```bash
npm install
npm test                                   # core + server testleri
npx tsx server/scripts/demo-server.ts      # anahtarsız, hazır cevaplı maskot (:8799)
```

- **Telefona kurmak:** `cd mobile && npx eas-cli@latest build --profile preview --platform android` (SQLCipher gibi yerel modüller Expo Go'da çalışmaz).
- **Sunucuyu yayına almak:** [docs/DEPLOY.md](docs/DEPLOY.md)
- **Play Store:** [docs/PLAY_STORE.md](docs/PLAY_STORE.md)
- **KVKK:** [docs/kvkk.md](docs/kvkk.md)
- **Gizlilik politikası:** [docs/gizlilik-politikasi.md](docs/gizlilik-politikasi.md)
