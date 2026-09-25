/** "sadece ben" / "AI görsün ama analiz etmesin" / "AI tam analiz etsin" */
export type PrivacyLevel = 'private' | 'ai_read' | 'ai_full';

export type MascotTone = 'calm' | 'energetic' | 'minimal';

export type EntryKind = 'entry' | 'one_word';

/** 1 = çok zor bir gün, 5 = çok güzel bir gün */
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface Entry {
  id: string;
  /** ISO 8601 */
  createdAt: string;
  updatedAt: string;
  kind: EntryKind;
  text: string;
  mood: Mood | null;
  weather: string | null;
  place: string | null;
  photos: string[];
  privacy: PrivacyLevel;
}

export type EntityKind = 'person' | 'place';

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  /** normalizeKey(name) */
  key: string;
  firstSeenAt: string;
  lastSeenAt: string;
  mentionCount: number;
  /** Sum of moods of entries mentioning it, for average tone. */
  moodSum: number;
  moodCount: number;
}

export type ReactionKind =
  | 'crisis'
  | 'support'
  | 'celebrate'
  | 'new_person'
  | 'short_streak'
  | 'recurring_theme'
  | 'none';

export interface ReactionRecord {
  kind: ReactionKind;
  at: string;
  /** e.g. the theme or person the reaction was about */
  subject?: string | null;
}
