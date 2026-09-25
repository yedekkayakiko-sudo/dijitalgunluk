// Tek tıkla bilgisayarda deneme: hazır cevaplı demo maskotu ve uygulamanın web sürümünü birlikte açar.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args, opts = {}) => spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: true, ...opts });

if (!existsSync(join(root, 'node_modules'))) {
  console.log('\n🌱 İlk açılış: gerekli dosyalar indiriliyor (birkaç dakika sürebilir)…\n');
  const code = await new Promise((done) => run('npm', ['install']).on('exit', done));
  if (code !== 0) {
    console.log('\n❌ Kurulum tamamlanamadı. İnternet bağlantını kontrol edip tekrar dene.');
    process.exit(1);
  }
}

console.log('\n🌱 Pusula açılıyor. Birazdan tarayıcında kendiliğinden açılacak.');
console.log('   Açılmazsa tarayıcına şunu yaz: http://localhost:8081');
console.log('   Kapatmak için bu pencereyi kapat.\n');

const demo = run('npx', ['tsx', 'server/scripts/demo-server.ts']);
const app = run('npx', ['expo', 'start', '--web', '--clear'], {
  cwd: join(root, 'mobile'),
  env: { ...process.env, EXPO_PUBLIC_API_URL: 'http://localhost:8799' },
});

const stop = () => { demo.kill(); app.kill(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
app.on('exit', stop);
