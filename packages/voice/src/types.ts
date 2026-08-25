export interface AudioFrame {
  sessionId: string;
  turnId: string;
  sequenceNumber: number;
  timestamp: number;
  sampleRate: number;
  channels: number;
  encoding: string;
  data: Buffer;
}

export interface VADResult {
  isSpeech: boolean;
  speechStarted: boolean;
  speechEnded: boolean;
  confidence: number;
}

export interface VoiceActivityDetector {
  process(frame: AudioFrame): Promise<VADResult>;
  reset(): void;
}

export interface TranscriptEvent {
  turnId: string;
  text: string;
  isFinal: boolean;
  sequenceNumber?: number;
}

export interface StreamingSTT {
  start(turnId: string): Promise<void>;
  pushAudio(frame: AudioFrame): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
  on(event: 'partial' | 'final' | 'error', callback: (data: any) => void): void;
}

export interface TTSOptions {
  responseId: string;
  sessionId: string;
  turnId: string;
  personaId: string;
  voiceId: string;
  language?: string;
  speakingRate?: number;
  pitch?: number;
  abortSignal?: AbortSignal;
}

export interface TTSAudioChunk {
  responseId: string;
  sequenceNumber: number;
  audio: Buffer;
  sampleRate: number;
  channels: number;
  encoding: string;
  isFinal: boolean;
}

export interface StreamingTTS {
  synthesize(
    text: string,
    options: TTSOptions
  ): AsyncIterable<TTSAudioChunk>;
  cancel(responseId: string): Promise<void>;
  close(): Promise<void>;
}

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'USER_SPEAKING'
  | 'USER_SILENCE'
  | 'PROCESSING'
  | 'AI_SPEAKING'
  | 'INTERRUPTED'
  | 'ERROR';

export interface UserTurnInput {
  turnId: string;
  source: 'TEXT' | 'VOICE';
  text: string;
  timestamp: number;
}
