import { ModelRouter } from '@reflection-ai/ai';
import { cleanJsonText } from './normalization.js';

export interface SimilarityResult {
  similarityScore: number;
  isDuplicate: boolean;
  reason: string;
}

export class QuestionSimilarityEngine {
  public static async compareQuestions(
    q1: string,
    q2: string,
    intent1?: string,
    intent2?: string,
    entities1: string[] = [],
    entities2: string[] = [],
    canonicalConcernId1?: string | null,
    canonicalConcernId2?: string | null
  ): Promise<SimilarityResult> {
    // Fast path: Exact canonical concern ID match
    if (canonicalConcernId1 && canonicalConcernId2 && canonicalConcernId1 === canonicalConcernId2) {
      return {
        similarityScore: 1.0,
        isDuplicate: true,
        reason: `Identical canonical concern ID (${canonicalConcernId1}).`
      };
    }

    const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'for', 'of', 'with', 'by', 'you', 'your', 'did', 'do', 'how', 'what', 'why', 'can', 'this', 'that']);
    const getWords = (s: string) => new Set((s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w)));
    const w1 = getWords(q1);
    const w2 = getWords(q2);

    if (w1.size === 0 || w2.size === 0) {
      return { similarityScore: 0.0, isDuplicate: false, reason: 'Empty word set' };
    }

    let intersection = 0;
    for (const w of w1) {
      if (w2.has(w)) intersection++;
    }
    const union = new Set([...w1, ...w2]).size;
    const jaccard = union > 0 ? intersection / union : 0;

    // Fast path: distinct questions
    if (jaccard < 0.25) {
      return { similarityScore: jaccard, isDuplicate: false, reason: 'Low lexical overlap' };
    }

    // Fast path: nearly identical
    if (jaccard >= 0.70) {
      return { similarityScore: jaccard, isDuplicate: true, reason: 'High lexical overlap' };
    }

    const prompt = `
You are the Question Similarity and Deduplication Engine for the ReflectionAi platform.
Compare the following two interview questions to determine if they are semantically equivalent (i.e. duplicates that ask for the same information).

Question 1:
"${q1}"
Intent 1: ${intent1 || 'unknown'}
Entities 1: ${JSON.stringify(entities1)}

Question 2:
"${q2}"
Intent 2: ${intent2 || 'unknown'}
Entities 2: ${JSON.stringify(entities2)}

Evaluation Criteria:
- Assess if the core intent, topic, and expected answer of the two questions are equivalent.
- E.g., "Why did you choose MySQL?" and "What made you select MySQL?" are duplicates.
- If the core information requested is the same, they should be marked as duplicates (isDuplicate = true) and given a similarityScore >= 0.80.
- If they ask about similar topics but require different depths or focus (e.g. "Why MySQL?" vs "How do you optimize MySQL index bottlenecks?"), they are NOT duplicates (isDuplicate = false).

Output ONLY raw JSON matching the following structure:
{
  "similarityScore": 0.95,
  "isDuplicate": true,
  "reason": "Both questions ask for the rationale behind choosing MySQL over other options."
}
`;

    const result = await ModelRouter.runTask('similarity_check', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          similarityScore: { type: 'NUMBER' },
          isDuplicate: { type: 'BOOLEAN' },
          reason: { type: 'STRING' }
        },
        required: ['similarityScore', 'isDuplicate', 'reason']
      }
    });

    try {
      const parsed = JSON.parse(cleanJsonText(result.text));
      return {
        similarityScore: Number(parsed.similarityScore || 0.0),
        isDuplicate: Boolean(parsed.isDuplicate || false),
        reason: parsed.reason || ''
      };
    } catch (err) {
      console.error('Failed to parse question similarity response:', result.text);
      return {
        similarityScore: 0.0,
        isDuplicate: false,
        reason: 'Error parsing LLM response.'
      };
    }
  }

  public static async isDuplicateOfAny(
    proposedQuestion: string,
    existingQuestions: Array<{ question: string; intent?: string; entities?: string[] }>,
    threshold = 0.8
  ): Promise<{ isDuplicate: boolean; duplicateOf?: string; reason?: string }> {
    const norm1 = proposedQuestion.toLowerCase().trim().replace(/[?.!,]/g, '');

    for (const eq of existingQuestions) {
      // 1. Exact normalized string comparison
      const norm2 = eq.question.toLowerCase().trim().replace(/[?.!,]/g, '');
      if (norm1 === norm2) {
        return {
          isDuplicate: true,
          duplicateOf: eq.question,
          reason: 'Exact string match (normalized).'
        };
      }

      // Fast check: length difference or zero word overlap
      const words1 = new Set(norm1.split(/\s+/));
      const words2 = norm2.split(/\s+/);
      const overlap = words2.filter(w => words1.has(w) && w.length > 3).length;
      if (overlap === 0 && words1.size > 3 && words2.length > 3) {
        // Obvious non-duplicate: no common significant words
        continue;
      }

      // 2. Semantic comparison via LLM only when there is potential lexical overlap
      const res = await this.compareQuestions(
        proposedQuestion,
        eq.question,
        undefined,
        eq.intent,
        [],
        eq.entities || []
      );
      if (res.isDuplicate || res.similarityScore >= threshold) {
        return {
          isDuplicate: true,
          duplicateOf: eq.question,
          reason: res.reason
        };
      }
    }

    return { isDuplicate: false };
  }
}
