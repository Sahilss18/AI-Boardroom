import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';
import { TextChunk } from './document-parser.js';

export class QdrantService {
  private static client: QdrantClient | null = null;
  private static collectionName = 'reflection_ai_documents';

  public static getClient(): QdrantClient {
    if (!this.client) {
      const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
      this.client = new QdrantClient({ url: qdrantUrl });
    }
    return this.client;
  }

  /**
   * Initializes the Qdrant collection if it does not already exist.
   */
  public static async ensureCollection(): Promise<string> {
    const client = this.getClient();
    try {
      await client.getCollection(this.collectionName);
    } catch (err) {
      // Collection does not exist, create it with 384 dimensions and Cosine distance metric
      await client.createCollection(this.collectionName, {
        vectors: {
          size: 384,
          distance: 'Cosine'
        }
      });
    }
    return this.collectionName;
  }

  /**
   * Upserts text chunks and their embeddings to Qdrant, tagged with the sessionId.
   */
  public static async upsertChunks(
    sessionId: number,
    chunks: TextChunk[],
    embeddings: number[][]
  ): Promise<string[]> {
    const client = this.getClient();
    const collectionName = await this.ensureCollection();

    if (chunks.length !== embeddings.length) {
      throw new Error('Mismatch between chunk count and embedding count.');
    }

    const pointIds = chunks.map(() => crypto.randomUUID());

    const points = chunks.map((chunk, index) => {
      return {
        id: pointIds[index],
        vector: embeddings[index],
        payload: {
          sessionId,
          text: chunk.text,
          sourceName: chunk.metadata.sourceName,
          pageNumber: chunk.metadata.pageNumber || null,
          slideNumber: chunk.metadata.slideNumber || null,
          chunkIndex: chunk.chunkIndex
        }
      };
    });

    const batchSize = 100;
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      await client.upsert(collectionName, { points: batch });
    }

    return pointIds;
  }

  /**
   * Performs a vector similarity search strictly isolated by sessionId.
   */
  public static async searchIsolated(
    sessionId: number,
    queryVector: number[],
    limit: number = 5
  ): Promise<any[]> {
    const client = this.getClient();
    const collectionName = await this.ensureCollection();

    const results = await client.query(collectionName, {
      query: queryVector,
      filter: {
        must: [
          {
            key: 'sessionId',
            match: {
              value: sessionId
            }
          }
        ]
      },
      limit,
      with_payload: true
    });

    return results.points.map(r => ({
      text: r.payload?.text as string || '',
      score: r.score,
      metadata: {
        sourceName: r.payload?.sourceName as string || '',
        pageNumber: r.payload?.pageNumber as number || undefined,
        slideNumber: r.payload?.slideNumber as number || undefined,
        chunkIndex: r.payload?.chunkIndex as number || undefined
      }
    }));
  }

  /**
   * Deletes all points belonging to a specific sessionId to maintain tenant hygiene.
   */
  public static async deleteSessionDocuments(sessionId: number): Promise<void> {
    const client = this.getClient();
    const collectionName = await this.ensureCollection();

    await client.delete(collectionName, {
      filter: {
        must: [
          {
            key: 'sessionId',
            match: {
              value: sessionId
            }
          }
        ]
      }
    });
  }
}
