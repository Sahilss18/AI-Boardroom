import { AudioFrame, VADResult, VoiceActivityDetector } from '../types.js';

export class EnergyVoiceActivityDetector implements VoiceActivityDetector {
  private energyThreshold: number;
  private speechStartMinDurationMs: number;
  private speechEndSilenceDurationMs: number;

  private isSpeaking: boolean = false;
  private continuousSpeechDurationMs: number = 0;
  private continuousSilenceDurationMs: number = 0;

  constructor() {
    this.energyThreshold = parseFloat(process.env.VAD_ENERGY_THRESHOLD || '0.02');
    this.speechStartMinDurationMs = parseInt(process.env.VAD_SPEECH_START_MIN_DURATION_MS || '150', 10);
    this.speechEndSilenceDurationMs = parseInt(process.env.VAD_SPEECH_END_SILENCE_DURATION_MS || '800', 10);
  }

  public async process(frame: AudioFrame): Promise<VADResult> {
    const buffer = frame.data;
    if (buffer.length === 0) {
      return { isSpeech: false, speechStarted: false, speechEnded: false, confidence: 0 };
    }

    // Calculate RMS energy of PCM16 audio samples
    let samples: Int16Array;
    if (buffer.byteOffset % 2 === 0) {
      samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    } else {
      const aligned = Buffer.from(buffer);
      samples = new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
    }
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i] / 32768.0;
      sum += sample * sample;
    }
    const rms = samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;

    const frameDurationMs = (samples.length / frame.sampleRate) * 1000;
    const currentIsSpeech = rms > this.energyThreshold;
    const confidence = rms > this.energyThreshold ? Math.min(1.0, rms * 5) : Math.max(0, 1.0 - (rms * 5));

    let speechStarted = false;
    let speechEnded = false;

    if (currentIsSpeech) {
      this.continuousSilenceDurationMs = 0;
      this.continuousSpeechDurationMs += frameDurationMs;

      if (!this.isSpeaking && this.continuousSpeechDurationMs >= this.speechStartMinDurationMs) {
        this.isSpeaking = true;
        speechStarted = true;
      }
    } else {
      this.continuousSpeechDurationMs = 0;
      this.continuousSilenceDurationMs += frameDurationMs;

      if (this.isSpeaking && this.continuousSilenceDurationMs >= this.speechEndSilenceDurationMs) {
        this.isSpeaking = false;
        speechEnded = true;
      }
    }

    return {
      isSpeech: this.isSpeaking,
      speechStarted,
      speechEnded,
      confidence
    };
  }

  public reset(): void {
    this.isSpeaking = false;
    this.continuousSpeechDurationMs = 0;
    this.continuousSilenceDurationMs = 0;
  }
}
