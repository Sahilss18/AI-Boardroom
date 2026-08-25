import { AudioFrame } from '../types.js';

export interface STTEventPayload {
  text: string;
  isFinal: boolean;
  confidence?: number;
  language?: string;
  durationMs?: number;
  sttProvider?: string;
}

export interface STTErrorPayload {
  error: string;
}
