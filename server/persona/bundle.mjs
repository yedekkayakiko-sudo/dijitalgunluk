// The character constitution first, then each skill file in its numbered order.
import { readdirSync, readFileSync } from 'node:fs';

export function personaText() {
  const dir = new URL('./', import.meta.url);
  const skills = readdirSync(new URL('skills/', dir)).filter((f) => f.endsWith('.md')).sort();
  return [readFileSync(new URL('PUSULA.md', dir), 'utf8'), ...skills.map((f) => readFileSync(new URL(`skills/${f}`, dir), 'utf8'))]
    .map((s) => s.trim())
    .join('\n\n');
}
