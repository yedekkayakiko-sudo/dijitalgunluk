export interface Config {
  port: number;
  /** The mascot's voice: reactions, chat, letters, scenarios, memory notes. */
  voiceModel: string;
  /** Cheap structured work: extracting people and places. */
  fastModel: string;
  /** Optional shared key the app sends in `x-app-key`; blocks casual abuse of the endpoint. */
  appKey: string | null;
  /** Key for reading the anonymous usage counters at GET /v1/stats. */
  adminKey: string | null;
  voyageApiKey: string | null;
  voyageModel: string;
  /** Requests per install per hour (best effort, per server instance). */
  hourlyLimit: number;
}

export type Env = Record<string, string | undefined>;

export function loadConfig(env: Env): Config {
  return {
    port: Number(env.PORT ?? 8787),
    voiceModel: env.CLAUDE_MODEL_VOICE || 'claude-sonnet-5',
    fastModel: env.CLAUDE_MODEL_FAST || 'claude-haiku-4-5',
    appKey: env.APP_KEY || null,
    adminKey: env.ADMIN_KEY || null,
    voyageApiKey: env.VOYAGE_API_KEY || null,
    voyageModel: env.VOYAGE_MODEL || 'voyage-3.5',
    hourlyLimit: Number(env.HOURLY_LIMIT ?? 60),
  };
}
