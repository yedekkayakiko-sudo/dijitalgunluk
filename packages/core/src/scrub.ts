/*
 * Data minimisation before anything leaves the device: direct identifiers are
 * masked, and the user's own name is never sent (the AI writes {AD} and the
 * app fills it in locally).
 */

export const NAME_TOKEN = '{AD}';

const LETTERS = 'A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû';

const PATTERNS: [RegExp, string][] = [
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[e-posta]'],
  [/\bTR\s?\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/gi, '[IBAN]'],
  [/\b(?:\d[ -]?){15}\d\b/g, '[kart no]'],
  [/\b[1-9]\d{10}\b/g, '[kimlik no]'],
  [/(?:\+90[\s-]?|\b0)?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}\b/g, '[telefon]'],
];

export function scrubIdentifiers(text: string, ownNames: string[] = []): string {
  let out = text;
  for (const [re, label] of PATTERNS) out = out.replace(re, label);
  for (const name of ownNames.map((n) => n.trim()).filter((n) => n.length >= 2)) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(`(^|[^${LETTERS}])${escaped}(?=[^${LETTERS}]|$)`, 'gi'), `$1${NAME_TOKEN}`);
  }
  return out;
}

/** Fills the user's name back in; without a name, "Sevgili {AD}," becomes "Merhaba,". */
export function fillName(text: string, name: string | null | undefined): string {
  const n = name?.trim();
  if (n) return text.split(NAME_TOKEN).join(n);
  return text
    .replace(/Sevgili \{AD\},?/g, 'Merhaba,')
    .replace(/,?\s*\{AD\}(?=[\s,.!?]|$)/g, '')
    .replace(/\{AD\}/g, '');
}
