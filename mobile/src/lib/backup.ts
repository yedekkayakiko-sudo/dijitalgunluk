import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, FileMode, Paths, type FileHandle } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDb, newId, wipeAll } from './db';

/*
 * Encrypted backup: the whole diary (pages, photos, memory, letters, goals,
 * conversation, settings) in one file, sealed with a password only the user
 * knows (scrypt + AES-256-GCM). Without the password nobody, including us,
 * can open it; if the password is lost, the backup is lost.
 *
 * Format: "PUSULA2\n" | salt(16) | chunks. Each chunk is length(4, big-endian) |
 * nonce(12) | ciphertext. Chunk 0 holds the tables as JSON; every further
 * chunk holds one photo ("name\0bytes"). Reading and writing go one chunk at a
 * time, so a diary with hundreds of photos never has to fit in memory at once.
 */

const MAGIC = utf8ToBytes('PUSULA2\n');
const TABLES = ['entries', 'entities', 'entry_entities', 'reactions', 'letters', 'goals', 'goal_checkins', 'chat_messages', 'kv'] as const;
/** Device-specific keys that must not travel with a backup. */
const SKIP_KV = new Set(['install-id', 'event-queue', 'installed-at', 'last-open-day', 'embed-off-until']);

type Row = Record<string, string | number | null>;

export interface BackupMeta {
  version: 2;
  createdAt: string;
  tables: Record<string, Row[]>;
  photoCount: number;
}

const deriveKey = (password: string, salt: Uint8Array) => scryptAsync(utf8ToBytes(password), salt, { N: 2 ** 15, r: 8, p: 1, dkLen: 32 });

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

function writeChunk(handle: FileHandle, key: Uint8Array, plain: Uint8Array) {
  const nonce = Crypto.getRandomBytes(12);
  const sealed = gcm(key, nonce).encrypt(plain);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, sealed.length);
  handle.writeBytes(len);
  handle.writeBytes(nonce);
  handle.writeBytes(sealed);
}

function readChunk(handle: FileHandle, key: Uint8Array): Uint8Array | null {
  if (handle.size != null && handle.offset != null && handle.offset >= handle.size) return null;
  const len = handle.readBytes(4);
  if (len.length < 4) return null;
  const size = new DataView(len.buffer, len.byteOffset, 4).getUint32(0);
  const nonce = handle.readBytes(12);
  return gcm(key, nonce).decrypt(handle.readBytes(size));
}

export async function exportBackup(password: string): Promise<void> {
  const db = await getDb();
  const tables: Record<string, Row[]> = {};
  for (const t of TABLES) tables[t] = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
  tables.kv = tables.kv.filter((r) => !SKIP_KV.has(String(r.key)));
  const photos = tables.entries.flatMap((e) => JSON.parse(String(e.photos ?? '[]')) as string[]).filter((uri) => new File(uri).exists);

  const salt = Crypto.getRandomBytes(16);
  const key = await deriveKey(password, salt);
  const createdAt = new Date().toISOString();
  const file = new File(Paths.cache, `pusula-yedek-${createdAt.slice(0, 10)}.pusula`);
  if (file.exists) file.delete();
  file.create();
  const handle = file.open(FileMode.Truncate);
  try {
    handle.writeBytes(MAGIC);
    handle.writeBytes(salt);
    const meta: BackupMeta = { version: 2, createdAt, tables, photoCount: photos.length };
    writeChunk(handle, key, utf8ToBytes(JSON.stringify(meta)));
    for (const uri of photos) {
      const name = utf8ToBytes(uri.split('/').pop()!);
      const bytes = await new File(uri).bytes();
      const plain = new Uint8Array(name.length + 1 + bytes.length);
      plain.set(name, 0);
      plain.set(bytes, name.length + 1);
      writeChunk(handle, key, plain);
    }
  } finally {
    handle.close();
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/octet-stream', dialogTitle: 'Yedeğini kaydet' });
}

export class WrongPasswordError extends Error {}

export interface OpenedBackup {
  meta: BackupMeta;
  /** Replaces everything on this device with the backup. */
  restore(): Promise<void>;
  close(): void;
}

/** Picks a backup file and unlocks it. Returns null if the user cancelled. */
export async function openBackup(password: string): Promise<OpenedBackup | null> {
  const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: '*/*' });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const handle = new File(picked.assets[0].uri).open(FileMode.ReadOnly);
  const head = handle.readBytes(MAGIC.length);
  if (head.length < MAGIC.length || !MAGIC.every((b, i) => head[i] === b)) {
    handle.close();
    throw new Error('Bu bir Pusula yedeği değil.');
  }
  const key = await deriveKey(password, handle.readBytes(16));
  let meta: BackupMeta;
  try {
    meta = JSON.parse(bytesToUtf8(readChunk(handle, key)!)) as BackupMeta;
  } catch {
    handle.close();
    throw new WrongPasswordError('Şifre yanlış ya da dosya bozuk.');
  }

  return {
    meta,
    close: () => handle.close(),
    async restore() {
      try {
        const db = await getDb();
        await wipeAll();
        const dir = photoDir();
        const renamed: Record<string, string> = {};
        for (let chunk = readChunk(handle, key); chunk; chunk = readChunk(handle, key)) {
          const sep = chunk.indexOf(0);
          const name = bytesToUtf8(chunk.slice(0, sep));
          const f = new File(dir, `${newId()}.${name.split('.').pop() ?? 'jpg'}`);
          f.create();
          f.write(chunk.slice(sep + 1));
          renamed[name] = f.uri;
        }
        for (const t of TABLES) {
          for (const row of meta.tables[t] ?? []) {
            const r = { ...row };
            if (t === 'entries') {
              r.photos = JSON.stringify((JSON.parse(String(r.photos ?? '[]')) as string[]).map((u) => renamed[u.split('/').pop()!]).filter(Boolean));
            }
            const cols = Object.keys(r).filter((c) => /^[a-z_]+$/.test(c));
            await db.runAsync(`INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => r[c]));
          }
        }
      } finally {
        handle.close();
      }
    },
  };
}
