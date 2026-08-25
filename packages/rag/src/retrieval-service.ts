import { EmbeddingProvider } from './embedding-provider.js';
import { QdrantService } from './qdrant-service.js';
import { AgentPrivateState, SemanticContext } from '@reflection-ai/shared';
import { ModelRouter } from '@reflection-ai/ai';

export interface RetrievedContext {
  text: string;
  score: number;
  metadata: {
    sourceName: string;
    pageNumber?: number;
    slideNumber?: number;
    chunkIndex?: number;
  };
}

export interface ContradictionResult {
  isContradiction: boolean;
  reason?: string;
  conflictingClaims?: string[];
}

export class RetrievalService {
  /**
   * Formulates a query and retrieves tenant-isolated chunks.
   */
  public static async retrieveContext(
    sessionId: number,
    userMessage: string,
    agentState: AgentPrivateState,
    semanticContext?: SemanticContext,
    limit: number = 3
  ): Promise<RetrievedContext[]> {
    if (userMessage.startsWith('TRIGGER_RAG_FAILURE')) {
      throw new Error('Simulated Qdrant/Embedding connection failure.');
    }
    // 1. Formulate Query Text
    const queryParts: string[] = [userMessage];

    // Add unanswered or partially answered latent questions
    const activeQuestions = (agentState.latentQuestions || [])
      .filter(q => q.status === 'UNANSWERED' || q.status === 'PARTIALLY_ANSWERED')
      .map(q => q.question);
    if (activeQuestions.length > 0) {
      queryParts.push(`Target questions: ${activeQuestions.join(' ')}`);
    }

    // Add incomplete objectives
    const incompleteObjectives = (agentState.objectives || [])
      .filter(o => !o.completed)
      .map(o => o.description);
    if (incompleteObjectives.length > 0) {
      queryParts.push(`Objectives: ${incompleteObjectives.join(' ')}`);
    }

    // Add semantic context details
    if (semanticContext) {
      if (semanticContext.entities.length > 0) {
        queryParts.push(`Entities: ${semanticContext.entities.map(e => e.value).join(', ')}`);
      }
      if (semanticContext.claims.length > 0) {
        const claimsText = semanticContext.claims
          .map(c => `${c.subject} ${c.predicate} ${c.object}`)
          .join('. ');
        queryParts.push(`Stated claims: ${claimsText}`);
      }
    }

    const queryText = queryParts.join(' | ');

    try {
      // 2. Generate Embedding
      const queryVector = await EmbeddingProvider.getEmbedding(queryText);

      // 3. Search Isolated in Qdrant
      const results = await QdrantService.searchIsolated(sessionId, queryVector, limit);

      const threshold = parseFloat(process.env.RAG_MIN_SCORE_THRESHOLD || '0.50');
      const filtered = results.filter(r => r.score >= threshold);
      return filtered.length > 0 ? filtered : results.slice(0, 2);
    } catch (err) {
      console.warn('RAG Context Retrieval failed. Continuing without context.', err);
      throw err;
    }
  }

  /**
   * Compares retrieved context with candidate statements to detect contradictions.
   */
  public static async checkContradictions(
    userMessage: string,
    semanticContext: SemanticContext | undefined,
    retrievedChunks: RetrievedContext[]
  ): Promise<ContradictionResult> {
    if (retrievedChunks.length === 0) {
      return { isContradiction: false };
    }

    const retrievedContext = retrievedChunks.map(c => `[Source: ${c.metadata.sourceName}] ${c.text}`).join('\n');
    const userClaims = semanticContext
      ? semanticContext.claims.map(c => `- ${c.subject} ${c.predicate} ${c.object}`).join('\n')
      : 'None';

    const prompt = `
You are analyzing whether the candidate's latest statement contradicts the official retrieved document context.

Candidate Latest Statement:
"${userMessage}"

Candidate Stated Claims:
${userClaims}

Retrieved Document Context:
"${retrievedContext}"

Compare the candidate's claims with the retrieved document context. Do they conflict or contradict each other?
For example, if the candidate claims they used MySQL, but the document says they used PostgreSQL, that is a CONTRADICTION.
If they do contradict, return isContradiction: true, a detailed reason, and the conflicting claims.

Format your output as a raw JSON object matching this schema:
{
  "isContradiction": boolean,
  "reason": "description of the conflict",
  "conflictingClaims": ["candidate claim vs document statement"]
}
`;

    try {
      const result = await ModelRouter.runTask('contradiction_analysis', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        responseFormat: 'json',
        jsonSchema: {
          type: 'OBJECT',
          properties: {
            isContradiction: { type: 'BOOLEAN' },
            reason: { type: 'STRING' },
            conflictingClaims: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['isContradiction']
        }
      });

      const parsed = JSON.parse(result.text);
      return {
        isContradiction: !!parsed.isContradiction,
        reason: parsed.reason || undefined,
        conflictingClaims: parsed.conflictingClaims || undefined
      };
    } catch (err) {
      console.warn('Contradiction analysis failed, falling back to false.', err);
      return { isContradiction: false };
    }
  }
}
