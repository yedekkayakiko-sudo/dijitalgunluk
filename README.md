# Pusula Günlük

Seni zamanla tanıyan, yazmaya nazikçe teşvik eden ve geçmişinle bugününü birbirine bağlayan, yapay zekâ maskotlu bir dijital günlük.

> "Pusula" çalışma adıdır; uygulama adı, maskot adı ve paket adı (`com.dijitalgunluk.pusula`) Play Store'a yüklemeden önce değiştirilebilir. **Paket adı ilk yüklemeden sonra asla değiştirilemez.**

## Neler var (v0.1 MVP)

| Özellik | Durum |
|---|---|
| Dikkat dağıtmayan yazma ekranı, otomatik taslak kaydı | ✅ |
| Ruh hali (emoji), hava durumu, konum (sadece semt/şehir, izinle), fotoğraf | ✅ |
| "Bugünü tek kelimeyle anlat" hızlı modu | ✅ |
| Maskot tepkileri: olasılıksal, çoğu zaman sessiz, hız sınırlı | ✅ |
| Yeni kişi merakı, art arda kısa sayfalar, tekrar eden tema gözlemi | ✅ |
| Kriz sinyali: sabit, sakin metin + 112 / 183 tek dokunuşla arama | ✅ |
| Teşhis dili filtresi (cihazda ve sunucuda) | ✅ |
| Kişi ve yer hafızası (kaç kez, ilk ve son ne zaman, ortalama ruh hali) | ✅ |
| Doğal dille geçmişte arama ("3 yıl önce tanıştığım çocuk kimdi?") | ✅ |
| "Bu tarihte" hatırlatmaları | ✅ |
| Takvim ile zaman yolculuğu (günler ruh hali rengiyle) | ✅ |
| Geleceğe mühürlü mektup (1 ay, 6 ay, 1 yıl, 5 yıl) | ✅ |
| Alternatif senaryo oyunu (sadece hafif sayfalarda; ciddi konularda otomatik kapalı) | ✅ |
| Haftalık ve aylık dönem mektubu | ✅ |
| Sayfa bazlı gizlilik: Sadece ben / Görsün ama analiz etmesin / Tam analiz | ✅ |
| Maskot tonu: sakin, enerjik, minimal. Maskota isim verme | ✅ |
| Ruh hali eğrisi (varsayılan kapalı, isteğe bağlı) | ✅ |
| Baskı yaratmayan seri dili (kaçan günler "kayıp" değil "boşluk") | ✅ |
| Unutulma hakkı: sayfa, kişi ya da her şeyi kalıcı silme | ✅ |
| Yapay zekâ yanıtlarını uygulama içinden bildirme (Play politikası) | ✅ |
| Ses notu, yıl sonu "hayatının filmi", sosyal katman ve anonim mektuplar | ⏳ Sonraki sürümler |

## Mimari

```
packages/core   Saf TypeScript: güvenlik filtreleri, tepki motoru, kişi çıkarımı,
                arama, takvim, mektuplar. Hem uygulama hem sunucu kullanır. 52 test.
server          Durumsuz yapay zekâ sunucusu (Hono). API anahtarını telefondan uzak tutar,
                sayfa içeriğini asla kaydetmez ya da loglamaz. 13 test.
mobile          Expo (React Native) uygulaması, SDK 57, Expo Router.
```

**Veri akışı:** Her şey telefonda, SQLCipher ile şifrelenmiş SQLite veritabanında durur. Anahtar telefonun güvenli deposunda (Android Keystore) saklanır. Yapay zekâ varsayılan olarak **kapalıdır**. Açıldığında bile:

- "Sadece ben" sayfaları hiçbir zaman gönderilmez.
- Kriz sinyali içeren metinler hiçbir zaman yapay zekâya gönderilmez; yanıt cihazda sabit bir metinle verilir.
- Sunucu, izin verilen sayfayı Claude'a iletir, yanıtı güvenlik filtresinden geçirir ve hiçbir şey saklamaz.

**Maskot ne zaman konuşur?** `packages/core/src/reactions.ts` dosyasında tanımlıdır:

- Önce kriz kontrolü yapılır. Sinyal varsa her zaman yanıt verilir; bu yanıt yapay zekâdan geçmez.
- İki tepki arasında sessizlik süresi vardır: sakin tonda 20 saat, enerjik tonda 12 saat, minimal tonda 72 saat.
- Tekrar eden bir tema (ör. yorgunluk) son 10 günde 3 kez geçtiyse ve duygusal ağırlık taşıyorsa, %50 olasılıkla gözlem yapılır. Aynı konuda en fazla haftada bir.
- Yeni bir isim geçtiğinde %55 olasılıkla merak eder.
- Art arda 3 kısa sayfa yazıldığında %70 olasılıkla nazik bir teşvikte bulunur. En fazla haftada bir.
- Bunların dışında sessiz kalır.

## Çalıştırma

Gereksinim: Node 22+.

```bash
npm install
npm test                 # core + server testleri
```

**Sunucu:**

```bash
cp server/.env.example server/.env   # ANTHROPIC_API_KEY'i doldur
cd server && node --env-file=.env --import tsx src/index.ts
```

**Uygulama** (SQLCipher gibi yerel modüller Expo Go'da çalışmaz, bu yüzden geliştirme derlemesi gerekir):

```bash
cd mobile
npx eas-cli@latest login
npx eas-cli@latest build --profile preview --platform android   # telefona kurulabilir APK
```

Uygulamada **Ben → Ayarlar → Sunucu adresi** kısmına sunucunun adresini yazıp "Bağlantıyı test et" ile kontrol edebilirsin. `eas.json` dosyasındaki `EXPO_PUBLIC_API_URL` değeri varsayılan adres olarak kullanılır.

## Maliyet notu

Sunucu varsayılan olarak `claude-opus-5` kullanır ($5 / $25, milyon token başına). Kaba bir tahminle, günde bir sayfa yazan aktif bir kullanıcının maliyeti ayda yaklaşık $0,5–1 olur (kişi çıkarımı, ara sıra tepki, birkaç soru). Daha ucuz bir model için sunucuda `CLAUDE_MODEL` değişkenini değiştirmek yeterli; kodda başka değişiklik gerekmez. Hangi modelin yeterli kaliteyi verdiğini gerçek kullanımla ölçmek senin kararın.

## Yayına çıkış

Adım adım rehber: [docs/PLAY_STORE.md](docs/PLAY_STORE.md). Gizlilik politikası taslağı: [docs/gizlilik-politikasi.md](docs/gizlilik-politikasi.md).
