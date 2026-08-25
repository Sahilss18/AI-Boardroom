import { Persona, AgentPrivateState, ConversationTurn, AgentProposal, AgentObjective, LatentQuestion, SemanticContext } from '@reflection-ai/shared';
import { ModelRouter, BASE_AGENT_PROMPT } from '@reflection-ai/ai';

/**
 * PHASE 5: BaseAgent — Organic Boardroom Intelligence
 *
 * Each agent now reasons from a full BoardroomContext:
 *   - Latest candidate statement (primary input)
 *   - Their own unresolved concerns with evidence gaps
 *   - Other agents' current observations (structured conclusions only)
 *   - Current conversation topic and momentum
 *   - Contradictions detected
 *
 * The agent produces a rich output including:
 *   - recommendedAction (ASK_FOLLOWUP, CHALLENGE, REACT, etc.)
 *   - freshly generated content (NOT from a pre-written list)
 *   - satisfactionReason (WHY the concern is satisfied or not)
 *   - missingEvidence (WHAT is still needed)
 *   - questionReason (WHY this specific question is being asked)
 */
export class BaseAgent {
  public persona: Persona;

  constructor(persona: Persona) {
    this.persona = persona;
  }

  public initializeState(): AgentPrivateState {
    const objectives: AgentObjective[] = (this.persona.configurationJson.objectives || []).map((obj: string, i: number) => ({
      id: `obj_${i}`,
      description: obj,
      completed: false,
    }));

    return {
      personaId: this.persona.id,
      objectives,
      latentQuestions: [],
      concerns: [],
      hypotheses: [],
      observationsList: [],
      evidenceNeeded: [],
      resolvedConcerns: [],
      unresolvedConcerns: [],
      contradictions: [],
      confidence: 1.0,
      lastAction: 'WAIT',
      currentFocus: null,
      speakingCooldown: 0,
    };
  }

  /**
   * Evaluates the latest conversation turn using organic boardroom reasoning.
   * Builds a full BoardroomContext and lets the LLM decide what to do reactively.
   */
  public async evaluateTurn(
    sessionId: number,
    turnId: number,
    state: AgentPrivateState,
    history: ConversationTurn[],
    latestInput: string,
    semanticContext?: SemanticContext,
    retrievedChunks?: any[],
    // Phase 5 additions:
    otherAgentObservations?: { personaId: number; personaName: string; unresolvedConcerns: string[]; lastObservation: string; lastAction: string }[],
    currentTopic?: string,
    topicMomentum?: number,
    contradictions?: string[]
  ): Promise<{ proposal: Omit<AgentProposal, 'id'>; updatedState: AgentPrivateState }> {

    // Build compact history window
    const historyText = history
      .slice(-4)
      .map((t: ConversationTurn) => {
        const sender = t.speakerType === 'user' ? 'Candidate' : `${t.personaId ? `Agent (${t.personaId})` : 'Agent'}`;
        return `${sender}: ${t.text}`;
      })
      .join('\n');

    const objectivesText = state.objectives
      .map((o: any) => `- [${o.completed ? '✓' : '○'}] ${o.description}`)
      .join('\n') || 'No specific objectives defined.';

    // Build concerns text with evidence tracking
    const activeConcerns = state.concerns && state.concerns.length > 0
      ? state.concerns
      : (state.latentQuestions || []).map(q => {
          const meta = q.metadataJson || {};
          const required: string[] = meta.requiredEvidence || this.inferRequiredEvidence(q.intent);
          return {
            concernId: q.questionId || `c_${q.id}`,
            objective: q.question,
            requiredEvidence: required,
            observedEvidence: meta.observedEvidence || [],
            missingEvidence: meta.missingEvidence || required,
            status: q.status as any,
            satisfactionScore: q.satisfactionScore || 0,
            satisfactionReason: meta.satisfactionReason || 'Not yet evaluated.',
            priority: q.priority || 0.8
          };
        });

    // Sort by priority descending — highest priority concern gets focus first
    const sortedConcerns = [...activeConcerns].sort((a, b) => {
      // Prioritize: unresolved + high priority first
      const aScore = (a.status === 'SATISFIED' || a.status === 'ABANDONED') ? -1 : a.priority;
      const bScore = (b.status === 'SATISFIED' || b.status === 'ABANDONED') ? -1 : b.priority;
      return bScore - aScore;
    });

    const concernsText = sortedConcerns
      .slice(0, 2)
      .map(c => {
        const statusIcon = c.status === 'SATISFIED' ? '✓' : c.status === 'PARTIALLY_SATISFIED' ? '◑' : '○';
        return `${statusIcon} Concern ID: ${c.concernId}
  Objective: ${c.objective}
  Status: ${c.status} (Score: ${c.satisfactionScore?.toFixed(2) || '0.00'})
  ${c.satisfactionReason ? `Last Evaluation: ${c.satisfactionReason}` : ''}
  Evidence Found: ${c.observedEvidence?.length > 0 ? c.observedEvidence.join(', ') : 'None yet'}
  Still Missing: ${c.missingEvidence?.length > 0 ? c.missingEvidence.join(', ') : 'None — concern may be satisfied'}
  Priority: ${c.priority?.toFixed(2) || '0.80'}`;
      })
      .join('\n\n');

    // Build other agents' observations (structured conclusions only — no private reasoning)
    const otherObservationsText = (otherAgentObservations || [])
      .filter(o => o.personaId !== this.persona.id)
      .map(o => `- ${o.personaName}: Last action was ${o.lastAction}. ${o.lastObservation ? `Observation: "${o.lastObservation}"` : ''} Unresolved concerns: ${o.unresolvedConcerns.slice(0, 2).join(', ') || 'none'}`)
      .join('\n') || 'No other agents have shared observations yet.';

    // Topic context
    const topicContextText = currentTopic
      ? `Current Topic: ${currentTopic} (momentum: ${(topicMomentum || 0.5).toFixed(2)})\nStay on this topic if you have unresolved concerns about it. Switch only if concern is satisfied or another is much more urgent.`
      : 'No dominant topic established yet.';

    // Semantic context
    const semanticText = semanticContext ? `
Candidate Intent: ${semanticContext.intent.type} (confidence: ${semanticContext.intent.confidence?.toFixed(2) || '?'})
Extracted Entities: ${semanticContext.entities.map(e => `${e.value} (${e.type})`).join(', ') || 'none'}
Extracted Claims:
${semanticContext.claims.map(c => `  - ${c.subject} ${c.predicate} ${c.object} (confidence: ${c.confidence?.toFixed(2) || '?'})`).join('\n') || '  none'}
Topics mentioned: ${semanticContext.topics?.map((t: any) => typeof t === 'string' ? t : t.name).join(', ') || 'none'}
` : `[No semantic analysis available — raw statement: "${latestInput}"]`;

    // RAG context
    const ragText = retrievedChunks && retrievedChunks.length > 0
      ? `\nKnowledge Base Context:\n${retrievedChunks.map(c => `  - [${c.metadata?.sourceName || 'document'}] ${c.text}`).join('\n')}`
      : '';

    // Build Structured EvidenceContext strings
    const docClaimsText = retrievedChunks && retrievedChunks.length > 0
      ? retrievedChunks.map(c => `[${c.metadata?.sourceName || 'document'}] ${c.text}`).join('; ')
      : 'None loaded.';
    const candClaimsText = semanticContext?.claims && semanticContext.claims.length > 0
      ? semanticContext.claims.map((c: any) => `${c.subject} ${c.predicate} ${c.object}`).join('; ')
      : `Candidate statement: "${latestInput}"`;
    const suppClaimsText = ((state as any).claims || []).filter((c: any) => c.evidenceStatus === 'SUPPORTED').map((c: any) => `${c.subject} ${c.predicate} ${c.object}`).join('; ') || 'None verified yet.';
    const contraClaimsText = (contradictions || state.contradictions || []).join('; ') || 'None detected.';
    const unknownClaimsText = 'Any tech stack not explicitly in Document or Candidate claims is UNKNOWN.';

    // Contradictions
    const contradictionsText = (contradictions || state.contradictions || []).length > 0
      ? (contradictions || state.contradictions || []).map(c => `  - ${c}`).join('\n')
      : 'None detected.';

    // Build the full prompt
    const prompt = BASE_AGENT_PROMPT
      .replace('{personaName}', this.persona.name)
      .replace('{personaRole}', this.persona.role)
      .replace('{objectives}', objectivesText)
      .replace('{concerns}', concernsText || 'No concerns defined yet.')
      .replace('{otherAgentObservations}', otherObservationsText)
      .replace('{documentClaims}', docClaimsText)
      .replace('{candidateClaims}', candClaimsText)
      .replace('{supportedClaims}', suppClaimsText)
      .replace('{contradictedClaims}', contraClaimsText)
      .replace('{unknownClaims}', unknownClaimsText)
      .replace('{topicContext}', topicContextText)
      .replace('{conversationHistory}', historyText || 'No history yet.')
      .replace('{latestStatement}', `"${latestInput}"`)
      .replace('{semanticContext}', semanticText + ragText)
      .replace('{contradictions}', contradictionsText);

    // Call LLM
    const result = await ModelRouter.runTask('agent_reasoning', {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      responseFormat: 'json',
      jsonSchema: {
        type: 'OBJECT',
        properties: {
          observation: { type: 'STRING' },
          concernId: { type: 'STRING' },
          concernStatus: { type: 'STRING', enum: ['UNRESOLVED', 'PARTIALLY_SATISFIED', 'SATISFIED', 'CONTRADICTED', 'DEFERRED', 'ABANDONED'] },
          satisfactionScore: { type: 'NUMBER' },
          satisfactionReason: { type: 'STRING' },
          evidenceFound: { type: 'ARRAY', items: { type: 'STRING' } },
          missingEvidence: { type: 'ARRAY', items: { type: 'STRING' } },
          topic: { type: 'STRING' },
          importance: { type: 'NUMBER' },
          urgency: { type: 'NUMBER' },
          recommendedAction: { type: 'STRING', enum: ['ASK_FOLLOWUP', 'ASK_NEW', 'CHALLENGE', 'CLARIFY', 'REACT', 'ACKNOWLEDGE', 'AGREE', 'DISAGREE', 'PUSH_BACK', 'CONCEDE', 'TRANSITION', 'CONCLUDE', 'DEFER', 'ABANDON', 'WAIT'] },
          content: { type: 'STRING' },
          questionReason: { type: 'STRING' },
          sourceClaims: { type: 'ARRAY', items: { type: 'STRING' } },
          priority: { type: 'NUMBER' },
          confidence: { type: 'NUMBER' },
          evidenceStatus: { type: 'STRING', enum: ['SUPPORTED', 'CONTRADICTED', 'UNKNOWN', 'INFERRED', 'NOT_AFFECTED'] },
          evidenceCitation: { type: 'STRING' },
          semanticIntent: { type: 'STRING' },
          relatedEntities: { type: 'ARRAY', items: { type: 'STRING' } },
          hypotheses: { type: 'ARRAY', items: { type: 'STRING' } },
          observations: { type: 'ARRAY', items: { type: 'STRING' } },
          currentFocus: { type: 'STRING' }
        },
        required: ['observation', 'recommendedAction', 'content']
      }
    });

    const parsed = this.parseJsonFromResponse(result.text);

    // SAFEGUARD: If LLM returned WAIT but agent has content AND unresolved concerns → promote to ASK_FOLLOWUP
    // This prevents agents from silently failing to speak even when they have something to say.
    const hasUnresolvedConcerns = sortedConcerns.some(c => c.status !== 'SATISFIED' && c.status !== 'ABANDONED');
    const hasContent = (parsed.content || '').trim().length > 10;
    if ((parsed.recommendedAction === 'WAIT' || !parsed.recommendedAction) && hasContent && hasUnresolvedConcerns) {
      console.warn(`[BaseAgent][${this.persona.name}] Overriding WAIT to ASK_FOLLOWUP — agent had ${sortedConcerns.filter(c=>c.status!=='SATISFIED').length} unresolved concerns and generated content.`);
      parsed.recommendedAction = 'ASK_FOLLOWUP';
    }

    // Map Phase 5D recommendedAction to AgentProposal action directly
    const actionMap: Record<string, string> = {
      'ASK_FOLLOWUP': 'FOLLOW_UP',
      'ASK_NEW': 'ASK',
      'CHALLENGE': 'CHALLENGE',
      'CLARIFY': 'CLARIFY',
      'REACT': 'ACKNOWLEDGE',
      'ACKNOWLEDGE': 'ACKNOWLEDGE',
      'AGREE': 'AGREE',
      'DISAGREE': 'DISAGREE',
      'PUSH_BACK': 'PUSH_BACK',
      'CONCEDE': 'CONCEDE',
      'TRANSITION': 'TRANSITION',
      'CONCLUDE': 'CONCLUDE',
      'DEFER': 'WAIT',
      'ABANDON': 'WAIT',
      'WAIT': 'WAIT'
    };
    const finalAction = actionMap[parsed.recommendedAction] || parsed.recommendedAction || 'WAIT';

    // Update concern status based on evaluation
    const updatedConcerns = activeConcerns.map(c => {
      if (c.concernId === parsed.concernId) {
        const newEvidenceSet = new Set([...c.observedEvidence, ...(parsed.evidenceFound || [])]);
        return {
          ...c,
          observedEvidence: Array.from(newEvidenceSet),
          missingEvidence: parsed.missingEvidence?.length > 0 ? parsed.missingEvidence : c.missingEvidence,
          satisfactionScore: parsed.satisfactionScore ?? c.satisfactionScore,
          satisfactionReason: parsed.satisfactionReason || c.satisfactionReason,
          status: (parsed.concernStatus || c.status) as any,
          topic: parsed.topic || (c as any).topic || 'general',
          lastDiscussedTurn: turnId,
          followUpCount: ((c as any).followUpCount || 0) + 1,
          priority: parsed.recommendedAction === 'ABANDON' || parsed.recommendedAction === 'DEFER'
            ? Math.max(0, c.priority - 0.3)
            : c.priority
        };
      }
      return c;
    });

    const proposal: Omit<AgentProposal, 'id'> = {
      sessionId,
      personaId: this.persona.id,
      turnId,
      action: finalAction as any,
      content: parsed.content || '',
      priority: Number(parsed.priority || 0.6),
      confidence: Number(parsed.confidence || 0.7),
      reason: parsed.satisfactionReason || parsed.questionReason || 'No reasoning provided.',
      status: 'pending',
      evidenceStatus: (parsed.evidenceStatus || 'UNKNOWN') as any,
      evidenceCitation: parsed.evidenceCitation || '',
      questionId: null,
      concernId: parsed.concernId || null,
      canonicalConcernId: parsed.concernId || null,
      canonicalConcern: parsed.concernId || null,
      topic: parsed.topic || (parsed.concernId ? parsed.concernId.split('_')[0] : 'general'),
      importance: parsed.importance || 0.7,
      urgency: parsed.urgency || 0.6,
      semanticIntent: parsed.semanticIntent || '',
      relatedEntities: parsed.relatedEntities || [],
      relatedClaims: [],
      recommendedAction: parsed.recommendedAction,
      questionReason: parsed.questionReason || '',
      satisfactionReason: parsed.satisfactionReason || '',
      missingEvidence: parsed.missingEvidence || [],
      sourceClaims: parsed.sourceClaims || [],
    } as any;

    const updatedState: AgentPrivateState = {
      ...state,
      concerns: updatedConcerns,
      hypotheses: parsed.hypotheses || state.hypotheses || [],
      observationsList: [
        ...(state.observationsList || []).slice(-4), // Keep last 4 observations
        ...(parsed.observations || [])
      ],
      contradictions: parsed.contradictions || state.contradictions || [],
      currentFocus: parsed.currentFocus || parsed.concernId || state.currentFocus || null,
      confidence: parsed.confidence !== undefined ? Number(parsed.confidence) : (state.confidence || 1.0),
      lastAction: parsed.recommendedAction || 'WAIT',
      unresolvedConcerns: updatedConcerns
        .filter(c => c.status !== 'SATISFIED' && c.status !== 'ABANDONED')
        .map(c => c.concernId),
      resolvedConcerns: updatedConcerns
        .filter(c => c.status === 'SATISFIED')
        .map(c => c.concernId),
    };

    return { proposal, updatedState };
  }

  /**
   * Infers required evidence items from an intent keyword
   * when no explicit evidence array is stored in DB.
   */
  private inferRequiredEvidence(intent: string): string[] {
    const i = (intent || '').toLowerCase();
    if (i.includes('scalab') || i.includes('load') || i.includes('100k')) {
      return ['load testing methodology', 'concurrency levels tested', 'p95 latency', 'error rate', 'bottlenecks identified'];
    }
    if (i.includes('database') || i.includes('db') || i.includes('mysql')) {
      return ['database selection rationale', 'architectural fit', 'transaction guarantees', 'performance validation'];
    }
    if (i.includes('cost') || i.includes('infrastructure') || i.includes('hosting')) {
      return ['monthly hosting cost', 'database cost', 'traffic assumptions', 'cost per active user'];
    }
    if (i.includes('business') || i.includes('revenue') || i.includes('market')) {
      return ['revenue model', 'market size', 'customer validation', 'unit economics'];
    }
    if (i.includes('conflict') || i.includes('leadership') || i.includes('team')) {
      return ['conflict description', 'stakeholders involved', 'actions taken', 'outcome', 'lesson learned'];
    }
    return ['verification evidence', 'specific examples', 'measurable outcomes'];
  }

  private parseJsonFromResponse(text: string): any {
    try {
      let cleaned = text.trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(cleaned);
    } catch (error) {
      console.warn('Failed to parse agent JSON proposal. Returning fallback.', text);
      return {
        recommendedAction: 'WAIT',
        content: '',
        priority: 0.1,
        confidence: 0.5,
        satisfactionReason: 'Failed to parse JSON: ' + error,
        concernStatus: 'UNRESOLVED',
        evidenceStatus: 'UNKNOWN',
        evidenceCitation: '',
      };
    }
  }
}
