# Sunucuyu yayına alma (ücretsiz)

Sunucu Cloudflare Workers'ın ücretsiz planında çalışır: günde 100.000 isteğe kadar ücret yok ve kredi kartı gerekmiyor. İlk yüzlerce kullanıcı için fazlasıyla yeterli.

## 1. Anthropic API anahtarı ve harcama limiti

Bu adım faturanın asla kontrolden çıkmamasını sağlar, o yüzden en önemlisi bu.

1. [console.anthropic.com](https://console.anthropic.com) adresinde hesap aç ve kredi yükle (başlangıç için $10 yeter).
2. **Settings → Limits** bölümünden aylık harcama limitini belirle (örneğin $30).
   - Limit dolduğunda yapay zekâ durur ama uygulama bozulmaz: maskot cihazdaki hazır metinlerle konuşmaya devam eder.
3. **API Keys** bölümünden bir anahtar oluştur ve kimseyle paylaşma.

## 2. Cloudflare

```bash
cd server
npx wrangler login                          # ücretsiz Cloudflare hesabı
npx wrangler d1 create pusula-events        # çıkan database_id'yi wrangler.toml'a yaz
npx wrangler d1 migrations apply pusula-events --remote
npx wrangler secret put ANTHROPIC_API_KEY   # anahtarı yapıştır
npx wrangler secret put APP_KEY             # uzun, rastgele bir metin (uygulamayla paylaşılır)
npx wrangler secret put ADMIN_KEY           # istatistikleri okumak için, sadece sende kalsın
npx wrangler secret put HASH_SALT           # rastgele bir metin; günlük kotalardaki kimlikleri karıştırır
npm run deploy
```

Komut sonunda `https://pusula-gunluk.<hesabın>.workers.dev` gibi bir adres verir. Bu adresi ve `APP_KEY` değerini `mobile/eas.json` dosyasına yaz:

```json
"env": { "EXPO_PUBLIC_API_URL": "https://pusula-gunluk.<hesabın>.workers.dev", "EXPO_PUBLIC_APP_KEY": "<APP_KEY>" }
```

Kontrol etmek için:

```bash
curl https://pusula-gunluk.<hesabın>.workers.dev/health
# {"ok":true,"ai":true,"embeddings":false}
```

### Kötüye kullanım korumaları (wrangler.toml)

| Ayar | Varsayılan | Ne yapar |
|---|---|---|
| `[[ratelimits]]` | dakikada 30 | Cloudflare seviyesinde, kurulum başına anlık sınır |
| `INSTALL_DAILY_LIMIT` | 80 | Bir kurulumun günlük yapay zekâ çağrısı |
| `IP_DAILY_LIMIT` | 250 | Bir IP adresinin günlük çağrısı |
| `GLOBAL_DAILY_LIMIT` | 3000 | Tüm hizmetin günlük tavanı (aylık harcama limitinin altında ikinci sigorta) |

- Kriz dili içeren mesajlar hiçbir sınıra takılmaz.
- Kimlikler, her gün değişen bir tuzla karıştırılarak (hash) sayılır; günler arasında kimse izlenemez.

## 3. Maskotu test et (yaklaşık $1)

Karakter dosyasını (`server/persona/PUSULA.md`) değiştirdikten sonra değerlendirme setini çalıştır:

```bash
cd server
ANTHROPIC_API_KEY=... npm run eval -- --yes
```

12 senaryonun her biri (kriz, dert yanma, hafıza, teşhis tuzağı, alternatif senaryo…) önce kurallarla, sonra bir hakem modelle puanlanır. Rapor `server/eval/results/` klasörüne yazılır.

## 4. İstatistikleri okuma

İstatistikler anonimdir; hiçbir metin ya da kimlik içermez.

```bash
curl -H "x-admin-key: <ADMIN_KEY>" "https://.../v1/stats?since=2026-10-01"
```

- **D1 / D7 / D30 geri dönüş:** `app_open` satırlarında `d` değeri kurulumdan bu yana geçen günü gösterir (0, 1, 7, 14, 30). Örneğin `d=7` sayısının `d=0` sayısına oranı, yaklaşık 7. gün geri dönüş oranıdır.
- **Kuzey yıldızı metriği:** haftada en az 3 gün yazan kullanıcı sayısı. Buna yakın bir sinyal için `entry_saved` sayılarına bak.

## Telefonda deneme

Uygulamada **Ayarlar → Sistem kontrolü** ekranı şunları gösterir:
- şifrelemenin, bildirimlerin, sensörün ve sunucunun çalışıp çalışmadığı,
- yapay zekânın canlı yanıt süresi.

**"Raporu paylaş"** ile sonucu gönderebilirsin; rapor hiçbir sayfa içeriği içermez.

## Anahtarsız deneme

Hiç anahtar ve maliyet olmadan uygulamanın yapay zekâ akışlarını denemek için:

```bash
npx tsx server/scripts/demo-server.ts        # hazır cevaplarla çalışan sahte maskot, :8799
```

Uygulamada **Ayarlar → Sunucu adresi** kısmına `http://<bilgisayarının-IP'si>:8799` yaz.
