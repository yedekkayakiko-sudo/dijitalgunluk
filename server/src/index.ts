import { serve } from '@hono/node-server';
import { ClaudeMascot } from './ai';
import { createApp } from './app';
import { loadConfig } from './config';
import { VoyageEmbedder } from './embeddings';

const config = loadConfig();
const hasClaudeKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
if (!hasClaudeKey) console.warn('ANTHROPIC_API_KEY is not set: AI routes will answer 503 and the app will use on-device templates.');

const app = createApp({
  config,
  mascot: hasClaudeKey ? new ClaudeMascot(config.model) : null,
  embedder: config.voyageApiKey ? new VoyageEmbedder(config.voyageApiKey, config.voyageModel) : null,
});

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`günlük server listening on :${info.port} (model ${config.model})`);
});
