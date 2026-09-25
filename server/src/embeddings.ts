/**
 * Optional semantic embeddings via Voyage AI (Anthropic does not ship an
 * embedding model). Without a key the app falls back to on-device lexical search.
 */
export interface Embedder {
  embed(texts: string[], kind: 'document' | 'query'): Promise<number[][]>;
}

export class VoyageEmbedder implements Embedder {
  constructor(private apiKey: string, private model: string) {}

  async embed(texts: string[], kind: 'document' | 'query'): Promise<number[][]> {
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ input: texts, model: this.model, input_type: kind }),
    });
    if (!res.ok) throw new Error(`embedding request failed: ${res.status}`);
    const body = (await res.json()) as { data: { embedding: number[]; index: number }[] };
    return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
