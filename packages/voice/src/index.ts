export * from './types.js';
export { EnergyVoiceActivityDetector } from './vad/index.js';
export { SileroVoiceActivityDetector } from './vad/silero.js';
export { createStreamingSTT, MockStreamingSTT } from './stt/index.js';
export { createStreamingTTS, MockStreamingTTS, segmentText } from './tts/index.js';
export { VoiceResponseService, cleanTextForTTS, SpeakingLock } from './response/index.js';
export { GeminiLiveBridge } from './realtime/gemini-live.js';

import { VoiceActivityDetector } from './types.js';
import { EnergyVoiceActivityDetector } from './vad/index.js';
import { SileroVoiceActivityDetector } from './vad/silero.js';

export function createVoiceActivityDetector(provider?: string): VoiceActivityDetector {
  const p = provider || process.env.VAD_PROVIDER || 'silero';
  if (p === 'silero') {
    return new SileroVoiceActivityDetector();
  }
  return new EnergyVoiceActivityDetector();
}
