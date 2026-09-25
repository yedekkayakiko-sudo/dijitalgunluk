// Bundles persona/PUSULA.md and persona/skills/*.md into a TS module so it works on Node and on Cloudflare Workers.
import { writeFileSync } from 'node:fs';
import { personaText } from '../persona/bundle.mjs';

const md = personaText();
const out = `// Generated from persona/ by scripts/build-persona.mjs. Do not edit by hand.\nexport const PERSONA = ${JSON.stringify(md)};\n`;
writeFileSync(new URL('../src/persona.generated.ts', import.meta.url), out);
console.log(`persona: ${md.length} chars`);
