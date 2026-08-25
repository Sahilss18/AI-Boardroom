import { ModelRouter } from '@reflection-ai/ai';
import { SemanticContext } from '@reflection-ai/shared';
import { normalizeClaim, cleanJsonText } from './normalization.js';

export class SemanticEngine {
  public static async analyzeTurn(text: string, conversationHistory: string): Promise<SemanticContext> {
    const prompt = `
You are the Semantic Analysis Engine for the ReflectionAi boardroom interview platform.
Your task is to analyze the candidate's latest utterance in the context of the conversation history.

CANDIDATE'S LATEST UTTERANCE:
"${text}"

RECENT CONVERSATION HISTORY:
${conversationHistory || '(first message)'}

==============================
CLASSIFICATION RULES:
==============================
- If the candidate mentions technologies (Node.js, MySQL, Python, React, etc.),
  describes a project, mentions metrics (users, latency, requests), or describes
  an architectural decision → intent MUST be "technical_explanation" or "project_description".
  It is NEVER a "greeting".
- Use "greeting" ONLY if the utterance is literally "Hi", "Hello", "Good morning", etc.
- Use "technical_justification" when the candidate explains WHY they chose a technology.
- Use "achievement_claim" when the candidate states a measurable outcome.
- Use "career_goal" when describing future plans.
- Use "behavioral_response" for soft-skill / behavioral answers.
- Use "clarification_request" if candidate is asking a question.
- "confidence" must reflect how certain you are of the intent classification.

INTENT OPTIONS (choose the best match):
  technical_explanation, project_description, technical_justification,
  achievement_claim, career_goal, behavioral_response, clarification_request,
  acknowledgment, greeting

==============================
EXTRACTION RULES:
==============================
1. entities: Extract ALL technologies, frameworks, databases, metrics, architectures,
   company names, roles, or measurable numbers. Type must be one of:
   TECHNOLOGY, METRIC, ARCHITECTURE, COMPANY, ROLE, FRAMEWORK, DATABASE, LANGUAGE.
2. claims: Concrete factual assertions. For each: subject (usually "candidate"),
   predicate (action/verb), object (what was built/achieved). Include measurable claims.
3. topics: High-level categories (e.g., "database architecture", "scalability", "microservices").

Return ONLY raw JSON. No markdown, no prose:
{
  "intent": { "type": "string", "confidence": number },
  "entities": [
    { "type": "string", "value": "string", "confidence": number }
  ],
  "claims": [
    { "subject": "string", "predicate": "string", "object": "string", "confidence": number }
  ],
  "topics": ["string"],
  "detectedQuestions": [
    { "text": "string", "intent": "string", "confidence": number }
  ]
}
`;

    const result = await ModelRouter.runTask('semantic_analysis', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          intent: {
            type: 'OBJECT',
            properties: {
              type: { type: 'STRING' },
              confidence: { type: 'NUMBER' }
            },
            required: ['type', 'confidence']
          },
          entities: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                type: { type: 'STRING' },
                value: { type: 'STRING' },
                confidence: { type: 'NUMBER' }
              },
              required: ['type', 'value', 'confidence']
            }
          },
          claims: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                subject: { type: 'STRING' },
                predicate: { type: 'STRING' },
                object: { type: 'STRING' },
                confidence: { type: 'NUMBER' }
              },
              required: ['subject', 'predicate', 'object', 'confidence']
            }
          },
          topics: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                confidence: { type: 'NUMBER' }
              },
              required: ['name', 'confidence']
            }
          },
          detectedQuestions: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING' },
                intent: { type: 'STRING' },
                confidence: { type: 'NUMBER' }
              },
              required: ['text']
            }
          }
        },
        required: ['intent', 'entities', 'claims', 'topics']
      }
    });

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJsonText(result.text));
    } catch (err) {
      console.error('Failed to parse semantic engine response:', result.text);
      throw new Error('Invalid JSON returned by Semantic Engine: ' + err);
    }

    // Normalize all extracted claims
    const claims = (parsed.claims || []).map((c: any) => {
      const norm = normalizeClaim(c.subject, c.predicate, c.object);
      return {
        ...norm,
        confidence: c.confidence || 0.8
      };
    });

    return {
      intent: {
        type: parsed.intent?.type || 'unknown',
        confidence: parsed.intent?.confidence || 0.5
      },
      entities: parsed.entities || [],
      claims,
      topics: parsed.topics || [],
      detectedQuestions: parsed.detectedQuestions || [],
      evidenceReferences: [],
      confidence: parsed.intent?.confidence || 0.5
    };
  }
}
