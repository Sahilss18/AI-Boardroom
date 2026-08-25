import { pipeline, env } from '@xenova/transformers';

// Allow transformers to fetch and cache model locally
env.allowLocalModels = false;

export class EmbeddingProvider {
  private static extractor: any = null;

  private static async getExtractor() {
    if (!this.extractor) {
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return this.extractor;
  }

  /**
   * Generates a 384-dimensional normalized vector embedding for the given text.
   */
  public static async getEmbedding(text: string): Promise<number[]> {
    const extractor = await this.getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data) as number[];
  }
}
