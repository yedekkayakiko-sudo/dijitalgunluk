import type { CrisisLevel, Entity, EntityKind, Entry, EntryKind, FutureLetter, Goal, GoalCheckin, GoalStatus, Mood, PrivacyLevel, ReactionKind } from '@gunluk/core';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

/*
 * Local-first storage. On Android/iOS the database is encrypted with SQLCipher
 * using a random 256-bit key kept in the OS keystore (expo-secure-store).
 * Nothing here ever leaves the device unless the user's privacy settings allow
 * an entry to be sent to the mascot server.
 */

const DB_NAME = 'gunluk.db';
const KEY_NAME = 'gunluk-db-key-v1';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function encryptionKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_NAME);
  if (!key) {
    key = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(KEY_NAME, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return key;
}

/** Exclusive transaction on device; the web build (used for previews) only has the shared variant. */
async function transaction(db: SQLite.SQLiteDatabase, task: (tx: SQLite.SQLiteDatabase) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') return db.withTransactionAsync(() => task(db));
  return db.withExclusiveTransactionAsync((tx) => task(tx));
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE entries (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    mood INTEGER,
    weather TEXT,
    place TEXT,
    photos TEXT NOT NULL DEFAULT '[]',
    privacy TEXT NOT NULL,
    embedding TEXT
  );
  CREATE INDEX idx_entries_created ON entries(created_at);
  CREATE TABLE draft (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    entry_id TEXT,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    mood INTEGER,
    weather TEXT,
    place TEXT,
    photos TEXT NOT NULL DEFAULT '[]',
    privacy TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE entities (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    key TEXT NOT NULL UNIQUE,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    mention_count INTEGER NOT NULL DEFAULT 0,
    mood_sum INTEGER NOT NULL DEFAULT 0,
    mood_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE entry_entities (
    entry_id TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    PRIMARY KEY (entry_id, entity_id)
  );
  CREATE TABLE reactions (
    id TEXT PRIMARY KEY NOT NULL,
    entry_id TEXT,
    kind TEXT NOT NULL,
    subject TEXT,
    text TEXT NOT NULL,
    at TEXT NOT NULL
  );
  CREATE TABLE letters (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    open_at TEXT NOT NULL,
    body TEXT NOT NULL,
    opened_at TEXT
  );
  CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
  `
  CREATE TABLE goals (
    id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    text TEXT NOT NULL,
    why TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    reflection TEXT,
    reviewed_at TEXT,
    parent_id TEXT
  );
  CREATE TABLE goal_checkins (
    id TEXT PRIMARY KEY NOT NULL,
    goal_id TEXT NOT NULL,
    at TEXT NOT NULL,
    feeling TEXT NOT NULL,
    note TEXT
  );
  CREATE TABLE chat_messages (
    id TEXT PRIMARY KEY NOT NULL,
    at TEXT NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    page_ids TEXT NOT NULL DEFAULT '[]',
    crisis TEXT NOT NULL DEFAULT 'none'
  );
  CREATE INDEX idx_chat_at ON chat_messages(at);
  `,
];

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  if (Platform.OS !== 'web') {
    const key = await encryptionKey();
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
  }
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA secure_delete = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  while (version < MIGRATIONS.length) {
    await transaction(db, (tx) => tx.execAsync(MIGRATIONS[version]));
    version += 1;
    await db.execAsync(`PRAGMA user_version = ${version}`);
  }
  return db;
}

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= open().catch((e) => {
    dbPromise = null;
    throw e;
  });
  return dbPromise;
}

export const newId = () => Crypto.randomUUID();

// ---------- entries ----------

type EntryRow = {
  id: string; created_at: string; updated_at: string; kind: EntryKind; text: string; mood: number | null;
  weather: string | null; place: string | null; photos: string; privacy: PrivacyLevel; embedding: string | null;
};

export type StoredEntry = Entry & { embedding: number[] | null };

const toEntry = (r: EntryRow): StoredEntry => ({
  id: r.id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  kind: r.kind,
  text: r.text,
  mood: (r.mood as Mood | null) ?? null,
  weather: r.weather,
  place: r.place,
  photos: JSON.parse(r.photos) as string[],
  privacy: r.privacy,
  embedding: r.embedding ? (JSON.parse(r.embedding) as number[]) : null,
});

export async function saveEntry(e: Entry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO entries (id, created_at, updated_at, kind, text, mood, weather, place, photos, privacy)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, kind = excluded.kind, text = excluded.text,
       mood = excluded.mood, weather = excluded.weather, place = excluded.place, photos = excluded.photos,
       privacy = excluded.privacy, embedding = NULL`,
    e.id, e.createdAt, e.updatedAt, e.kind, e.text, e.mood, e.weather, e.place, JSON.stringify(e.photos), e.privacy,
  );
}

export async function setEmbedding(id: string, vector: number[]): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE entries SET embedding = ? WHERE id = ?', JSON.stringify(vector), id);
}

export async function getEntry(id: string): Promise<StoredEntry | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  return r ? toEntry(r) : null;
}

export async function listEntries(opts: { from?: string; to?: string; limit?: number; excludePrivate?: boolean } = {}): Promise<StoredEntry[]> {
  const db = await getDb();
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (opts.from) { where.push('created_at >= ?'); params.push(opts.from); }
  if (opts.to) { where.push('created_at < ?'); params.push(opts.to); }
  if (opts.excludePrivate) where.push("privacy != 'private'");
  const sql = `SELECT * FROM entries ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC ${opts.limit ? `LIMIT ${Math.floor(opts.limit)}` : ''}`;
  return (await db.getAllAsync<EntryRow>(sql, params)).map(toEntry);
}

export async function allEntryDates(): Promise<string[]> {
  const db = await getDb();
  return (await db.getAllAsync<{ created_at: string }>('SELECT created_at FROM entries')).map((r) => r.created_at);
}

/** Returns the photo URIs that belonged to the entry so the caller can delete the files. */
export async function deleteEntry(id: string): Promise<string[]> {
  const db = await getDb();
  const entry = await getEntry(id);
  await transaction(db, async (tx) => {
    await tx.runAsync('DELETE FROM entries WHERE id = ?', id);
    await tx.runAsync('DELETE FROM entry_entities WHERE entry_id = ?', id);
    await tx.runAsync('DELETE FROM reactions WHERE entry_id = ?', id);
  });
  await recomputeEntities();
  return entry?.photos ?? [];
}

// ---------- draft ----------

export interface Draft {
  entryId: string | null;
  kind: EntryKind;
  text: string;
  mood: Mood | null;
  weather: string | null;
  place: string | null;
  photos: string[];
  privacy: PrivacyLevel;
}

export async function saveDraft(d: Draft): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO draft (id, entry_id, kind, text, mood, weather, place, photos, privacy, updated_at)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    d.entryId, d.kind, d.text, d.mood, d.weather, d.place, JSON.stringify(d.photos), d.privacy, new Date().toISOString(),
  );
}

export async function loadDraft(): Promise<Draft | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ entry_id: string | null; kind: EntryKind; text: string; mood: number | null; weather: string | null; place: string | null; photos: string; privacy: PrivacyLevel }>(
    'SELECT * FROM draft WHERE id = 1',
  );
  if (!r) return null;
  return {
    entryId: r.entry_id, kind: r.kind, text: r.text, mood: (r.mood as Mood | null) ?? null, weather: r.weather,
    place: r.place, photos: JSON.parse(r.photos) as string[], privacy: r.privacy,
  };
}

export async function clearDraft(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM draft');
}

// ---------- entities ----------

type EntityRow = {
  id: string; kind: EntityKind; name: string; key: string; first_seen_at: string; last_seen_at: string;
  mention_count: number; mood_sum: number; mood_count: number;
};

const toEntity = (r: EntityRow): Entity => ({
  id: r.id, kind: r.kind, name: r.name, key: r.key, firstSeenAt: r.first_seen_at, lastSeenAt: r.last_seen_at,
  mentionCount: r.mention_count, moodSum: r.mood_sum, moodCount: r.mood_count,
});

export async function listEntities(kind?: EntityKind): Promise<Entity[]> {
  const db = await getDb();
  const rows = kind
    ? await db.getAllAsync<EntityRow>('SELECT * FROM entities WHERE kind = ? ORDER BY mention_count DESC, last_seen_at DESC', kind)
    : await db.getAllAsync<EntityRow>('SELECT * FROM entities ORDER BY mention_count DESC, last_seen_at DESC');
  return rows.map(toEntity);
}

export async function getEntity(id: string): Promise<Entity | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<EntityRow>('SELECT * FROM entities WHERE id = ?', id);
  return r ? toEntity(r) : null;
}

export async function entriesForEntity(id: string): Promise<StoredEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT e.* FROM entries e JOIN entry_entities ee ON ee.entry_id = e.id WHERE ee.entity_id = ? ORDER BY e.created_at DESC',
    id,
  );
  return rows.map(toEntry);
}

export async function entitiesForEntry(entryId: string): Promise<Entity[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EntityRow>(
    'SELECT en.* FROM entities en JOIN entry_entities ee ON ee.entity_id = en.id WHERE ee.entry_id = ? ORDER BY en.kind, en.name',
    entryId,
  );
  return rows.map(toEntity);
}

export async function entityNamesForEntries(ids: string[]): Promise<Record<string, string[]>> {
  if (ids.length === 0) return {};
  const db = await getDb();
  const rows = await db.getAllAsync<{ entry_id: string; name: string }>(
    `SELECT ee.entry_id, en.name FROM entry_entities ee JOIN entities en ON en.id = ee.entity_id
     WHERE ee.entry_id IN (${ids.map(() => '?').join(',')})`,
    ids,
  );
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.entry_id] ??= []).push(r.name);
  return out;
}

/** Replaces the entity links of an entry and refreshes all entity stats. */
export async function linkEntities(entryId: string, mentions: { kind: EntityKind; name: string; key: string }[], at: string): Promise<void> {
  const db = await getDb();
  await transaction(db, async (tx) => {
    await tx.runAsync('DELETE FROM entry_entities WHERE entry_id = ?', entryId);
    for (const m of mentions) {
      await tx.runAsync(
        `INSERT INTO entities (id, kind, name, key, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(key) DO NOTHING`,
        newId(), m.kind, m.name, m.key, at, at,
      );
      const row = await tx.getFirstAsync<{ id: string }>('SELECT id FROM entities WHERE key = ?', m.key);
      if (row) await tx.runAsync('INSERT OR IGNORE INTO entry_entities (entry_id, entity_id) VALUES (?, ?)', entryId, row.id);
    }
  });
  await recomputeEntities();
}

export async function renameEntity(id: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE entities SET name = ? WHERE id = ?', name.trim(), id);
}

export async function deleteEntity(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM entry_entities WHERE entity_id = ?', id);
  await db.runAsync('DELETE FROM entities WHERE id = ?', id);
}

async function recomputeEntities(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    UPDATE entities SET
      mention_count = (SELECT COUNT(*) FROM entry_entities ee WHERE ee.entity_id = entities.id),
      mood_sum = (SELECT COALESCE(SUM(e.mood), 0) FROM entry_entities ee JOIN entries e ON e.id = ee.entry_id WHERE ee.entity_id = entities.id),
      mood_count = (SELECT COUNT(e.mood) FROM entry_entities ee JOIN entries e ON e.id = ee.entry_id WHERE ee.entity_id = entities.id),
      first_seen_at = COALESCE((SELECT MIN(e.created_at) FROM entry_entities ee JOIN entries e ON e.id = ee.entry_id WHERE ee.entity_id = entities.id), first_seen_at),
      last_seen_at = COALESCE((SELECT MAX(e.created_at) FROM entry_entities ee JOIN entries e ON e.id = ee.entry_id WHERE ee.entity_id = entities.id), last_seen_at);
    DELETE FROM entities WHERE mention_count = 0;
  `);
}

// ---------- reactions ----------

export interface StoredReaction {
  id: string;
  entryId: string | null;
  kind: ReactionKind;
  subject: string | null;
  text: string;
  at: string;
}

export async function addReaction(r: Omit<StoredReaction, 'id'>): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO reactions (id, entry_id, kind, subject, text, at) VALUES (?, ?, ?, ?, ?, ?)', newId(), r.entryId, r.kind, r.subject, r.text, r.at);
}

export async function recentReactions(limit = 30): Promise<StoredReaction[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; entry_id: string | null; kind: ReactionKind; subject: string | null; text: string; at: string }>(
    'SELECT * FROM reactions ORDER BY at DESC LIMIT ?', limit,
  );
  return rows.map((r) => ({ id: r.id, entryId: r.entry_id, kind: r.kind, subject: r.subject, text: r.text, at: r.at }));
}

export async function reactionForEntry(entryId: string): Promise<StoredReaction | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ id: string; entry_id: string | null; kind: ReactionKind; subject: string | null; text: string; at: string }>(
    'SELECT * FROM reactions WHERE entry_id = ? ORDER BY at DESC LIMIT 1', entryId,
  );
  return r ? { id: r.id, entryId: r.entry_id, kind: r.kind, subject: r.subject, text: r.text, at: r.at } : null;
}

// ---------- letters ----------

export async function listLetters(): Promise<FutureLetter[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; created_at: string; open_at: string; body: string; opened_at: string | null }>(
    'SELECT * FROM letters ORDER BY open_at ASC',
  );
  return rows.map((r) => ({ id: r.id, createdAt: r.created_at, openAt: r.open_at, body: r.body, openedAt: r.opened_at }));
}

export async function addLetter(openAt: string, body: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO letters (id, created_at, open_at, body) VALUES (?, ?, ?, ?)', newId(), new Date().toISOString(), openAt, body);
}

export async function markLetterOpened(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE letters SET opened_at = COALESCE(opened_at, ?) WHERE id = ?', new Date().toISOString(), id);
}

export async function deleteLetter(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM letters WHERE id = ?', id);
}

// ---------- goals ----------

type GoalRow = {
  id: string; created_at: string; due_at: string; text: string; why: string | null; status: GoalStatus;
  reflection: string | null; reviewed_at: string | null; parent_id: string | null;
};

const toGoal = (r: GoalRow): Goal => ({
  id: r.id, createdAt: r.created_at, dueAt: r.due_at, text: r.text, why: r.why, status: r.status,
  reflection: r.reflection, reviewedAt: r.reviewed_at, parentId: r.parent_id,
});

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  return (await db.getAllAsync<GoalRow>('SELECT * FROM goals ORDER BY created_at ASC')).map(toGoal);
}

export async function addGoal(g: Pick<Goal, 'text' | 'why' | 'dueAt' | 'parentId'>): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    'INSERT INTO goals (id, created_at, due_at, text, why, parent_id) VALUES (?, ?, ?, ?, ?, ?)',
    id, new Date().toISOString(), g.dueAt, g.text, g.why, g.parentId,
  );
  return id;
}

export async function reviewGoal(id: string, status: Exclude<GoalStatus, 'active'>, reflection: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE goals SET status = ?, reflection = ?, reviewed_at = ? WHERE id = ?', status, reflection, new Date().toISOString(), id);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE goals SET parent_id = NULL WHERE parent_id = ?', id);
  await db.runAsync('DELETE FROM goal_checkins WHERE goal_id = ?', id);
  await db.runAsync('DELETE FROM goals WHERE id = ?', id);
}

export async function listCheckins(): Promise<GoalCheckin[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ goal_id: string; at: string; feeling: GoalCheckin['feeling']; note: string | null }>('SELECT * FROM goal_checkins ORDER BY at ASC');
  return rows.map((r) => ({ goalId: r.goal_id, at: r.at, feeling: r.feeling, note: r.note }));
}

export async function addCheckin(c: GoalCheckin): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT INTO goal_checkins (id, goal_id, at, feeling, note) VALUES (?, ?, ?, ?, ?)', newId(), c.goalId, c.at, c.feeling, c.note);
}

// ---------- conversation with the mascot ----------

export interface ChatMessage {
  id: string;
  at: string;
  role: 'user' | 'assistant';
  text: string;
  pageIds: string[];
  crisis: CrisisLevel;
}

export async function listChat(limit = 200): Promise<ChatMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ id: string; at: string; role: 'user' | 'assistant'; text: string; page_ids: string; crisis: CrisisLevel }>(
    'SELECT * FROM (SELECT * FROM chat_messages ORDER BY at DESC LIMIT ?) ORDER BY at ASC', limit,
  );
  return rows.map((r) => ({ id: r.id, at: r.at, role: r.role, text: r.text, pageIds: JSON.parse(r.page_ids) as string[], crisis: r.crisis }));
}

export async function addChat(m: Omit<ChatMessage, 'id'>): Promise<ChatMessage> {
  const db = await getDb();
  const id = newId();
  await db.runAsync('INSERT INTO chat_messages (id, at, role, text, page_ids, crisis) VALUES (?, ?, ?, ?, ?, ?)', id, m.at, m.role, m.text, JSON.stringify(m.pageIds), m.crisis);
  return { ...m, id };
}

export async function clearChat(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM chat_messages');
}

// ---------- key/value ----------

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDb();
  return (await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key))?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, value);
}

// ---------- forget everything ----------

/** "Unutulma hakkı": wipes every table. secure_delete overwrites the freed pages. */
export async function wipeAll(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM entries; DELETE FROM draft; DELETE FROM entities; DELETE FROM entry_entities;
    DELETE FROM reactions; DELETE FROM letters; DELETE FROM kv;
    DELETE FROM goals; DELETE FROM goal_checkins; DELETE FROM chat_messages;
  `);
  await db.execAsync('VACUUM');
}
