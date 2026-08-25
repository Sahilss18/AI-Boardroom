export type SimulationEventType =
  | 'SESSION_STARTED'
  | 'SESSION_ENDED'
  | 'USER_SPEECH_STARTED'
  | 'USER_SPEECH_PARTIAL'
  | 'USER_SPEECH_FINAL'
  | 'USER_SPEECH_ENDED'
  | 'INTENT_DETECTED'
  | 'ENTITY_DETECTED'
  | 'CLAIM_DETECTED'
  | 'RETRIEVAL_STARTED'
  | 'RETRIEVAL_COMPLETED'
  | 'CONTRADICTION_DETECTED'
  | 'QUESTION_CREATED'
  | 'QUESTION_PROPOSED'
  | 'QUESTION_VALIDATED'
  | 'QUESTION_REJECTED'
  | 'QUESTION_ASKED'
  | 'QUESTION_UPDATED'
  | 'QUESTION_SATISFIED'
  | 'QUESTION_DUPLICATE'
  | 'QUESTION_DEFERRED'
  | 'AGENT_OBSERVATION'
  | 'AGENT_SIGNAL'
  | 'AGENT_PROPOSAL'
  | 'ORCHESTRATOR_STARTED'
  | 'ORCHESTRATOR_DECISION'
  | 'RESPONSE_GENERATION_STARTED'
  | 'RESPONSE_GENERATION_COMPLETED'
  | 'TTS_STARTED'
  | 'TTS_CHUNK'
  | 'TTS_STOPPED'
  | 'USER_INTERRUPTED'
  | 'TOOL_CALL_STARTED'
  | 'TOOL_CALL_COMPLETED'
  | 'ERROR'
  | 'voice.session.started'
  | 'voice.speech.started'
  | 'voice.transcript.partial'
  | 'voice.transcript.final'
  | 'voice.processing.started'
  | 'voice.ai.response.started'
  | 'voice.ai.audio.started'
  | 'voice.ai.audio.chunk'
  | 'voice.ai.response.completed'
  | 'voice.ai.response.interrupted'
  | 'voice.error'
  | 'voice.transcript.empty'
  | 'VOICE_STT_ERROR'
  | 'VOICE_AUDIO_FRAME_DROPPED'
  | 'VOICE_AUDIO_ERROR'
  | 'voice.ai.audio.completed'
  | 'voice.ai.response.cancelled'
  | 'voice.ai.tts.error';

export interface SimulationEvent<T = any> {
  eventId: string;
  sessionId: string;
  turnId?: string;
  timestamp: number;
  source: 'user' | 'agent' | 'orchestrator' | 'system' | 'tool' | 'voice';
  type: SimulationEventType;
  payload: T;
  traceId?: string;
}

// WS client to server payloads
export interface AudioStartPayload {
  sampleRate: number;
}

export interface AudioChunkPayload {
  data: string; // Base64 PCM data
}

export interface UserTextPayload {
  text: string;
}

// WS server to client payloads
export interface SessionStatePayload {
  sessionId: string;
  status: 'active' | 'paused' | 'ended';
  currentTurn: number;
  activeSpeakerId: number | null;
  userSpeaking: boolean;
  aiSpeaking: boolean;
}

export interface TranscriptPartialPayload {
  text: string;
}

export interface TranscriptFinalPayload {
  text: string;
}

export interface OrchestratorDecisionPayload {
  selectedPersonaId: number | null;
  action: 'WAIT' | 'SPEAK' | 'INTERRUPT' | 'END_SESSION';
  reason: string;
  confidence: number;
}

export interface AgentResponseChunkPayload {
  personaId: number;
  text: string;
  isComplete: boolean;
}

export interface ContradictionPayload {
  claimA: any;
  claimB: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason: string;
}

export interface QuestionSatisfiedPayload {
  personaId: number;
  questionId: string;
  question: string;
  status: 'satisfied' | 'partially_answered';
  score: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}
