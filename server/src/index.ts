import { serve } from '@hono/node-server';
import { ClaudeMascot } from './ai';
import { createApp } from './app';
import { loadConfig } from './config';
import { VoyageEmbedder } from './embeddings';
import { MemorySink } from './events';
import { MemoryQuotaStore } from './quota';

// Node entry, for local development. Production runs on Cloudflare Workers (src/worker.ts).
const config = loadConfig(process.env);
const hasClaudeKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
if (!hasClaudeKey) console.warn('ANTHROPIC_API_KEY is not set: AI routes will answer 503 and the app will use on-device templates.');

const app = createApp({
  config,
  voice: hasClaudeKey ? new ClaudeMascot(config.voiceModel) : null,
  fast: hasClaudeKey ? new ClaudeMascot(config.fastModel) : null,
  embedder: config.voyageApiKey ? new VoyageEmbedder(config.voyageApiKey, config.voyageModel) : null,
  events: new MemorySink(),
  quotas: new MemoryQuotaStore(),
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`günlük server listening on :${info.port} (voice ${config.voiceModel}, fast ${config.fastModel})`);
});
