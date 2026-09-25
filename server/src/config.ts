export interface Config {
  port: number;
  /** Model for all mascot calls. */
  model: string;
  /** Optional shared key the app sends in `x-app-key`; blocks casual abuse of the endpoint. */
  appKey: string | null;
  voyageApiKey: string | null;
  voyageModel: string;
  /** Requests per install per hour. */
  hourlyLimit: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    port: Number(env.PORT ?? 8787),
    model: env.CLAUDE_MODEL ?? 'claude-opus-5',
    appKey: env.APP_KEY || null,
    voyageApiKey: env.VOYAGE_API_KEY || null,
    voyageModel: env.VOYAGE_MODEL ?? 'voyage-3.5',
    hourlyLimit: Number(env.HOURLY_LIMIT ?? 60),
  };
}
