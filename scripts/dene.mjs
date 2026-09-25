// Tek tıkla bilgisayarda deneme: maskotun sunucusunu ve uygulamanın web sürümünü birlikte açar.
// Anthropic API anahtarın varsa gerçek maskotla, yoksa hazır cevaplı demo ile çalışır.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const keyFile = join(root, '.env.local'); // .gitignore'da: anahtar asla GitHub'a gitmez
const run = (cmd, args, opts = {}) => spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: true, ...opts });

if (!existsSync(join(root, 'node_modules'))) {
  console.log('\n🌱 İlk açılış: gerekli dosyalar indiriliyor (birkaç dakika sürebilir)…\n');
  const code = await new Promise((done) => run('npm', ['install']).on('exit', done));
  if (code !== 0) {
    console.log('\n❌ Kurulum tamamlanamadı. İnternet bağlantını kontrol edip tekrar dene.');
    process.exit(1);
  }
}

function savedKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  if (!existsSync(keyFile)) return null;
  return /ANTHROPIC_API_KEY=(\S+)/.exec(readFileSync(keyFile, 'utf8'))?.[1] ?? null;
}

let key = savedKey();
if (!key) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  console.log('\n🔑 Anthropic API anahtarın varsa buraya yapıştır ve Enter\'a bas.');
  console.log('   (sk-ant- ile başlar. Sadece bu bilgisayarda, .env.local dosyasında saklanır.)');
  const answer = (await rl.question('   Anahtarın yoksa sadece Enter\'a bas, hazır cevaplı demo açılır: ')).trim();
  rl.close();
  if (answer.startsWith('sk-')) {
    writeFileSync(keyFile, `ANTHROPIC_API_KEY=${answer}\n`);
    key = answer;
    console.log('   ✅ Anahtar kaydedildi. Bir dahaki sefere sormayacağım. (Silmek için .env.local dosyasını sil.)');
  } else if (answer) {
    console.log('   ⚠️ Bu bir API anahtarına benzemiyor (sk-ant- ile başlamalı). Şimdilik demo ile açıyorum.');
  }
}

console.log(key ? '\n🌱 Pusula GERÇEK maskotla açılıyor.' : '\n🌱 Pusula DEMO maskotla açılıyor (cevaplar hazır metin, "Demo:" diye başlar).');
console.log('   Birazdan tarayıcında kendiliğinden açılacak. Açılmazsa tarayıcına şunu yaz: http://localhost:8081');
if (key) console.log('   Yapay zekâyı açmak için uygulamada: Biz → Ayarlar ve gizlilik → Yapay zekâ.');
console.log('   Kapatmak için bu pencereyi kapat.\n');

const server = key
  ? run('npx', ['tsx', 'server/src/index.ts'], { env: { ...process.env, ANTHROPIC_API_KEY: key, PORT: '8799' } })
  : run('npx', ['tsx', 'server/scripts/demo-server.ts']);
const app = run('npx', ['expo', 'start', '--web'], {
  cwd: join(root, 'mobile'),
  env: { ...process.env, EXPO_PUBLIC_API_URL: 'http://localhost:8799' },
});

const stop = () => { server.kill(); app.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
app.on('exit', stop);
