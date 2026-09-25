import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { newId } from './db';

/*
 * Photos are copied into the app's private document directory, so they stay
 * with the entry even if the original is removed from the gallery, and are
 * deleted together with the entry.
 */

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  return dir;
}

export async function pickPhotos(): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 4,
    quality: 0.7,
    exif: false,
  });
  if (res.canceled) return [];
  const out: string[] = [];
  for (const asset of res.assets) {
    const ext = (asset.fileName?.split('.').pop() ?? 'jpg').toLowerCase();
    const dest = new File(photoDir(), `${newId()}.${ext}`);
    await new File(asset.uri).copy(dest);
    out.push(dest.uri);
  }
  return out;
}

export function deletePhotos(uris: string[]): void {
  for (const uri of uris) {
    try {
      const f = new File(uri);
      if (f.exists) f.delete();
    } catch {
      // already gone
    }
  }
}

export function deleteAllPhotos(): void {
  const dir = new Directory(Paths.document, 'photos');
  if (dir.exists) dir.delete();
}
