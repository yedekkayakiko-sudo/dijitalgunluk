import Anthropic from '@anthropic-ai/sdk';
import { ClaudeMascot } from './ai';
import { createApp } from './app';
import { loadConfig } from './config';
import { VoyageEmbedder } from './embeddings';
import { D1Sink, MemorySink, type D1Like } from './events';

// Cloudflare Workers entry. The free plan comfortably covers the first hundreds of users.

interface WorkerEnv {
  DB?: D1Like;
  [key: string]: unknown;
}

let cached: ReturnType<typeof createApp> | null = null;

function build(env: WorkerEnv) {
  const vars = Object.fromEntries(Object.entries(env).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
  const config = loadConfig(vars);
  const client = vars.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: vars.ANTHROPIC_API_KEY }) : null;
  return createApp({
    config,
    voice: client ? new ClaudeMascot(config.voiceModel, client) : null,
    fast: client ? new ClaudeMascot(config.fastModel, client) : null,
    embedder: config.voyageApiKey ? new VoyageEmbedder(config.voyageApiKey, config.voyageModel) : null,
    events: env.DB ? new D1Sink(env.DB) : new MemorySink(),
  });
}

export default {
  fetch(request: Request, env: WorkerEnv, ctx: unknown) {
    cached ??= build(env);
    return cached.fetch(request, env, ctx as never);
  },
};
