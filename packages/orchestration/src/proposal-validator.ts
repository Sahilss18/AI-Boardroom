import { LatentQuestion, AgentProposal } from '@reflection-ai/shared';
import { QuestionSimilarityEngine } from '@reflection-ai/intelligence';

export interface ScoringWeights {
  concernPriority: number;
  evidenceGapWeight: number;
  contradictionWeight: number;
  objectiveImportance: number;
  latestAnswerRelevance: number;
  personaSpecialization: number;
  conversationMomentum: number;
  recentSpeakerPenalty: number;
  duplicatePenalty: number;
  topicFatiguePenalty: number;
  repeatedConcernPenalty: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  concernPriority: 1.0,
  evidenceGapWeight: 0.8,
  contradictionWeight: 1.2,
  objectiveImportance: 0.7,
  latestAnswerRelevance: 0.9,
  personaSpecialization: 0.9,
  conversationMomentum: 0.4,
  recentSpeakerPenalty: 0.4,
  duplicatePenalty: 2.0,
  topicFatiguePenalty: 0.8,
  repeatedConcernPenalty: 0.6,
};

export const PERSONA_SPECIALIZATION_DOMAINS: Record<string, { primary: string[]; secondary: string[] }> = {
  cfo: {
    primary: ['unit-economics', 'cost', 'pricing', 'margins', 'cac-ltv', 'burn', 'financials', 'infrastructure-economics'],
    secondary: ['scalability-economics', 'business-model'],
  },
  budget: {
    primary: ['unit-economics', 'cost', 'pricing', 'margins', 'cac-ltv', 'burn', 'financials', 'infrastructure-economics'],
    secondary: ['scalability-economics', 'business-model'],
  },
  vc: {
    primary: ['market', 'competition', 'differentiation', 'defensibility', 'traction', 'business-model', 'growth'],
    secondary: ['unit-economics', 'team-execution'],
  },
  investor: {
    primary: ['market', 'competition', 'differentiation', 'defensibility', 'traction', 'business-model', 'growth'],
    secondary: ['unit-economics', 'team-execution'],
  },
  cto: {
    primary: ['technology', 'architecture', 'scalability', 'technical-feasibility', 'reliability', 'technical-differentiation'],
    secondary: ['infrastructure-economics', 'unit-economics'],
  },
  technical: {
    primary: ['technology', 'architecture', 'scalability', 'technical-feasibility', 'reliability', 'technical-differentiation'],
    secondary: ['infrastructure-economics', 'unit-economics'],
  },
};

export class ProposalValidator {
  /**
   * Computes a deterministic speaker score balancing priority, evidence gap, persona specialization,
   * topic fatigue, and recent speaker penalties.
   */
  public static computeSpeakerScore(
    proposal: AgentProposal,
    currentTurn: number,
    topicHistory: string[],
    recentSpeakers: number[],
    personaRoleMap: Record<number, string> = {},
    weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
  ): { totalScore: number; breakdown: any } {
    const proposalTopic = (proposal.topic || proposal.canonicalConcernId || 'general').toLowerCase();
    const personaRole = (personaRoleMap[proposal.personaId] || '').toLowerCase();

    // 1. Concern Priority (0.0 to 1.0)
    const concernPriority = (proposal.priority || 0.5) * weights.concernPriority;

    // 2. Evidence Gap Weight
    const missingCount = proposal.missingEvidence?.length || 0;
    const evidenceGapWeight = Math.min(missingCount * 0.25, 1.0) * weights.evidenceGapWeight;

    // 3. Contradiction Weight
    const isContradiction = proposal.action === 'CHALLENGE' || proposal.action === 'PUSH_BACK' || proposal.evidenceStatus === 'CONTRADICTED';
    const contradictionWeight = (isContradiction ? 0.8 : 0.0) * weights.contradictionWeight;

    // 4. Objective Importance
    const objectiveImportance = ((proposal as any).importance || 0.6) * weights.objectiveImportance;

    // 5. Latest Answer Relevance
    const isFollowUp = ['FOLLOW_UP', 'CLARIFY', 'ACKNOWLEDGE', 'AGREE', 'DISAGREE', 'PUSH_BACK'].includes(proposal.action);
    const latestAnswerRelevance = (isFollowUp ? 0.7 : 0.3) * weights.latestAnswerRelevance;

    // 6. Persona Specialization
    let specializationScore = 0.3; // baseline
    for (const [roleKey, spec] of Object.entries(PERSONA_SPECIALIZATION_DOMAINS)) {
      if (personaRole.includes(roleKey)) {
        if (spec.primary.some(pt => proposalTopic.includes(pt))) {
          specializationScore = 0.9;
        } else if (spec.secondary.some(st => proposalTopic.includes(st))) {
          specializationScore = 0.6;
        }
        break;
      }
    }
    const personaSpecialization = specializationScore * weights.personaSpecialization;

    // 7. Conversation Momentum
    const lastTopic = topicHistory.length > 0 ? topicHistory[topicHistory.length - 1] : null;
    const isSameTopic = lastTopic && (proposalTopic.includes(lastTopic) || lastTopic.includes(proposalTopic));
    const conversationMomentum = (isSameTopic ? 0.4 : 0.0) * weights.conversationMomentum;

    // --- PENALTIES ---

    // 8. Recent Speaker Penalty
    const lastSpeaker = recentSpeakers.length > 0 ? recentSpeakers[recentSpeakers.length - 1] : null;
    const isRecentSpeaker = lastSpeaker === proposal.personaId;
    const recentSpeakerPenalty = (isRecentSpeaker ? 0.5 : 0.0) * weights.recentSpeakerPenalty;

    // 9. Duplicate Penalty
    const isDuplicate = proposal.validation?.duplicate || proposal.status === 'rejected';
    const duplicatePenalty = (isDuplicate ? 1.0 : 0.0) * weights.duplicatePenalty;

    // 10. Topic Fatigue Penalty: count occurrence of proposalTopic in last 4 turns
    const recent4Topics = topicHistory.slice(-4);
    const topicOccurrences = recent4Topics.filter(t => t && (t.includes(proposalTopic) || proposalTopic.includes(t))).length;
    let fatigueFactor = 0;
    if (topicOccurrences >= 3) fatigueFactor = 1.0;
    else if (topicOccurrences === 2) fatigueFactor = 0.5;
    else if (topicOccurrences === 1) fatigueFactor = 0.2;
    const topicFatiguePenalty = fatigueFactor * weights.topicFatiguePenalty;

    // 11. Repeated Concern Penalty
    const followUpCount = proposal.followUpCount || 0;
    const repeatedConcernPenalty = Math.min(followUpCount * 0.25, 0.8) * weights.repeatedConcernPenalty;

    const positiveSum = concernPriority + evidenceGapWeight + contradictionWeight + objectiveImportance + latestAnswerRelevance + personaSpecialization + conversationMomentum;
    const penaltySum = recentSpeakerPenalty + duplicatePenalty + topicFatiguePenalty + repeatedConcernPenalty;

    const totalScore = Number((positiveSum - penaltySum).toFixed(4));

    const breakdown = {
      concernPriority: Number(concernPriority.toFixed(3)),
      evidenceGapWeight: Number(evidenceGapWeight.toFixed(3)),
      contradictionWeight: Number(contradictionWeight.toFixed(3)),
      objectiveImportance: Number(objectiveImportance.toFixed(3)),
      latestAnswerRelevance: Number(latestAnswerRelevance.toFixed(3)),
      personaSpecialization: Number(personaSpecialization.toFixed(3)),
      conversationMomentum: Number(conversationMomentum.toFixed(3)),
      recentSpeakerPenalty: Number(recentSpeakerPenalty.toFixed(3)),
      duplicatePenalty: Number(duplicatePenalty.toFixed(3)),
      topicFatiguePenalty: Number(topicFatiguePenalty.toFixed(3)),
      repeatedConcernPenalty: Number(repeatedConcernPenalty.toFixed(3)),
      totalScore,
    };

    return { totalScore, breakdown };
  }

  /**
   * Validates an agent proposal against session constraints.
   */
  public static async validateProposal(
    proposal: AgentProposal,
    currentTurn: number,
    sessionQuestions: LatentQuestion[]
  ): Promise<{
    eligible: boolean;
    duplicate: boolean;
    alreadySatisfied: boolean;
    recentlyAsked: boolean;
    rejectionReason?: string;
    matchedQuestion?: LatentQuestion;
  }> {
    const result = {
      eligible: true,
      duplicate: false,
      alreadySatisfied: false,
      recentlyAsked: false,
      rejectionReason: undefined as string | undefined,
      matchedQuestion: undefined as LatentQuestion | undefined,
    };

    const isQuestionAction = ['ASK', 'FOLLOW_UP', 'CHALLENGE', 'CLARIFY', 'COUNTER', 'PUSH_BACK'].includes(proposal.action);

    // If it's not a question/probe proposal, only basic confidence check is required
    if (!isQuestionAction) {
      if (proposal.confidence < 0.5) {
        result.eligible = false;
        result.rejectionReason = `Confidence score ${proposal.confidence} is below minimum threshold of 0.5`;
      }
      this.logProposalEvaluation(proposal, result);
      return result;
    }

    // 1. Basic Confidence / Priority Threshold
    if (proposal.confidence < 0.5 || proposal.priority < 0.5) {
      result.eligible = false;
      result.rejectionReason = `Confidence/Priority below minimum threshold of 0.5 (Conf: ${proposal.confidence}, Priority: ${proposal.priority})`;
      this.logProposalEvaluation(proposal, result);
      return result;
    }

    // 1B. Grounding Validation Gate: Reject ungrounded technical assumptions
    const ungroundedTerms = ['mysql', 'redis', 'postgresql', 'kubernetes', 'failover', 'replication', '100k concurrent', 'load balancing'];
    const proposalContentLower = proposal.content.toLowerCase();
    const containsUngroundedTerm = ungroundedTerms.some(term => proposalContentLower.includes(term));

    if (containsUngroundedTerm) {
      const sourceClaims = (proposal as any).sourceClaims || [];
      const hasGroundingClaim = sourceClaims.some((claim: string) =>
        ungroundedTerms.some(term => claim.toLowerCase().includes(term))
      );
      if (!hasGroundingClaim) {
        result.eligible = false;
        result.rejectionReason = `REASON_UNGROUNDED_TECHNICAL_ASSUMPTION: Question contains ungrounded technical assumption without source claim grounding.`;
        this.logProposalEvaluation(proposal, result);
        return result;
      }
    }

    const canonicalConcernId = proposal.canonicalConcernId || (proposal as any).concernId || null;

    // 2. SESSION-GLOBAL CANONICAL CONCERN CHECK
    if (canonicalConcernId) {
      // Check if canonical concern is globally SATISFIED
      const satisfiedQuestion = sessionQuestions.find(
        sq => (sq.canonicalConcernId === canonicalConcernId || sq.canonicalQuestionId === canonicalConcernId) &&
              (sq.status === 'SATISFIED' || sq.satisfactionScore >= 0.85)
      );
      if (satisfiedQuestion) {
        result.alreadySatisfied = true;
        result.duplicate = true;
        result.eligible = false;
        result.rejectionReason = `GLOBAL_QUESTION_ALREADY_SATISFIED: Canonical concern '${canonicalConcernId}' is already satisfied.`;
        this.logProposalEvaluation(proposal, result);
        return result;
      }

      // Check session-global cooldown by (sessionId, canonicalConcernId) across ALL personas
      const repeatCooldown = parseInt(process.env.QUESTION_REPEAT_COOLDOWN_TURNS || '5', 10);
      let lastAskedTurn: number | null = null;
      for (const sq of sessionQuestions) {
        if ((sq.canonicalConcernId === canonicalConcernId || sq.canonicalQuestionId === canonicalConcernId) &&
            sq.lastAskedTurn !== null && sq.lastAskedTurn !== undefined) {
          if (lastAskedTurn === null || sq.lastAskedTurn > lastAskedTurn) {
            lastAskedTurn = sq.lastAskedTurn;
          }
        }
      }

      if (lastAskedTurn !== null && lastAskedTurn !== undefined) {
        const turnsSinceAsked = currentTurn - lastAskedTurn;
        if (turnsSinceAsked >= 0 && turnsSinceAsked < repeatCooldown) {
          result.recentlyAsked = true;
          result.duplicate = true;
          result.eligible = false;
          result.rejectionReason = `REJECTED_DUPLICATE: Canonical concern '${canonicalConcernId}' was recently asked in turn ${lastAskedTurn} (cooldown: ${repeatCooldown} turns)`;
          this.logProposalEvaluation(proposal, result);
          return result;
        }
      }
    }

    // 3. Find matching latent question or semantic duplicate
    let matchedQ: LatentQuestion | undefined;

    // A. Match by explicit id / questionId
    if (proposal.questionId) {
      matchedQ = sessionQuestions.find(
        q => String(q.id) === String(proposal.questionId) || q.questionId === String(proposal.questionId)
      );
    }

    // B. Match by semantic content & intent
    const duplicateThreshold = parseFloat(process.env.QUESTION_DUPLICATE_THRESHOLD || '0.70');
    if (!matchedQ) {
      for (const sq of sessionQuestions) {
        const normProposed = proposal.content.toLowerCase().trim().replace(/[?.!,]/g, '');
        const normExisting = sq.question.toLowerCase().trim().replace(/[?.!,]/g, '');
        if (normProposed === normExisting) {
          matchedQ = sq;
          break;
        }

        const sim = await QuestionSimilarityEngine.compareQuestions(
          proposal.content,
          sq.question,
          proposal.semanticIntent,
          sq.intent,
          proposal.relatedEntities || [],
          sq.entitiesJson || [],
          canonicalConcernId,
          sq.canonicalConcernId || sq.canonicalQuestionId
        );

        if (sim.isDuplicate || sim.similarityScore >= duplicateThreshold) {
          matchedQ = sq;
          break;
        }
      }
    }

    if (matchedQ) {
      result.matchedQuestion = matchedQ;

      // Check if satisfied globally
      const canonicalId = matchedQ.canonicalConcernId || matchedQ.canonicalQuestionId;
      const isSatisfiedGlobally = matchedQ.status === 'SATISFIED' || matchedQ.satisfactionScore >= 0.85 ||
        (!!canonicalId && sessionQuestions.some(sq => (sq.canonicalConcernId === canonicalId || sq.canonicalQuestionId === canonicalId) && sq.status === 'SATISFIED'));

      if (isSatisfiedGlobally) {
        result.alreadySatisfied = true;
        result.duplicate = true;
        result.eligible = false;
        result.rejectionReason = 'GLOBAL_QUESTION_ALREADY_SATISFIED';
        this.logProposalEvaluation(proposal, result);
        return result;
      }

      // Check if recently asked
      const repeatCooldown = parseInt(process.env.QUESTION_REPEAT_COOLDOWN_TURNS || '5', 10);
      let lastAskedTurn: number | null = matchedQ.lastAskedTurn || null;
      if (canonicalId) {
        for (const sq of sessionQuestions) {
          if ((sq.canonicalConcernId === canonicalId || sq.canonicalQuestionId === canonicalId) &&
              sq.lastAskedTurn !== null && sq.lastAskedTurn !== undefined) {
            if (lastAskedTurn === null || sq.lastAskedTurn > lastAskedTurn) {
              lastAskedTurn = sq.lastAskedTurn;
            }
          }
        }
      }

      if (lastAskedTurn !== null && lastAskedTurn !== undefined) {
        const turnsSinceAsked = currentTurn - lastAskedTurn;
        if (turnsSinceAsked >= 0 && turnsSinceAsked < repeatCooldown) {
          result.recentlyAsked = true;
          result.duplicate = true;
          result.eligible = false;
          result.rejectionReason = `REJECTED_DUPLICATE: Question was recently asked in turn ${lastAskedTurn} (cooldown: ${repeatCooldown} turns)`;
          this.logProposalEvaluation(proposal, result);
          return result;
        }
      }

      if (matchedQ.status === 'REJECTED_DUPLICATE' || matchedQ.status === 'INVALIDATED') {
        result.duplicate = true;
        result.eligible = false;
        result.rejectionReason = `Question is marked as inactive duplicate or invalidated`;
        this.logProposalEvaluation(proposal, result);
        return result;
      }
    } else {
      // Semantic co-reference check against asked questions to capture dynamic duplicates
      const askedOrSatisfied = sessionQuestions.filter(
        q => q.status === 'ASKED' || q.status === 'SATISFIED' || q.status === 'PARTIALLY_ANSWERED'
      );
      for (const sq of askedOrSatisfied) {
        const canonicalId = sq.canonicalConcernId || sq.canonicalQuestionId;
        const isSatisfiedGlobally = sq.status === 'SATISFIED' ||
          (!!canonicalId && sessionQuestions.some(eq => (eq.canonicalConcernId === canonicalId || eq.canonicalQuestionId === canonicalId) && eq.status === 'SATISFIED'));

        const sim = await QuestionSimilarityEngine.compareQuestions(
          proposal.content,
          sq.question,
          proposal.semanticIntent,
          sq.intent,
          proposal.relatedEntities || [],
          sq.entitiesJson || [],
          canonicalConcernId,
          sq.canonicalConcernId || sq.canonicalQuestionId
        );

        if (sim.isDuplicate || sim.similarityScore >= duplicateThreshold) {
          if (isSatisfiedGlobally) {
            result.alreadySatisfied = true;
            result.duplicate = true;
            result.eligible = false;
            result.rejectionReason = 'GLOBAL_QUESTION_ALREADY_SATISFIED';
            this.logProposalEvaluation(proposal, result);
            return result;
          }
          result.duplicate = true;
          result.eligible = false;
          result.rejectionReason = `REJECTED_DUPLICATE: Semantically duplicates previously asked question: "${sq.question}"`;
          this.logProposalEvaluation(proposal, result);
          return result;
        }
      }
    }

    this.logProposalEvaluation(proposal, result);
    return result;
  }

  private static logProposalEvaluation(proposal: AgentProposal, result: { eligible: boolean; rejectionReason?: string }) {
    const canonicalConcern = proposal.canonicalConcernId || (proposal as any).concernId || 'general';
    const decision = result.eligible ? 'ALLOWED' : 'REJECTED_DUPLICATE';
    console.log(`[QUESTION_PROPOSAL] persona=${proposal.personaId} canonicalConcern=${canonicalConcern} action=${proposal.action} decision=${decision} reason="${result.rejectionReason || 'Valid proposal'}"`);
  }
}
