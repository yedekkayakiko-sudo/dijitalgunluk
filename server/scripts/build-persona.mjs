// Bundles persona/PUSULA.md into a TS module so it works on Node and on Cloudflare Workers.
import { readFileSync, writeFileSync } from 'node:fs';

const md = readFileSync(new URL('../persona/PUSULA.md', import.meta.url), 'utf8');
const out = `// Generated from persona/PUSULA.md by scripts/build-persona.mjs. Do not edit by hand.\nexport const PERSONA = ${JSON.stringify(md)};\n`;
writeFileSync(new URL('../src/persona.generated.ts', import.meta.url), out);
console.log(`persona: ${md.length} chars`);
