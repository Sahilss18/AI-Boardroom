import { ModelRouter } from '@reflection-ai/ai';
import { LatentConcern, SemanticContext } from '@reflection-ai/shared';
import { cleanJsonText } from './normalization.js';

export interface SatisfactionEvaluation {
  status: 'UNRESOLVED' | 'PARTIALLY_SATISFIED' | 'SATISFIED' | 'DEFERRED' | 'ABANDONED' | 'CONTRADICTED';
  score: number;
  reason: string;
  evidence: string[];
  missingEvidence: string[];
  confidence: number;
}

export class QuestionSatisfactionEngine {
  public static async evaluateConcern(
    concern: LatentConcern,
    userUtterance: string,
    semanticContext: SemanticContext,
    conversationHistory: string
  ): Promise<SatisfactionEvaluation> {
    const prompt = `
You are the Boardroom Concern Evaluation Engine for the ReflectionAi platform.
Your task is to determine to what degree the candidate's latest response has provided the necessary evidence for a specific boardroom concern.

Boardroom Concern:
Objective: "${concern.objective}"
Required Evidence Items to Find:
${concern.requiredEvidence.map(e => `- ${e}`).join('\n')}

Candidate's Latest Utterance:
"${userUtterance}"

Extracted Semantic Claims from Utterance:
${JSON.stringify(semanticContext.claims, null, 2)}

Extracted Entities from Utterance:
${JSON.stringify(semanticContext.entities, null, 2)}

Recent Conversation History:
${conversationHistory}

Evaluation Guidelines:
1. Examine if the candidate has provided concrete evidence for each required item.
2. Output the list of "evidence" (items that are now satisfied/observed).
3. Output the list of "missingEvidence" (items that are still unanswered or unverified).
4. Assign a satisfactionScore between 0.00 and 1.00:
   - 0.85 to 1.00: All or almost all critical evidence is satisfied (status: "SATISFIED").
   - 0.40 to 0.84: Some evidence is satisfied, but critical items are missing (status: "PARTIALLY_SATISFIED").
   - Less than 0.40: Little or no relevant evidence has been provided (status: "UNRESOLVED").
5. Provide a detailed, human-like "reason" explaining the score (e.g. "Candidate confirmed load testing with k6 but provided no latency or error rate metrics.").

Output ONLY raw JSON matching the following structure:
{
  "status": "UNRESOLVED" | "PARTIALLY_SATISFIED" | "SATISFIED",
  "score": 0.58,
  "reason": "The candidate confirmed load testing occurred but did not explain workloads or latency.",
  "evidence": ["load testing"],
  "missingEvidence": ["latency metrics", "error rate"],
  "confidence": 0.90
}
`;

    const result = await ModelRouter.runTask('satisfaction_evaluation', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          status: { type: 'STRING', enum: ['UNRESOLVED', 'PARTIALLY_SATISFIED', 'SATISFIED'] },
          score: { type: 'NUMBER' },
          reason: { type: 'STRING' },
          evidence: { type: 'ARRAY', items: { type: 'STRING' } },
          missingEvidence: { type: 'ARRAY', items: { type: 'STRING' } },
          confidence: { type: 'NUMBER' }
        },
        required: ['status', 'score', 'reason', 'evidence', 'missingEvidence', 'confidence']
      }
    });

    try {
      const parsed = JSON.parse(cleanJsonText(result.text));
      return {
        status: parsed.status || 'UNRESOLVED',
        score: Number(parsed.score || 0.0),
        reason: parsed.reason || 'No evaluation reason provided.',
        evidence: parsed.evidence || [],
        missingEvidence: parsed.missingEvidence || [],
        confidence: Number(parsed.confidence || 0.5)
      };
    } catch (err) {
      console.error('Failed to parse concern satisfaction response:', result.text);
      return {
        status: 'UNRESOLVED',
        score: 0.0,
        reason: 'Error parsing LLM response.',
        evidence: [],
        missingEvidence: concern.requiredEvidence,
        confidence: 0.5
      };
    }
  }

  // Deprecated fallback method to preserve backwards compatibility
  public static async evaluateQuestion(
    question: any,
    userUtterance: string,
    semanticContext: SemanticContext,
    conversationHistory: string
  ): Promise<{ satisfactionScore: number; reason: string }> {
    const mockConcern: LatentConcern = {
      concernId: String(question.id),
      objective: question.question,
      requiredEvidence: ['general context'],
      observedEvidence: [],
      missingEvidence: ['general context'],
      status: 'UNRESOLVED',
      satisfactionScore: 0,
      satisfactionReason: '',
      priority: question.priority || 0.8
    };
    const evalResult = await this.evaluateConcern(mockConcern, userUtterance, semanticContext, conversationHistory);
    return {
      satisfactionScore: evalResult.score,
      reason: evalResult.reason
    };
  }
}
