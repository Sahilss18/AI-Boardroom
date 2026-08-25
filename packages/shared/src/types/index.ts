export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scenario {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: string; // e.g., 'interview', 'pitch', 'viva', 'sales'
  configurationJson: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface Persona {
  id: number;
  name: string;
  slug: string;
  role: string;
  description: string;
  systemPrompt: string;
  voiceId: string;
  modelProvider: string;
  modelName: string;
  configurationJson: {
    objectives: string[];
    behavior: {
      aggressiveness: number;
      patience: number;
      technicalDepth: number;
      interruptionTendency: number;
    };
    latentQuestions?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: number;
  userId: number;
  scenarioId: number;
  status: 'active' | 'paused' | 'ended';
  currentTurn: number;
  activeSpeakerId: number | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionPersona {
  id: number;
  sessionId: number;
  personaId: number;
  privateStateJson: AgentPrivateState;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface SemanticEntity {
  type: string;
  value: string;
  confidence: number;
}

export interface SemanticClaim {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
}

export interface SemanticTopic {
  name: string;
  confidence: number;
}

export interface DetectedQuestion {
  text: string;
  intent?: string;
  confidence?: number;
}

export interface SemanticContext {
  intent: {
    type: string;
    confidence: number;
  };
  entities: SemanticEntity[];
  claims: SemanticClaim[];
  topics: SemanticTopic[];
  detectedQuestions?: DetectedQuestion[];
  evidenceReferences?: string[];
  confidence: number;
}

export type TopicCategory =
  | 'unit-economics'
  | 'market'
  | 'competition'
  | 'technology'
  | 'scalability'
  | 'business-model'
  | 'team-execution'
  | 'infrastructure-economics'
  | 'general';

export interface TopicTransition {
  previousTopic: TopicCategory | string;
  newTopic: TopicCategory | string;
  reason: string;
  triggeringTurn: number;
  triggeringConcern?: string;
}

export interface SpeakerScoreBreakdown {
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
  totalScore: number;
}

export interface PersonaSpecialization {
  personaId?: number;
  personaRole?: string;
  primaryTopics: TopicCategory[];
  secondaryTopics: TopicCategory[];
}

export interface LatentQuestion {
  id: number;
  sessionId: number;
  personaId: number;
  question: string;
  normalizedQuestion: string;
  intent: string;
  entitiesJson: any;
  priority: number;
  status: 'CREATED' | 'PROPOSED' | 'ASKED' | 'PARTIALLY_ANSWERED' | 'SATISFIED' | 'DEFERRED' | 'INVALIDATED' | 'REJECTED_DUPLICATE' | 'UNANSWERED' | 'PARTIALLY_SATISFIED' | 'CONTRADICTED' | 'ABANDONED';
  satisfactionScore: number;
  source: string;
  questionId?: string;
  canonicalIntent?: string;
  askedAt?: Date | null;
  lastProposedAt?: Date | null;
  lastAskedTurn?: number | null;
  duplicateOf?: string | null;
  rejectionReason?: string | null;
  canonicalQuestionId?: string | null;
  canonicalConcernId?: string | null;
  canonicalConcern?: string | null;
  topic?: TopicCategory | string;
  importance?: number;
  urgency?: number;
  followUpCount?: number;
  sourceClaims?: string[];
  answeredByPersonaId?: number | null;
  answeredAt?: Date | null;
  askedByPersonaId?: number | null;
  metadataJson?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface LatentConcern {
  concernId: string;
  objective: string;
  requiredEvidence: string[];
  observedEvidence: string[];
  missingEvidence: string[];
  status: 'UNANSWERED' | 'UNRESOLVED' | 'PARTIALLY_SATISFIED' | 'SATISFIED' | 'DEFERRED' | 'ABANDONED' | 'CONTRADICTED';
  satisfactionScore: number;
  satisfactionReason: string;
  priority: number;
  importance?: number;
  urgency?: number;
  topic?: TopicCategory | string;
  lastDiscussedTurn?: number;
  followUpCount?: number;
  personaId?: number;
}

export interface DeliberationMessage {
  fromPersonaId: number;
  toPersonaId: number;
  type: 'OBSERVATION' | 'AGREEMENT' | 'DISAGREEMENT' | 'CHALLENGE' | 'COUNTERPOINT' | 'SUPPORT' | 'CONCERN' | 'HYPOTHESIS' | 'RECOMMENDATION' | 'QUESTION_SUGGESTION';
  content: string;
  referencedClaimIds: string[];
  referencedConcernIds: string[];
  confidence: number;
  timestamp: number;
}

export interface AgentPrivateState {
  personaId: number;
  objectives: AgentObjective[];
  latentQuestions: LatentQuestion[];
  concerns: LatentConcern[];
  hypotheses: string[];
  observationsList: string[];
  evidenceNeeded: string[];
  resolvedConcerns: string[];
  partiallyResolvedConcerns?: string[];
  unresolvedConcerns: string[];
  contradictions: string[];
  evidenceGaps?: string[];
  confidence: number;
  lastAction: string;
  currentFocus: string | null;
  speakingCooldown: number;
  lastSpokenTurn?: number;
  recentSpeakers?: number[];
  pendingQuestions?: string[];
  satisfiedQuestions?: string[];
  recentQuestions?: string[];
  observations?: Observation[];
}

export interface ConversationTurn {
  id: number;
  sessionId: number;
  speakerType: 'user' | 'agent';
  personaId: number | null;
  text: string;
  sequenceNumber: number;
  startedAt: Date;
  endedAt: Date;
  metadataJson?: any;
  createdAt: Date;
}

export type EvidenceStatus = 'SUPPORTED' | 'CONTRADICTED' | 'UNKNOWN' | 'INFERRED' | 'NOT_AFFECTED' | 'UNRELATED';

export interface Claim {
  id?: number;
  claimId?: number; // mapped to id
  sessionId: number;
  turnId: number | null;
  subject: string;
  predicate: string;
  object: string; // mapped to object_value in DB
  confidence: number;
  sourceType: 'USER_SPEECH' | 'RESUME' | 'PRESENTATION' | 'PDF' | 'DOCX' | 'SYSTEM_CONTEXT' | 'AGENT_OBSERVATION';
  sourceId: string;
  evidenceStatus?: EvidenceStatus;
  citation?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Conflict {
  conflictId?: number; // mapped to id
  id?: number;
  sessionId: number;
  claimAId: number;
  claimBId: number;
  claimA?: Claim;
  claimB?: Claim;
  contradictionType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  status: string; // e.g. 'active', 'resolved'
  resolution?: string;
  createdAt?: Date;
}

export interface AgentProposal {
  id?: number;
  sessionId: number;
  personaId: number;
  turnId: number;
  action: 'WAIT' | 'ASK' | 'RESPOND' | 'CHALLENGE' | 'CLARIFY' | 'INTERRUPT' | 'DEFER' | 'ACKNOWLEDGE' | 'FOLLOW_UP' | 'COUNTER' | 'AGREE' | 'DISAGREE' | 'PUSH_BACK' | 'TRANSITION' | 'CONCLUDE';
  content: string;
  priority: number;
  confidence: number;
  reason: string;
  status: 'pending' | 'selected' | 'rejected';
  evidenceStatus?: EvidenceStatus;
  evidenceCitation?: string;
  topic?: TopicCategory | string;
  totalScore?: number;
  speakerScoreBreakdown?: SpeakerScoreBreakdown;
  questionId?: number | string | null;
  canonicalConcernId?: string | null;
  canonicalConcern?: string | null;
  sourceClaims?: string[];
  missingEvidence?: string[];
  followUpCount?: number;
  semanticIntent?: string;
  relatedEntities?: any;
  relatedClaims?: any;
  validation?: {
    eligible: boolean;
    duplicate: boolean;
    alreadySatisfied: boolean;
    recentlyAsked: boolean;
  };
  createdAt?: Date;
}

export interface Observation {
  id?: number;
  sessionId: number;
  personaId: number;
  turnId: number;
  observationType: string;
  contentJson: any;
  importance: number;
  evidenceStatus?: EvidenceStatus;
  evidenceCitation?: string;
  createdAt?: Date;
}

export interface Decision {
  id?: number;
  sessionId: number;
  turnId: number;
  selectedPersonaId: number | null;
  action: 'WAIT' | 'SPEAK' | 'INTERRUPT' | 'END_SESSION';
  reason: string;
  confidence: number;
  metadataJson?: any;
  createdAt?: Date;
}
