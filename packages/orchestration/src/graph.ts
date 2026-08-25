import { 
  SessionRepository, 
  ConversationRepository, 
  PersonaRepository,
  LatentQuestionRepository,
  ScenarioRepository,
  ClaimRepository,
  ConflictRepository
} from '@reflection-ai/database';
import { 
  ConversationTurn, 
  AgentProposal, 
  Decision, 
  SimulationEvent,
  AgentPrivateState,
  SemanticContext,
  LatentQuestion,
  Claim,
  Conflict
} from '@reflection-ai/shared';
import { ConsistencyEngine } from '@reflection-ai/intelligence';
import { BaseAgent } from '@reflection-ai/agents';
import { ModelRouter, RESPONSE_GENERATION_PROMPT } from '@reflection-ai/ai';
import { decisionEngine } from './decision-engine.js';
import { SemanticEngine, LatentQuestionGenerator, QuestionSatisfactionEngine, getCanonicalQuestionId } from '@reflection-ai/intelligence';
import { ProposalValidator } from './proposal-validator.js';
import { RetrievalService } from '@reflection-ai/rag';

export interface GraphOutput {
  decision: Decision;
  proposals: AgentProposal[];
  textResponse: string;
  selectedPersonaId: number | null;
  aiTurnId?: number;
}

export class SimulationGraph {
  /**
   * Triggers a full turn cycle. 
   * @param sessionId Session identifier
   * @param userInput New user text transcript
   * @param onEvent Callback to push server events back to the websocket client
   */
  public async processUserTurn(
    sessionId: number,
    userInput: string,
    onEvent: (event: SimulationEvent) => void
  ): Promise<GraphOutput> {
    // 1. Fetch Session state
    const session = await SessionRepository.getById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const currentTurnNumber = session.currentTurn + 1;
    await SessionRepository.updateTurn(sessionId, currentTurnNumber);

    // Emit event: USER_SPEECH_FINAL
    const turnIdString = `turn_${currentTurnNumber}`;
    onEvent(this.createEvent(sessionId, 'USER_SPEECH_FINAL', 'user', { text: userInput }, turnIdString));

    // Save User turn in MySQL database
    const userTurn = await ConversationRepository.addTurn(
      sessionId,
      'user',
      null,
      userInput,
      currentTurnNumber
    );

    // Fetch conversation history
    const history = await ConversationRepository.getTurns(sessionId);

    // 2. Fetch session personas (HR, CTO, etc.)
    const sessionPersonas = await SessionRepository.getPersonasForSession(sessionId);
    if (sessionPersonas.length === 0) {
      throw new Error(`No active personas selected for session ${sessionId}`);
    }

    // Ensure latent questions are generated for this session
    await this.ensureLatentQuestions(sessionId, sessionPersonas, session.scenarioId, onEvent);

    // Run Semantic Engine
    onEvent(this.createEvent(sessionId, 'SEMANTIC_ANALYSIS_STARTED', 'system', { message: 'Extracting semantic metadata...' }, turnIdString));
    const compactHistory = history
      .slice(-6)
      .map(t => `${t.speakerType === 'user' ? 'Candidate' : `Agent (${t.personaId})`}: ${t.text}`)
      .join('\n');
    const semanticContext = await SemanticEngine.analyzeTurn(userInput, compactHistory);
    onEvent(this.createEvent(sessionId, 'SEMANTIC_ANALYSIS_COMPLETED', 'system', semanticContext, turnIdString));

    // Save extracted user claims to database
    const savedUserClaims: Claim[] = [];
    if (semanticContext && Array.isArray(semanticContext.claims)) {
      for (const c of semanticContext.claims) {
        try {
          const saved = await ClaimRepository.addClaim({
            sessionId,
            turnId: userTurn.id,
            subject: c.subject,
            predicate: c.predicate,
            object: c.object,
            confidence: c.confidence,
            sourceType: 'USER_SPEECH',
            sourceId: String(userTurn.id),
            evidenceStatus: 'SUPPORTED'
          });
          savedUserClaims.push(saved);
        } catch (dbErr) {
          console.error('Failed to save extracted user claim to DB:', dbErr);
        }
      }
    }

    // Run Satisfaction & Global Observation Engine on active concerns
    const latentQuestions = await LatentQuestionRepository.getQuestionsForSession(sessionId);

    for (const sp of sessionPersonas) {
      const pid = sp.personaId;
      const state = sp.privateStateJson;
      const agentQuestions = latentQuestions.filter(q => q.personaId === pid);

      // Make sure concerns list is initialized
      const activeConcerns = state.concerns && state.concerns.length > 0
        ? state.concerns
        : agentQuestions.map(q => {
            const meta = q.metadataJson || {};
            const required = meta.requiredEvidence || (
              q.intent.toLowerCase().includes('scale')
                ? ["load testing methodology", "workload model", "concurrency levels", "latency metrics", "error rate", "bottlenecks"]
                : q.intent.toLowerCase().includes('db')
                ? ["database selection", "architectural fit", "transaction guarantees", "performance validation"]
                : ["general context", "verification evidence"]
            );
            return {
              concernId: q.questionId || `c_${q.id}`,
              objective: q.question,
              requiredEvidence: required,
              observedEvidence: meta.observedEvidence || [],
              missingEvidence: meta.missingEvidence || required,
              status: q.status as any,
              satisfactionScore: q.satisfactionScore || 0,
              satisfactionReason: meta.satisfactionReason || '',
              priority: q.priority || 0.8
            };
          });

      // Update unresolved concerns
      for (const concern of activeConcerns) {
        if (concern.status === 'SATISFIED' || concern.status === 'ABANDONED') {
          continue;
        }

        const dbQ = agentQuestions.find(q => (q.questionId === concern.concernId || `c_${q.id}` === concern.concernId));

        // Fast check: Only evaluate if there's semantic overlap in entities or intent
        const hasEntityOverlap = dbQ && dbQ.entitiesJson && Array.isArray(dbQ.entitiesJson) && dbQ.entitiesJson.length > 0
          ? dbQ.entitiesJson.some((eq: string) => 
              semanticContext.entities.some(se => se.value.toLowerCase().includes(eq.toLowerCase()) || eq.toLowerCase().includes(se.value.toLowerCase()))
            )
          : true;

        const hasIntentOverlap = dbQ && dbQ.intent && semanticContext.intent.type !== 'unknown'
          ? dbQ.intent.toLowerCase() === semanticContext.intent.type.toLowerCase()
          : true;

        if (!hasEntityOverlap && !hasIntentOverlap) {
          continue;
        }

        const evalResult = await QuestionSatisfactionEngine.evaluateConcern(
          concern,
          userInput,
          semanticContext,
          compactHistory
        );

        // Merge observed evidence
        const newEvidenceSet = new Set([...concern.observedEvidence, ...evalResult.evidence]);
        concern.observedEvidence = Array.from(newEvidenceSet);
        concern.missingEvidence = evalResult.missingEvidence;
        concern.satisfactionScore = evalResult.score;
        concern.status = evalResult.status as any;
        concern.satisfactionReason = evalResult.reason;

        // Update database LatentQuestion record
        if (dbQ) {
          dbQ.status = evalResult.status as any;
          dbQ.satisfactionScore = evalResult.score;
          
          await LatentQuestionRepository.updateQuestion(dbQ.id, {
            status: evalResult.status as any,
            satisfactionScore: evalResult.score,
            metadataJson: {
              requiredEvidence: concern.requiredEvidence,
              observedEvidence: concern.observedEvidence,
              missingEvidence: concern.missingEvidence,
              satisfactionReason: concern.satisfactionReason
            }
          });

          onEvent(this.createEvent(sessionId, 'QUESTION_UPDATED', 'system', {
            questionId: dbQ.id,
            canonicalQuestionId: dbQ.canonicalQuestionId,
            personaId: dbQ.personaId,
            status: dbQ.status,
            score: dbQ.satisfactionScore,
            reason: evalResult.reason
          }, turnIdString));

          if (dbQ.status === 'SATISFIED') {
            onEvent(this.createEvent(sessionId, 'QUESTION_SATISFIED', 'system', {
              questionId: dbQ.id,
              canonicalQuestionId: dbQ.canonicalQuestionId,
              personaId: dbQ.personaId
            }, turnIdString));
          }
        }
      }

      state.concerns = activeConcerns;
      state.unresolvedConcerns = activeConcerns.filter(c => c.status !== 'SATISFIED').map(c => c.concernId);
      state.resolvedConcerns = activeConcerns.filter(c => c.status === 'SATISFIED').map(c => c.concernId);

      // IMPORTANT: must happen AFTER state.concerns is set so the count is correct
      onEvent(this.createEvent(sessionId, 'AGENT_OBSERVATION', 'system', { 
        personaId: pid, 
        message: `Agent ${sp.personaDetails.name} is observing candidate turn. Unresolved concerns: ${state.unresolvedConcerns.length}`
      }, turnIdString));
    }

    // Phase 5: Build cross-agent observation map AFTER the satisfaction loop
    // so each agent sees up-to-date concern counts from other agents
    const agentObservationMap: Record<number, {
      personaId: number;
      personaName: string;
      unresolvedConcerns: string[];
      lastObservation: string;
      lastAction: string;
    }[]> = {};

    for (const sp of sessionPersonas) {
      const otherAgentsObservations = sessionPersonas
        .filter(other => other.personaId !== sp.personaId)
        .map(other => {
          const otherState = other.privateStateJson;
          const unresolvedDescriptions = (otherState.concerns || [])
            .filter((c: any) => c.status !== 'SATISFIED' && c.status !== 'ABANDONED')
            .slice(0, 3)
            .map((c: any) => c.objective || c.concernId);
          const lastObs = (otherState.observationsList || []).slice(-1)[0] || '';
          return {
            personaId: other.personaId,
            personaName: other.personaDetails.name,
            unresolvedConcerns: unresolvedDescriptions,
            lastObservation: lastObs,
            lastAction: otherState.lastAction || 'WAIT',
          };
        });
      agentObservationMap[sp.personaId] = otherAgentsObservations;
    }

    // Phase 5: Track current topic from semantic context
    const currentTopic = semanticContext?.topics?.[0]
      ? (typeof semanticContext.topics[0] === 'string' ? semanticContext.topics[0] : (semanticContext.topics[0] as any)?.name || null)
      : null;
    const topicMomentum = currentTopic ? 0.7 : 0.5;

    // Phase 5: Build contradiction list from semantic + history
    const activeContradictionList: string[] = [];
    if (semanticContext?.claims) {
      for (const claim of semanticContext.claims) {
        if (claim.confidence < 0.4) {
          activeContradictionList.push(`Questionable claim: ${claim.subject} ${claim.predicate} ${claim.object}`);
        }
      }
    }

    onEvent(this.createEvent(sessionId, 'BOARDROOM_OBSERVATION' as any, 'system', {
      message: `Global observation broadcast: ${sessionPersonas.length} agents receiving candidate statement`,
      currentTopic,
      claims: semanticContext?.claims?.length || 0,
      contradictions: activeContradictionList.length
    }, turnIdString));

    // 3. Parallel Agent Node Evaluations
    const proposals: AgentProposal[] = [];
    const updatedPrivateStates: Record<number, AgentPrivateState> = {};

    const evaluationPromises = sessionPersonas.map(async (sp, index) => {
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, index * 4000));
      }
      const agent = new BaseAgent(sp.personaDetails);
      try {
        const agentQuestions = latentQuestions.filter(q => q.personaId === sp.personaId);
        const privateState = {
          ...sp.privateStateJson,
          latentQuestions: agentQuestions,
        };

        // Contextual Agent Retrieval
        onEvent(this.createEvent(sessionId, 'RETRIEVAL_STARTED', 'system', {
          personaId: sp.personaId,
          message: 'Retrieving context from Qdrant...'
        }, turnIdString));

        let retrievedChunks: any[] = [];
        try {
          retrievedChunks = await RetrievalService.retrieveContext(
            sessionId,
            userInput,
            privateState,
            semanticContext
          );

          onEvent(this.createEvent(sessionId, 'RETRIEVAL_COMPLETED', 'system', {
            personaId: sp.personaId,
            chunksCount: retrievedChunks.length,
            chunks: retrievedChunks
          }, turnIdString));
        } catch (err) {
          onEvent(this.createEvent(sessionId, 'RAG_ERROR', 'system', {
            personaId: sp.personaId,
            message: 'RAG context retrieval failed. Continuing in fallback mode.',
            error: String(err)
          }, turnIdString));
          retrievedChunks = [];
        }

        // Claim Contradiction Check
        let contradiction: any = { isContradiction: false, reason: undefined, conflictingClaims: undefined };
        try {
          if (retrievedChunks.length > 0) {
            contradiction = await RetrievalService.checkContradictions(
              userInput,
              semanticContext,
              retrievedChunks
            );
          }
        } catch (err) {
          console.warn('Contradiction check failed, default to no contradiction', err);
        }

        if (contradiction.isContradiction) {
          try {
            // Find or insert the user claim representing this statement
            const matchedUserClaim = savedUserClaims.find(c => {
              const objLower = c.object.toLowerCase();
              return userInput.toLowerCase().includes(objLower) || objLower.includes(userInput.toLowerCase());
            }) || savedUserClaims[0];
            
            // Create a document claim
            const docClaim = await ClaimRepository.addClaim({
              sessionId,
              turnId: null,
              subject: 'system',
              predicate: 'specification',
              object: contradiction.conflictingClaims?.[0]?.split('vs')?.[1]?.trim() || 'MySQL',
              confidence: 1.0,
              sourceType: 'PDF',
              sourceId: retrievedChunks[0]?.metadata?.sourceName || 'document_context',
              evidenceStatus: 'SUPPORTED',
              citation: retrievedChunks[0]?.text || 'Document source context'
            });

            const targetUserClaim = matchedUserClaim || await ClaimRepository.addClaim({
              sessionId,
              turnId: userTurn.id,
              subject: 'candidate',
              predicate: 'statement',
              object: userInput,
              confidence: 0.9,
              sourceType: 'USER_SPEECH',
              sourceId: String(userTurn.id),
              evidenceStatus: 'CONTRADICTED'
            });

            // Update user claim status in database to CONTRADICTED
            await ClaimRepository.updateClaimStatus(targetUserClaim.id!, 'CONTRADICTED', contradiction.reason);

            // Register contradiction/conflict
            const conflict = await ConflictRepository.addConflict({
              sessionId,
              claimAId: docClaim.id!,
              claimBId: targetUserClaim.id!,
              contradictionType: 'value_mismatch',
              severity: 'HIGH',
              confidence: 0.95,
              status: 'active',
              resolution: contradiction.reason
            });

            onEvent(this.createEvent(sessionId, 'CONTRADICTION_DETECTED', 'system', {
              personaId: sp.personaId,
              reason: contradiction.reason,
              conflictingClaims: contradiction.conflictingClaims,
              conflictId: conflict.id
            }, turnIdString));
          } catch (dbErr) {
            console.error('Failed to log contradiction in claim graph:', dbErr);
          }
        }

        // Phase 5: Pass cross-agent observations, topic context, and contradictions
        const { proposal, updatedState } = await agent.evaluateTurn(
          sessionId,
          userTurn.id,
          privateState,
          history,
          userInput,
          semanticContext,
          retrievedChunks,
          agentObservationMap[sp.personaId] || [],
          currentTopic || undefined,
          topicMomentum,
          activeContradictionList
        );

        // Load all conflicts and claims to evaluate scoped status
        const activeConflicts = await ConflictRepository.getConflictsForSession(sessionId);
        const sessionClaims = await ClaimRepository.getClaimsForSession(sessionId);

        const [scopedProposal] = ConsistencyEngine.evaluateProposals(
          [proposal as any],
          activeConflicts,
          sessionClaims
        );

        // Store the proposal in MySQL
        const savedProp = await ConversationRepository.addProposal({
          ...scopedProposal,
          status: 'pending',
        });

        proposals.push(savedProp);
        updatedPrivateStates[sp.personaId] = {
          ...updatedState,
          latentQuestions: agentQuestions,
        };

        // Emit Phase 5 enriched proposal event
        onEvent(this.createEvent(sessionId, 'AGENT_PROPOSAL', 'agent', {
          personaId: sp.personaId,
          action: savedProp.action,
          recommendedAction: (proposal as any).recommendedAction || savedProp.action,
          priority: savedProp.priority,
          reason: savedProp.reason,
          content: savedProp.content,
          evidenceStatus: savedProp.evidenceStatus,
          evidenceCitation: savedProp.evidenceCitation,
          satisfactionReason: (proposal as any).satisfactionReason || '',
          missingEvidence: (proposal as any).missingEvidence || [],
          questionReason: (proposal as any).questionReason || '',
          concernId: (proposal as any).concernId || null,
        }, turnIdString));

        // Phase 5: Emit AGENT_CONCERN_UPDATED if concern status changed & sync cross-persona
        if ((proposal as any).concernId) {
          const concernStatus = (proposal as any).concernStatus || 'UNRESOLVED';
          onEvent(this.createEvent(sessionId, 'AGENT_CONCERN_UPDATED' as any, 'system', {
            personaId: sp.personaId,
            concernId: (proposal as any).concernId,
            concernStatus: concernStatus,
            satisfactionScore: (proposal as any).satisfactionScore || 0,
            satisfactionReason: (proposal as any).satisfactionReason || '',
            missingEvidence: (proposal as any).missingEvidence || [],
          }, turnIdString));

          if (concernStatus === 'SATISFIED') {
            const currentConcern = updatedState.concerns?.find(c => c.concernId === (proposal as any).concernId);
            if (currentConcern) {
              for (const otherSp of sessionPersonas) {
                if (otherSp.personaId !== sp.personaId) {
                  const otherState = updatedPrivateStates[otherSp.personaId] || otherSp.privateStateJson;
                  if (otherState?.concerns) {
                    otherState.concerns = otherState.concerns.map((c: any) => {
                      if (c.concernId === currentConcern.concernId || c.objective.toLowerCase().trim() === currentConcern.objective.toLowerCase().trim()) {
                        return { ...c, status: 'SATISFIED', satisfactionScore: 0.95 };
                      }
                      return c;
                    });
                    updatedPrivateStates[otherSp.personaId] = otherState;
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`Agent ${sp.personaDetails.name} evaluation node failed:`, err);
        // Fallback: Agent proposes to wait
        const fallbackProp = await ConversationRepository.addProposal({
          sessionId,
          personaId: sp.personaId,
          turnId: userTurn.id,
          action: 'WAIT',
          content: '',
          priority: 0.0,
          confidence: 1.0,
          reason: 'Node execution failure: ' + err.message,
          status: 'rejected',
        });
        proposals.push(fallbackProp);
      }
    });

    await Promise.all(evaluationPromises);

    // -- Phase 4N/4O/4P: Internal Agent Deliberation Bus & Cross-Talk Loop --
    const maxMessages = parseInt(process.env.MAX_INTERNAL_MESSAGES_PER_TURN || '2', 10);
    const maxRounds = parseInt(process.env.MAX_INTERNAL_ROUNDS || '1', 10);
    let totalMessages = 0;

    for (let round = 1; round <= maxRounds; round++) {
      if (totalMessages >= maxMessages) break;
      let roundActivity = false;

      for (let i = 0; i < sessionPersonas.length; i++) {
        if (totalMessages >= maxMessages) break;

        const currentSp = sessionPersonas[i];
        const nextSp = sessionPersonas[(i + 1) % sessionPersonas.length];

        if (currentSp.personaId !== nextSp.personaId) {
          const currentProp = proposals.find(p => p.personaId === currentSp.personaId);
          const nextProp = proposals.find(p => p.personaId === nextSp.personaId);

          const deliberationPrompt = `
You are "${currentSp.personaDetails.name}" (Role: ${currentSp.personaDetails.role}) in a boardroom deliberation.
You are evaluating the proposed action of "${nextSp.personaDetails.name}" (Role: ${nextSp.personaDetails.role}).

Their Proposed Action: ${nextProp?.action || 'WAIT'}
What they proposed to say/ask: "${nextProp?.content || ''}"
Reason: "${nextProp?.reason || ''}"

Your Proposed Action: ${currentProp?.action || 'WAIT'}
What you proposed to say/ask: "${currentProp?.content || ''}"

Recent History:
${compactHistory}

Your Objectives:
${(currentSp.privateStateJson.objectives || []).map((o: any) => `- ${o.description}`).join('\n')}

Your Unresolved Concerns:
${(currentSp.privateStateJson.concerns || []).filter((c: any) => c.status !== 'SATISFIED').map((c: any) => `- ${c.objective} (Missing: ${c.missingEvidence.join(', ')})`).join('\n')}

Your task is to generate a short deliberation message directed to "${nextSp.personaDetails.name}".
Decide your message type:
- "AGREEMENT": You support their line of questioning or response.
- "DISAGREEMENT" or "CHALLENGE": You disagree with their focus or want to propose a counterpoint.
- "OBSERVATION": You want to share a key observation about the candidate's statement.

Keep the deliberation comment under 2 sentences. Be direct, professional, and boardroom-like.

Output ONLY raw JSON matching this schema:
{
  "type": "AGREEMENT" | "DISAGREEMENT" | "CHALLENGE" | "OBSERVATION",
  "content": "Deliberation text...",
  "confidence": 0.85
}
`;

          try {
            const deliberationResult = await ModelRouter.runTask('critic', {
              messages: [{ role: 'user', content: deliberationPrompt }],
              temperature: 0.5,
              responseFormat: 'json',
              jsonSchema: {
                type: 'OBJECT',
                properties: {
                  type: { type: 'STRING', enum: ['AGREEMENT', 'DISAGREEMENT', 'CHALLENGE', 'OBSERVATION'] },
                  content: { type: 'STRING' },
                  confidence: { type: 'NUMBER' }
                },
                required: ['type', 'content', 'confidence']
              }
            });

            const parsedDelib = JSON.parse(deliberationResult.text.trim());
            if (parsedDelib.content) {
              totalMessages++;
              roundActivity = true;

              onEvent(this.createEvent(sessionId, 'AGENT_INTERNAL_MESSAGE' as any, 'agent', {
                sessionId: String(sessionId),
                turnId: turnIdString,
                fromPersonaId: String(currentSp.personaId),
                toPersonaId: String(nextSp.personaId),
                messageType: parsedDelib.type || 'OBSERVATION',
                content: parsedDelib.content,
                timestamp: Date.now()
              }, turnIdString));
            }
          } catch (delibErr) {
            console.error(`Deliberation round failed for ${currentSp.personaDetails.name}:`, delibErr);
          }
        }
      }

      if (!roundActivity) break;
    }

    // -- Proposal Validation Gate --
    const eligibleProposals: AgentProposal[] = [];
    for (const prop of proposals) {
      if (prop.action === 'WAIT') {
        eligibleProposals.push(prop);
        continue;
      }

      const val = await ProposalValidator.validateProposal(
        prop,
        currentTurnNumber,
        latentQuestions
      );

      prop.validation = {
        eligible: val.eligible,
        duplicate: val.duplicate,
        alreadySatisfied: val.alreadySatisfied,
        recentlyAsked: val.recentlyAsked,
      };

      if (!val.eligible) {
        prop.status = 'rejected';
        await ConversationRepository.updateProposalStatus(prop.id!, 'rejected', val.rejectionReason);

        if (val.duplicate && val.matchedQuestion) {
          await LatentQuestionRepository.updateQuestion(val.matchedQuestion.id, {
            status: 'REJECTED_DUPLICATE',
            rejectionReason: val.rejectionReason || 'Duplicate question proposal',
          });
          onEvent(this.createEvent(sessionId, 'QUESTION_DUPLICATE', 'system', {
            questionId: val.matchedQuestion.id,
            personaId: prop.personaId,
            reason: val.rejectionReason,
          }, turnIdString));
        }

        const satisfiedCanonicalQ = val.matchedQuestion?.canonicalQuestionId
          ? latentQuestions.find(q => q.canonicalQuestionId === val.matchedQuestion?.canonicalQuestionId && q.status === 'SATISFIED')
          : undefined;

        const originalPersonaDetail = satisfiedCanonicalQ
          ? sessionPersonas.find(sp => sp.personaId === satisfiedCanonicalQ.personaId)?.personaDetails
          : undefined;

        const attemptingPersonaDetail = sessionPersonas.find(sp => sp.personaId === prop.personaId)?.personaDetails;

        onEvent(this.createEvent(sessionId, 'QUESTION_REJECTED', 'system', {
          reason: val.rejectionReason,
          questionId: val.matchedQuestion?.id || null,
          canonicalQuestionId: val.matchedQuestion?.canonicalQuestionId || null,
          originalPersona: originalPersonaDetail?.name || 'CFO',
          attemptingPersona: attemptingPersonaDetail?.name || 'CTO',
          validation: prop.validation,
        }, turnIdString));
      } else {
        // Dynamic Question Registration
        if (prop.action === 'ASK' && !val.matchedQuestion) {
          const canonicalId = getCanonicalQuestionId(prop.content, prop.semanticIntent || 'dynamic_question', prop.relatedEntities || []);
          const newQ = await LatentQuestionRepository.addQuestion({
            sessionId,
            personaId: prop.personaId,
            question: prop.content,
            normalizedQuestion: prop.content.toLowerCase().trim().replace(/[?.!,]/g, ''),
            intent: prop.semanticIntent || 'dynamic_question',
            entitiesJson: prop.relatedEntities || [],
            priority: prop.priority,
            status: 'CREATED',
            satisfactionScore: 0.0,
            source: 'dynamic',
            questionId: `q_dyn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            canonicalIntent: prop.semanticIntent || 'dynamic_question',
            canonicalQuestionId: canonicalId,
          });
          latentQuestions.push(newQ);
          prop.questionId = newQ.id;

          onEvent(this.createEvent(sessionId, 'QUESTION_CREATED', 'system', {
            questionId: newQ.id,
            questionText: newQ.question,
            personaId: prop.personaId,
          }, turnIdString));
        }

        // If matched question was UNANSWERED or CREATED, update it to PROPOSED
        if (val.matchedQuestion && (val.matchedQuestion.status === 'UNANSWERED' || val.matchedQuestion.status === 'CREATED')) {
          await LatentQuestionRepository.updateQuestion(val.matchedQuestion.id, {
            status: 'PROPOSED',
            lastProposedAt: new Date(),
          });
          onEvent(this.createEvent(sessionId, 'QUESTION_PROPOSED', 'system', {
            questionId: val.matchedQuestion.id,
            personaId: prop.personaId,
          }, turnIdString));
        }

        eligibleProposals.push(prop);
      }
    }

    // -- Orchestrator Safety Guard / Immediate Defense --
    const safeEligibleProposals = eligibleProposals.filter(prop => {
      if (prop.action !== 'ASK') return true;

      const qId = prop.questionId;
      const matchedQ = qId
        ? latentQuestions.find(q => q.id === qId || String(q.id) === String(qId))
        : latentQuestions.find(q => q.question === prop.content);

      if (matchedQ) {
        const canonicalId = matchedQ.canonicalQuestionId;
        const isSatisfiedGlobally = matchedQ.status === 'SATISFIED' || matchedQ.satisfactionScore >= 0.85 ||
          (matchedQ.source !== 'dynamic' && matchedQ.status !== 'CREATED' && !!canonicalId && latentQuestions.some(sq => sq.id !== matchedQ.id && sq.canonicalQuestionId === canonicalId && sq.status === 'SATISFIED'));

        if (isSatisfiedGlobally) {
          console.warn(`[Orchestrator Safety] Rejecting proposal from persona ${prop.personaId} for satisfied canonical question: ${canonicalId}`);
          return false;
        }
      }
      return true;
    });

    // Extract recent topic history from history turns
    const topicHistory = history
      .map(h => h.metadataJson?.topic || h.metadataJson?.canonicalConcernId)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);

    // 4. Run Decision Engine / Orchestrator with safe eligible proposals & topic history
    const decision = await decisionEngine.selectSpeaker(
      sessionId,
      userTurn.id,
      safeEligibleProposals,
      sessionPersonas,
      history,
      latentQuestions,
      semanticContext,
      topicHistory
    );

    // Save decision in MySQL database
    const savedDecision = await ConversationRepository.addDecision(decision);

    // Emit event: ORCHESTRATOR_DECISION
    onEvent(this.createEvent(sessionId, 'ORCHESTRATOR_DECISION', 'orchestrator', {
      selectedPersonaId: savedDecision.selectedPersonaId,
      action: savedDecision.action,
      reason: savedDecision.reason,
      confidence: savedDecision.confidence,
    }, turnIdString));

    let textResponse = '';
    let aiTurnId: number | undefined;

    // 5. Generate Response for selected speaker
    if (savedDecision.action === 'SPEAK' || savedDecision.action === 'INTERRUPT') {
      const selectedId = savedDecision.selectedPersonaId;
      if (!selectedId) {
        throw new Error('Orchestrator selected SPEAK action but no persona ID was provided.');
      }

      const activeSpRecord = sessionPersonas.find(sp => sp.personaId === selectedId);
      if (!activeSpRecord) {
        throw new Error(`Selected persona ${selectedId} is not active in this session`);
      }

      const activePersona = activeSpRecord.personaDetails;

      // Update speaker state in MySQL
      await SessionRepository.updateActiveSpeaker(sessionId, selectedId);

      // Emit event: RESPONSE_GENERATION_STARTED
      onEvent(this.createEvent(sessionId, 'RESPONSE_GENERATION_STARTED', 'orchestrator', {
        personaId: selectedId,
      }, turnIdString));

      // Construct history trace
      const recentHistoryText = history
        .slice(-8)
        .map(t => {
          const sender = t.speakerType === 'user' ? 'Candidate' : `Agent (${t.personaId})`;
          return `${sender}: ${t.text}`;
        })
        .join('\n');

      const proposal = proposals.find(p => p.personaId === selectedId);
      const proposalContent = proposal ? proposal.content : '';
      const proposalEvidenceStatus = proposal ? (proposal.evidenceStatus || 'UNKNOWN') : 'UNKNOWN';
      const proposalEvidenceCitation = proposal ? (proposal.evidenceCitation || '') : '';

      // Phase 5: Extract enriched fields from proposal for natural response generation
      const propAny = proposal as any;
      const recommendedAction = propAny?.recommendedAction || (proposal?.action || 'WAIT');
      const concernObjective = (() => {
        if (propAny?.concernId) {
          const concernedSp = sessionPersonas.find(s => s.personaId === selectedId);
          const concern = (concernedSp?.privateStateJson?.concerns || []).find((c: any) => c.concernId === propAny.concernId);
          return concern?.objective || propAny.concernId;
        }
        return 'general evaluation';
      })();

      const prompt = RESPONSE_GENERATION_PROMPT
        .replace('{personaName}', activePersona.name)
        .replace('{personaRole}', activePersona.role)
        .replace('{personaDescription}', activePersona.description || '')
        .replace('{systemPrompt}', activePersona.systemPrompt || '')
        .replace('{conversationHistory}', recentHistoryText)
        .replace('{latestCandidateStatement}', userInput)
        .replace('{recommendedAction}', recommendedAction)
        .replace('{concernObjective}', concernObjective)
        .replace('{satisfactionReason}', propAny?.satisfactionReason || 'Not evaluated yet.')
        .replace('{missingEvidence}', (propAny?.missingEvidence || []).join(', ') || 'None identified.')
        .replace('{questionReason}', propAny?.questionReason || '')
        .replace('{proposalContent}', proposalContent)
        .replace('{proposalEvidenceStatus}', proposalEvidenceStatus)
        .replace('{proposalEvidenceCitation}', proposalEvidenceCitation);

      // Call ModelRouter
      const responseResult = await ModelRouter.runTask('response_generation', {
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      });

      textResponse = responseResult.text.trim();

      // Save AI Turn in MySQL database
      const aiTurn = await ConversationRepository.addTurn(
        sessionId,
        'agent',
        selectedId,
        textResponse,
        currentTurnNumber + 1
      );
      aiTurnId = aiTurn.id;

      // Update current turn to include the agent response
      await SessionRepository.updateTurn(sessionId, currentTurnNumber + 1);

      // Reset speaker status after output completed
      await SessionRepository.updateActiveSpeaker(sessionId, null);

      // If the selected proposal was a question/follow-up action and has a questionId or concernId, mark it as ASKED
      const isQuestionAction = ['ASK', 'FOLLOW_UP', 'CHALLENGE', 'CLARIFY', 'COUNTER', 'PUSH_BACK'].includes(proposal?.action || '');
      if (proposal && isQuestionAction && proposal.questionId) {
        const qId = typeof proposal.questionId === 'number' ? proposal.questionId : parseInt(String(proposal.questionId), 10);
        if (!isNaN(qId)) {
          const canonicalId = (proposal as any).canonicalConcernId || (proposal as any).concernId || null;
          await LatentQuestionRepository.updateQuestion(qId, {
            status: 'ASKED',
            askedAt: new Date(),
            lastAskedTurn: currentTurnNumber + 1,
            askedByPersonaId: selectedId,
            canonicalConcernId: canonicalId,
          });

          const inMemQ = latentQuestions.find(q => q.id === qId);
          if (inMemQ) {
            inMemQ.status = 'ASKED';
            inMemQ.askedAt = new Date();
            inMemQ.lastAskedTurn = currentTurnNumber + 1;
            inMemQ.askedByPersonaId = selectedId;
            if (canonicalId) inMemQ.canonicalConcernId = canonicalId;
          }

          // Also update all latentQuestions sharing the same canonical concern ID
          if (canonicalId) {
            for (const q of latentQuestions) {
              if (q.canonicalConcernId === canonicalId || q.canonicalQuestionId === canonicalId) {
                q.lastAskedTurn = currentTurnNumber + 1;
                q.askedByPersonaId = selectedId;
                if (q.status !== 'SATISFIED') {
                  q.status = 'ASKED';
                }
              }
            }
          }

          onEvent(this.createEvent(sessionId, 'QUESTION_ASKED', 'system', {
            questionId: qId,
            canonicalConcernId: canonicalId,
            personaId: selectedId,
          }, turnIdString));
        }
      }

      // Update private states for all agents before saving
      for (const sp of sessionPersonas) {
        const pid = sp.personaId;
        const state = updatedPrivateStates[pid] || {
          personaId: pid,
          objectives: sp.privateStateJson.objectives || [],
          latentQuestions: latentQuestions.filter(q => q.personaId === pid),
          concerns: sp.privateStateJson.concerns || [],
          speakingCooldown: sp.privateStateJson.speakingCooldown || 0,
        };

        const agentQuestions = latentQuestions.filter(q => q.personaId === pid);
        state.pendingQuestions = agentQuestions
          .filter(q => q.status === 'UNANSWERED' || q.status === 'CREATED' || q.status === 'PROPOSED')
          .map(q => q.questionId || String(q.id));
        state.satisfiedQuestions = agentQuestions
          .filter(q => q.status === 'SATISFIED')
          .map(q => q.questionId || String(q.id));
        state.recentQuestions = agentQuestions
          .filter(q => q.lastAskedTurn !== null && q.lastAskedTurn !== undefined && (currentTurnNumber + 1) - q.lastAskedTurn < 5)
          .map(q => q.questionId || String(q.id));
        
        if (pid === selectedId) {
          state.lastSpokenTurn = aiTurn.sequenceNumber;
        }

        await SessionRepository.updatePersonaPrivateState(sessionId, pid, state);
        onEvent(this.createEvent(sessionId, 'AGENT_MEMORY_UPDATED', 'system', {
          personaId: pid,
          memory: state
        }, turnIdString));
      }

      // Emit event: RESPONSE_GENERATION_COMPLETED
      onEvent(this.createEvent(sessionId, 'RESPONSE_GENERATION_COMPLETED', 'agent', {
        personaId: selectedId,
        text: textResponse,
      }, turnIdString));
    } else {
      // Orchestrator decided to WAIT
      textResponse = '';
      await SessionRepository.updateActiveSpeaker(sessionId, null);
    }

    return {
      decision: savedDecision,
      proposals,
      textResponse,
      selectedPersonaId: savedDecision.selectedPersonaId,
      aiTurnId,
    };
  }

  public async ensureLatentQuestions(
    sessionId: number,
    sessionPersonas: any[],
    scenarioId: number,
    onEvent?: (event: SimulationEvent) => void
  ): Promise<void> {
    const existing = await LatentQuestionRepository.getQuestionsForSession(sessionId);
    if (existing.length > 0) {
      return;
    }

    const scenario = await ScenarioRepository.getById(scenarioId);
    const scenarioName = scenario?.name || 'Interview';
    const scenarioDesc = scenario?.description || '';

    const listToSave: any[] = [];

    for (const sp of sessionPersonas) {
      const persona = sp.personaDetails;
      const objectives = persona.configurationJson.objectives || [];
      try {
        const generated = await LatentQuestionGenerator.generateQuestions(
          sessionId,
          persona.id,
          persona.name,
          persona.role,
          persona.description,
          objectives,
          scenarioName,
          scenarioDesc
        );
        listToSave.push(...generated);
      } catch (err) {
        console.error(`Failed to dynamically generate latent questions for ${persona.name}:`, err);
        // Fallback: seed some default questions if generation fails to avoid block
        const fallbackQuestions = (persona.configurationJson.latentQuestions || []).map((q: string) => {
          const canonicalId = getCanonicalQuestionId(q, 'explore_background', []);
          return {
            sessionId,
            personaId: persona.id,
            question: q,
            normalizedQuestion: q.toLowerCase().trim(),
            intent: 'explore_background',
            entitiesJson: [],
            priority: 0.8,
            status: 'UNANSWERED' as const,
            satisfactionScore: 0.0,
            source: 'fallback_seed',
            canonicalQuestionId: canonicalId
          };
        });
        listToSave.push(...fallbackQuestions);
      }
    }

    const savedList: LatentQuestion[] = [];
    for (const q of listToSave) {
      const saved = await LatentQuestionRepository.addQuestion(q);
      savedList.push(saved);
      if (onEvent) {
        onEvent(this.createEvent(sessionId, 'QUESTION_CANONICALIZED', 'system', {
          questionId: saved.id,
          canonicalQuestionId: saved.canonicalQuestionId,
          questionText: saved.question,
          personaId: saved.personaId
        }, 'setup'));
      }
    }

    // Emit QUESTION_MERGED
    if (onEvent) {
      const groups: Record<string, number[]> = {};
      for (const q of savedList) {
        if (q.canonicalQuestionId) {
          if (!groups[q.canonicalQuestionId]) {
            groups[q.canonicalQuestionId] = [];
          }
          groups[q.canonicalQuestionId].push(q.id);
        }
      }
      for (const [canonicalId, ids] of Object.entries(groups)) {
        if (ids.length > 1) {
          onEvent(this.createEvent(sessionId, 'QUESTION_MERGED', 'system', {
            canonicalQuestionId: canonicalId,
            questionIds: ids
          }, 'setup'));
        }
      }
    }
  }

  /**
   * Dynamically generates document-specific concerns when a PDF, PPTX, DOCX, or TXT file is uploaded to a session.
   */
  public async generateDocumentQuestions(
    sessionId: number,
    documentName: string,
    documentContent: string,
    onEvent?: (event: SimulationEvent) => void
  ): Promise<void> {
    const sessionPersonas = await SessionRepository.getPersonasForSession(sessionId);
    if (!sessionPersonas || sessionPersonas.length === 0) {
      console.warn(`No personas found for session ${sessionId} when generating document questions.`);
      return;
    }

    const listToSave: any[] = [];
    for (const sp of sessionPersonas) {
      const persona = sp.personaDetails;
      try {
        const docQuestions = await LatentQuestionGenerator.generateQuestionsFromDocument(
          sessionId,
          persona.id,
          persona.name,
          persona.role,
          persona.description,
          documentName,
          documentContent
        );
        listToSave.push(...docQuestions);
      } catch (err) {
        console.error(`Failed to generate document questions for persona ${persona.name}:`, err);
      }
    }

    // Clear pre-seeded generic questions so panel focuses 100% on analyzing the uploaded document
    try {
      await LatentQuestionRepository.clearQuestionsForSession(sessionId);
    } catch (clearErr) {
      console.warn(`Failed to clear pre-seeded questions for session ${sessionId}:`, clearErr);
    }

    const savedList: any[] = [];
    for (const q of listToSave) {
      const saved = await LatentQuestionRepository.addQuestion(q);
      savedList.push(saved);
      if (onEvent) {
        onEvent({
          eventId: Math.random().toString(36).substring(2, 15),
          sessionId: String(sessionId),
          turnId: 'document_ingest',
          timestamp: Date.now(),
          source: 'system',
          type: 'QUESTION_CANONICALIZED' as any,
          payload: {
            questionId: saved.id,
            canonicalQuestionId: saved.canonicalQuestionId,
            questionText: saved.question,
            personaId: saved.personaId,
            source: 'document'
          }
        });
      }
    }

    // Emit DOCUMENT_INGESTED event to notify frontend UI & panel
    if (onEvent) {
      onEvent({
        eventId: Math.random().toString(36).substring(2, 15),
        sessionId: String(sessionId),
        turnId: 'document_ingest',
        timestamp: Date.now(),
        source: 'system',
        type: 'DOCUMENT_INGESTED' as any,
        payload: {
          documentName,
          questionsCount: savedList.length,
          questions: savedList
        }
      });
    }
  }


  private createEvent(
    sessionId: number,
    type: any,
    source: any,
    payload: any,
    turnId: string
  ): SimulationEvent {
    return {
      eventId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      sessionId: String(sessionId),
      turnId,
      timestamp: Date.now(),
      source,
      type,
      payload,
    };
  }
}

export const simulationGraph = new SimulationGraph();
