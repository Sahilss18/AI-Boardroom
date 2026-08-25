import { ModelRouter, CONCERN_GENERATION_PROMPT, CONCERN_GENERATION_FROM_DOC_PROMPT } from '@reflection-ai/ai';
import { LatentQuestion } from '@reflection-ai/shared';
import { cleanJsonText } from './normalization.js';

/**
 * PHASE 5: Latent Concern Generator
 *
 * Generates CONCERNS (objectives + required evidence arrays) instead of literal questions.
 * Questions are generated dynamically at runtime based on what the candidate actually says
 * and what evidence is still missing from each concern.
 */
export class LatentQuestionGenerator {
  public static async generateQuestions(
    sessionId: number,
    personaId: number,
    personaName: string,
    personaRole: string,
    personaDescription: string,
    objectives: string[],
    scenarioName: string,
    scenarioDescription: string
  ): Promise<Omit<LatentQuestion, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const prompt = CONCERN_GENERATION_PROMPT
      .replace('{personaName}', personaName)
      .replace('{personaRole}', personaRole)
      .replace('{personaDescription}', personaDescription)
      .replace('{objectives}', objectives.map((o, i) => `${i + 1}. ${o}`).join('\n'))
      .replace('{scenarioName}', scenarioName)
      .replace('{scenarioDescription}', scenarioDescription);

    const result = await ModelRouter.runTask('question_generation', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          concerns: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                objective: { type: 'STRING' },
                requiredEvidence: { type: 'ARRAY', items: { type: 'STRING' } },
                intent: { type: 'STRING' },
                priority: { type: 'NUMBER' },
                entities: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['objective', 'requiredEvidence', 'intent', 'priority', 'entities']
            }
          }
        },
        required: ['concerns']
      }
    });

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText(result.text));
    } catch (err) {
      console.error('Failed to parse latent concern generator response:', result.text);
      throw new Error('Invalid JSON returned by Latent Concern Generator: ' + err);
    }

    return (parsed.concerns || []).map((c: any, index: number) => {
      const canonicalId = getCanonicalQuestionId(c.objective, c.intent, c.entities || []);
      const requiredEvidence: string[] = c.requiredEvidence || ['general verification'];

      return {
        sessionId,
        personaId,
        question: c.objective,
        normalizedQuestion: c.objective.toLowerCase().trim().replace(/[?.!,]/g, ''),
        intent: c.intent || 'general_evaluation',
        entitiesJson: c.entities || [],
        priority: Number(c.priority || 0.7),
        status: 'UNANSWERED' as any,
        satisfactionScore: 0.0,
        source: 'concern_generation',
        questionId: `concern_${personaId}_${index}_${Date.now()}`,
        canonicalIntent: c.intent || 'general_evaluation',
        canonicalQuestionId: canonicalId,
        metadataJson: {
          requiredEvidence,
          observedEvidence: [],
          missingEvidence: requiredEvidence,
          satisfactionReason: '',
          isConcern: true,
          desiredUnderstanding: c.objective,
        }
      };
    });
  }

  /**
   * Generates document-specific concerns dynamically from an uploaded PDF, PPTX, DOCX, or TXT file.
   */
  public static async generateQuestionsFromDocument(
    sessionId: number,
    personaId: number,
    personaName: string,
    personaRole: string,
    personaDescription: string,
    documentName: string,
    documentContent: string
  ): Promise<Omit<LatentQuestion, 'id' | 'createdAt' | 'updatedAt'>[]> {
    const truncatedContent = documentContent.length > 4000 
      ? documentContent.substring(0, 4000) + '\n... [content truncated]'
      : documentContent;

    const prompt = CONCERN_GENERATION_FROM_DOC_PROMPT
      .replace('{personaName}', personaName)
      .replace('{personaRole}', personaRole)
      .replace('{personaDescription}', personaDescription)
      .replace('{documentName}', documentName)
      .replace('{documentContent}', truncatedContent);

    const result = await ModelRouter.runTask('question_generation', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          concerns: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                objective: { type: 'STRING' },
                requiredEvidence: { type: 'ARRAY', items: { type: 'STRING' } },
                intent: { type: 'STRING' },
                priority: { type: 'NUMBER' },
                entities: { type: 'ARRAY', items: { type: 'STRING' } }
              },
              required: ['objective', 'requiredEvidence', 'intent', 'priority', 'entities']
            }
          }
        },
        required: ['concerns']
      }
    });

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText(result.text));
    } catch (err) {
      console.error('Failed to parse document concern generator response:', result.text);
      throw new Error('Invalid JSON returned by Document Concern Generator: ' + err);
    }

    return (parsed.concerns || []).map((c: any, index: number) => {
      const canonicalId = getCanonicalQuestionId(c.objective, c.intent, c.entities || []);
      const requiredEvidence: string[] = c.requiredEvidence || ['document validation'];

      return {
        sessionId,
        personaId,
        question: c.objective,
        normalizedQuestion: c.objective.toLowerCase().trim().replace(/[?.!,]/g, ''),
        intent: c.intent || 'document_verification',
        entitiesJson: c.entities || [],
        priority: Number(c.priority || 0.85),
        status: 'UNANSWERED' as any,
        satisfactionScore: 0.0,
        source: 'document_concern_generation',
        questionId: `doc_concern_${personaId}_${index}_${Date.now()}`,
        canonicalIntent: c.intent || 'document_verification',
        canonicalQuestionId: canonicalId,
        metadataJson: {
          requiredEvidence,
          observedEvidence: [],
          missingEvidence: requiredEvidence,
          satisfactionReason: '',
          isConcern: true,
          isDocumentConcern: true,
          documentName,
          desiredUnderstanding: c.objective,
        }
      };
    });
  }
}


export function getCanonicalQuestionId(text: string, intent: string, entities: string[]): string {
  const textLower = text.toLowerCase();
  const intentLower = intent.toLowerCase();
  const ents = (entities || []).map(e => String(e).toLowerCase());

  // Scalability / Load testing
  if (
    intentLower.includes('scalability') ||
    intentLower.includes('load_testing') ||
    intentLower.includes('loadtest') ||
    intentLower.includes('verify_scalability') ||
    textLower.includes('load-test') ||
    textLower.includes('load testing') ||
    textLower.includes('100k') ||
    textLower.includes('concurrent') ||
    ents.some(e => e.includes('100k') || e.includes('load') || e.includes('scale') || e.includes('scalability'))
  ) {
    return 'q_scalability_load_testing';
  }

  // Database choice
  if (
    intentLower.includes('db_choice') ||
    intentLower.includes('database') ||
    textLower.includes('mysql') ||
    textLower.includes('postgresql') ||
    textLower.includes('database') ||
    ents.some(e => e.includes('mysql') || e.includes('postgresql') || e.includes('database'))
  ) {
    return 'q_database_choice';
  }

  // Infrastructure / Cost
  if (
    intentLower.includes('cost') ||
    intentLower.includes('infrastructure') ||
    intentLower.includes('hosting') ||
    textLower.includes('hosting cost') ||
    textLower.includes('infrastructure cost') ||
    textLower.includes('monthly cost') ||
    ents.some(e => e.includes('cost') || e.includes('hosting') || e.includes('infrastructure'))
  ) {
    return 'q_infrastructure_cost';
  }

  // Business / Revenue / Market
  if (
    intentLower.includes('revenue') ||
    intentLower.includes('business') ||
    intentLower.includes('market') ||
    intentLower.includes('commercial') ||
    textLower.includes('revenue') ||
    textLower.includes('market size') ||
    textLower.includes('business model') ||
    ents.some(e => e.includes('revenue') || e.includes('market'))
  ) {
    return 'q_business_model';
  }

  // Team / Leadership / Conflict
  if (
    intentLower.includes('conflict') ||
    intentLower.includes('leadership') ||
    intentLower.includes('team') ||
    textLower.includes('conflict') ||
    textLower.includes('team conflict') ||
    ents.some(e => e.includes('conflict') || e.includes('team'))
  ) {
    return 'q_conflict_resolution';
  }

  // Fallback: intent-based slug
  const cleanIntent = intentLower.replace(/[^a-z0-9]/g, '_');
  return `q_${cleanIntent || 'generic_query'}`;
}
