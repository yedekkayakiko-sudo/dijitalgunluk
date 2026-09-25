import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb, newId, wipeAll } from './db';

/*
 * Encrypted backup: the whole diary (pages, photos, memory, letters, goals,
 * conversation, settings) in a single file, sealed with a password only the
 * user knows (scrypt + AES-256-GCM). Without the password nobody, including
 * us, can open it; if the password is lost, the backup is lost.
 */

const MAGIC = utf8ToBytes('PUSULA1\n');
const TABLES = ['entries', 'entities', 'entry_entities', 'reactions', 'letters', 'goals', 'goal_checkins', 'chat_messages', 'kv'] as const;
/** Device-specific keys that must not travel with a backup. */
const SKIP_KV = new Set(['install-id', 'event-queue', 'installed-at', 'last-open-day']);

type Row = Record<string, string | number | null>;
interface Payload {
  version: 1;
  createdAt: string;
  tables: Record<string, Row[]>;
  photos: Record<string, string>;
}

const deriveKey = (password: string, salt: Uint8Array) => scryptAsync(utf8ToBytes(password), salt, { N: 2 ** 15, r: 8, p: 1, dkLen: 32 });

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export async function exportBackup(password: string): Promise<void> {
  const db = await getDb();
  const tables: Record<string, Row[]> = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
  tables.kv = tables.kv.filter((r) => !SKIP_KV.has(String(r.key)));

  const photos: Record<string, string> = {};
  for (const e of tables.entries) {
    for (const uri of JSON.parse(String(e.photos ?? '[]')) as string[]) {
      const f = new File(uri);
      if (f.exists) photos[uri.split('/').pop()!] = await f.base64();
    }
  }

  const payload: Payload = { version: 1, createdAt: new Date().toISOString(), tables, photos };
  const salt = Crypto.getRandomBytes(16);
  const nonce = Crypto.getRandomBytes(12);
  const key = await deriveKey(password, salt);
  const sealed = gcm(key, nonce).encrypt(utf8ToBytes(JSON.stringify(payload)));

  const out = new Uint8Array(MAGIC.length + salt.length + nonce.length + sealed.length);
  out.set(MAGIC, 0);
  out.set(salt, MAGIC.length);
  out.set(nonce, MAGIC.length + 16);
  out.set(sealed, MAGIC.length + 28);

  const file = new File(Paths.cache, `pusula-yedek-${payload.createdAt.slice(0, 10)}.pusula`);
  if (file.exists) file.delete();
  file.create();
  file.write(out);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Yedeğini kaydet' });
}

export class WrongPasswordError extends Error {}

/** Picks a backup file and opens it. Returns null if the user cancelled. */
export async function readBackup(password: string): Promise<Payload | null> {
  const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const bytes = await new File(picked.assets[0].uri).bytes();
  if (bytes.length < MAGIC.length + 28 || !MAGIC.every((b, i) => bytes[i] === b)) throw new Error('Bu bir Pusula yedeği değil.');
  const salt = bytes.slice(MAGIC.length, MAGIC.length + 16);
  const nonce = bytes.slice(MAGIC.length + 16, MAGIC.length + 28);
  const key = await deriveKey(password, salt);
  try {
    return JSON.parse(bytesToUtf8(gcm(key, nonce).decrypt(bytes.slice(MAGIC.length + 28)))) as Payload;
  } catch {
    throw new WrongPasswordError('Şifre yanlış ya da dosya bozuk.');
  }
}

/** Replaces everything on this device with the backup's contents. */
export async function restoreBackup(p: Payload): Promise<void> {
  const db = await getDb();
  await wipeAll();
  const dir = photoDir();
  const renamed: Record<string, string> = {};
  for (const [name, b64] of Object.entries(p.photos)) {
    const f = new File(dir, `${newId()}.${name.split('.').pop() ?? 'jpg'}`);
    f.create();
    f.write(b64, { encoding: 'base64' });
    renamed[name] = f.uri;
  }
  for (const t of TABLES) {
    for (const row of p.tables[t] ?? []) {
      const r = { ...row };
      if (t === 'entries') {
        r.photos = JSON.stringify((JSON.parse(String(r.photos ?? '[]')) as string[]).map((u) => renamed[u.split('/').pop()!]).filter(Boolean));
      }
      const cols = Object.keys(r).filter((c) => /^[a-z_]+$/.test(c));
      await db.runAsync(`INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => r[c]));
    }
  }
}
