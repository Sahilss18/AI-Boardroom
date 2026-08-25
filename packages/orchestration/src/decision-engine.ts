import { AgentProposal, Decision, SessionPersona, ConversationTurn, LatentQuestion } from '@reflection-ai/shared';
import { QuestionSimilarityEngine } from '@reflection-ai/intelligence';
import { ProposalValidator } from './proposal-validator.js';

export interface DecisionEngineConfig {
  consecutiveSpeakerPenalty: number;
  secondarySpeakerPenalty: number;
  randomFactor?: number;
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
  consecutiveSpeakerPenalty: 0.40,  // Phase 5: increased to prevent robotic repetition
  secondarySpeakerPenalty: 0.18,
  randomFactor: 0.03,
};

export class DecisionEngine {
  private config: DecisionEngineConfig;

  constructor(config = DEFAULT_CONFIG) {
    this.config = config;
  }

  /**
   * PHASE 5: Contextual speaker selection.
   * 
   * Scoring formula:
   *   base = proposal.priority
   *   + concernSeverityBonus      (agents with high-priority unresolved concerns speak first)
   *   + evidenceGapBonus          (larger missing evidence gap = more urgent)
   *   + contradictionBonus        (agent detected contradiction = priority boost)
   *   + followUpBonus             (agent that asked PARTIALLY_SATISFIED question gets follow-up priority)
   *   + topicMomentumBonus        (agent whose concern matches current topic)
   *   - consecutiveSpeakerPenalty (just spoke)
   *   - secondarySpeakerPenalty   (spoke 2 turns ago)
   *   - satisfiedPenalty          (agent's target concern is already satisfied)
   *   - duplicatePenalty          (semantically similar to recent question)
   *   + entropy                   (small random factor to break ties)
   */
  public async selectSpeaker(
    sessionId: number,
    turnId: number,
    proposals: AgentProposal[],
    sessionPersonas: (SessionPersona & { personaDetails: any })[],
    history: ConversationTurn[],
    latentQuestions: LatentQuestion[] = [],
    semanticContext?: any,
    topicHistory: string[] = []
  ): Promise<Decision> {
    if (proposals.length === 0) {
      return {
        sessionId,
        turnId,
        selectedPersonaId: null,
        action: 'WAIT',
        reason: 'No agent proposals were generated for this turn.',
        confidence: 1.0,
        metadataJson: { scores: {} },
      };
    }

    const agentTurns = history.filter(t => t.speakerType === 'agent');
    const recentSpeakers = agentTurns.map(t => t.personaId!).filter(Boolean);

    // Build personaRoleMap
    const personaRoleMap: Record<number, string> = {};
    for (const sp of sessionPersonas) {
      personaRoleMap[sp.personaId] = sp.personaDetails?.role || sp.personaDetails?.name || '';
    }

    const scores: Record<number, {
      rawPriority: number;
      penalty: number;
      bonus: number;
      finalScore: number;
      breakdown: any;
      reason: string;
    }> = {};

    let bestProposal: AgentProposal | null = null;
    let highestScore = -Infinity;

    for (const prop of proposals) {
      const personaId = prop.personaId;

      // Compute deterministic score using ProposalValidator
      const { totalScore, breakdown } = ProposalValidator.computeSpeakerScore(
        prop,
        turnId,
        topicHistory,
        recentSpeakers,
        personaRoleMap
      );

      // Store proposal totalScore & breakdown
      prop.totalScore = totalScore;
      prop.speakerScoreBreakdown = breakdown;

      scores[personaId] = {
        rawPriority: prop.priority,
        penalty: breakdown.recentSpeakerPenalty + breakdown.duplicatePenalty + breakdown.topicFatiguePenalty + breakdown.repeatedConcernPenalty,
        bonus: breakdown.evidenceGapWeight + breakdown.contradictionWeight + breakdown.objectiveImportance + breakdown.latestAnswerRelevance + breakdown.personaSpecialization + breakdown.conversationMomentum,
        finalScore: totalScore,
        breakdown,
        reason: `spec:${breakdown.personaSpecialization}, gap:${breakdown.evidenceGapWeight}, fatigue:${breakdown.topicFatiguePenalty}`,
      };

      if (prop.action !== 'WAIT' && totalScore > highestScore) {
        highestScore = totalScore;
        bestProposal = prop;
      }
    }

    if (!bestProposal || highestScore < 0.10) {
      return {
        sessionId,
        turnId,
        selectedPersonaId: null,
        action: 'WAIT',
        reason: 'All agents proposed to wait or scores below activation threshold.',
        confidence: 0.9,
        metadataJson: { scores },
      };
    }

    const action = (bestProposal as any).action === 'INTERRUPT' ? 'INTERRUPT' : 'SPEAK';

    const selectedPersona = sessionPersonas.find(sp => sp.personaId === bestProposal?.personaId)?.personaDetails;
    const personaName = selectedPersona?.name || `Agent ${bestProposal.personaId}`;
    const selectedTopic = bestProposal.topic || bestProposal.canonicalConcernId || 'general';
    const lastTopic = topicHistory.length > 0 ? topicHistory[topicHistory.length - 1] : 'initial';

    let transitionReason = '';
    if (lastTopic !== selectedTopic && lastTopic !== 'initial') {
      transitionReason = `Topic transition from ${lastTopic} to ${selectedTopic} driven by higher priority concern.`;
    } else {
      transitionReason = `${personaName} addresses ${selectedTopic}.`;
    }

    const scoreDetails = scores[bestProposal.personaId];

    // --- PHASE 5D TELEMETRY LOG ---
    const topicScoresLog = proposals.map(p => `${p.topic || 'gen'}:${(p.totalScore || 0).toFixed(2)}`).join(', ');
    const personaScoresLog = Object.entries(scores).map(([pid, s]) => `P${pid}=${s.finalScore.toFixed(2)}`).join(', ');
    const penaltiesLog = `recentSpeaker=-${scoreDetails?.breakdown?.recentSpeakerPenalty || 0}, topicFatigue=-${scoreDetails?.breakdown?.topicFatiguePenalty || 0}, duplicate=-${scoreDetails?.breakdown?.duplicatePenalty || 0}`;

    console.log(`[BOARDROOM_ORCHESTRATOR] TURN=${turnId} CURRENT_TOPIC=${selectedTopic} SELECTED_PERSONA=${bestProposal.personaId} (${personaName}) SELECTED_CONCERN=${bestProposal.canonicalConcernId || 'c_active'} ACTION=${bestProposal.action}`);
    console.log(`[BOARDROOM_ORCHESTRATOR] TOPIC_SCORES: ${topicScoresLog}`);
    console.log(`[BOARDROOM_ORCHESTRATOR] PERSONA_SCORES: ${personaScoresLog}`);
    console.log(`[BOARDROOM_ORCHESTRATOR] PENALTIES: ${penaltiesLog}`);
    console.log(`[BOARDROOM_ORCHESTRATOR] REASON: "${transitionReason} (${bestProposal.reason})"`);

    return {
      sessionId,
      turnId,
      selectedPersonaId: bestProposal.personaId,
      action,
      reason: `${transitionReason} Reason: ${bestProposal.reason}.`,
      confidence: bestProposal.confidence,
      metadataJson: {
        scores,
        selectedProposalId: bestProposal.id,
        topicTransitionReason: transitionReason,
        topic: selectedTopic,
        previousTopic: lastTopic,
        recommendedAction: (bestProposal as any).recommendedAction,
        questionReason: (bestProposal as any).questionReason,
        satisfactionReason: (bestProposal as any).satisfactionReason,
        scoreBreakdown: scoreDetails?.breakdown,
      },
    };
  }
}

export const decisionEngine = new DecisionEngine();
