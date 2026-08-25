import { EventEmitter } from 'events';
import { createStreamingTTS } from '../tts/index.js';
import { StreamingTTS, TTSAudioChunk, TTSOptions } from '../types.js';

export function cleanTextForTTS(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')    // Remove inline code ticks
    .replace(/[*_#\-~>]/g, '')      // Remove markdown styling
    .replace(/\{[\s\S]*?\}/g, '')    // Remove inline JSON/curly structures
    .replace(/\[[\s\S]*?\]/g, '')    // Remove brackets
    .trim();
}

export class SpeakingLock {
  private activeResponseId: string | null = null;

  public acquire(responseId: string): boolean {
    if (this.activeResponseId && this.activeResponseId !== responseId) {
      return false;
    }
    this.activeResponseId = responseId;
    return true;
  }

  public release(responseId: string): void {
    if (this.activeResponseId === responseId) {
      this.activeResponseId = null;
    }
  }

  public getActive(): string | null {
    return this.activeResponseId;
  }
}

export class VoiceResponseService extends EventEmitter {
  private ttsProvider: StreamingTTS;
  private lock: SpeakingLock;
  private activeCancellations: Set<string> = new Set();
  private activeControllers: Map<string, AbortController> = new Map();
  
  // Observability metrics log
  public metrics: Array<{
    responseId: string;
    sessionId: string;
    turnId: string;
    personaId: string;
    startTime: number;
    firstAudioTime?: number;
    endTime?: number;
    chunksCount: number;
    cancelled: boolean;
  }> = [];

  constructor(providerName?: string) {
    super();
    const prov = providerName || process.env.TTS_PROVIDER || 'mock';
    this.ttsProvider = createStreamingTTS(prov);
    this.lock = new SpeakingLock();
  }

  public getLock(): SpeakingLock {
    return this.lock;
  }

  public async speak(params: {
    sessionId: string;
    turnId: string;
    personaId: string;
    text: string;
    voiceId?: string;
    traceId?: string;
  }): Promise<string> {
    const { sessionId, turnId, personaId, text } = params;
    
    // 8. Generate responseId
    const responseId = `r_${turnId}_${Date.now()}`;
    
    const controller = new AbortController();
    this.activeControllers.set(responseId, controller);
    
    // 17. SPEAKING LOCK
    if (!this.lock.acquire(responseId)) {
      console.warn(`VoiceResponseService: Failed to acquire speaking lock for responseId ${responseId}`);
      this.emit('voice.ai.tts.error', {
        responseId,
        sessionId,
        turnId,
        error: 'Speaking lock held by another response.'
      });
      return responseId;
    }

    const metric: {
      responseId: string;
      sessionId: string;
      turnId: string;
      personaId: string;
      startTime: number;
      firstAudioTime?: number;
      endTime?: number;
      chunksCount: number;
      cancelled: boolean;
      traceId?: string;
    } = {
      responseId,
      sessionId,
      turnId,
      personaId,
      startTime: Date.now(),
      chunksCount: 0,
      cancelled: false,
      traceId: params.traceId
    };
    this.metrics.push(metric);

    this.emit('voice.ai.response.started', {
      responseId,
      sessionId,
      turnId,
      personaId,
      timestamp: Date.now()
    });

    // 29. TTS TEXT CLEANING
    const cleanedText = cleanTextForTTS(text);

    // Segment text
    const sentences = cleanedText.split(/(?<=[.!?])\s+/).filter(Boolean);

    if (sentences.length === 0 || !cleanedText) {
      // Empty text scenario
      this.emit('voice.ai.response.completed', {
        responseId,
        sessionId,
        turnId,
        personaId,
        timestamp: Date.now()
      });
      this.lock.release(responseId);
      return responseId;
    }

    // Run async synthesis in background (streaming chunks over WebSocket via events)
    (async () => {
      try {
        const options: TTSOptions = {
          responseId,
          sessionId,
          turnId,
          personaId,
          voiceId: params.voiceId || 'default-voice',
          speakingRate: 1.0,
          pitch: 0,
          abortSignal: controller.signal
        };

        let isFirst = true;
        const synthStream = this.ttsProvider.synthesize(cleanedText, options);

        for await (const chunk of synthStream) {
          if (this.activeCancellations.has(responseId)) {
            metric.cancelled = true;
            this.emit('voice.ai.response.interrupted', {
              responseId,
              sessionId,
              turnId,
              timestamp: Date.now()
            });
            break;
          }

          if (isFirst) {
            isFirst = false;
            metric.firstAudioTime = Date.now();
            this.emit('voice.ai.audio.started', {
              responseId,
              sessionId,
              turnId,
              timestamp: Date.now()
            });
          }

          metric.chunksCount++;
          
          // Emit chunks
          this.emit('voice.ai.audio.chunk', {
            responseId,
            sequenceNumber: chunk.sequenceNumber,
            audio: chunk.audio,
            isFinal: chunk.isFinal,
            timestamp: Date.now()
          });

          if (chunk.isFinal) {
            this.emit('voice.ai.audio.completed', {
              responseId,
              sessionId,
              turnId,
              timestamp: Date.now()
            });
          }
        }

        metric.endTime = Date.now();

        if (!metric.cancelled) {
          this.emit('voice.ai.response.completed', {
            responseId,
            sessionId,
            turnId,
            personaId,
            timestamp: Date.now()
          });
        }
      } catch (err: any) {
        console.error('VoiceResponseService: Error synthesizing TTS:', err);
        this.emit('voice.ai.tts.error', {
          responseId,
          sessionId,
          turnId,
          error: err.message || 'TTS Synthesis Failure'
        });
      } finally {
        this.lock.release(responseId);
        this.activeCancellations.delete(responseId);
        this.activeControllers.delete(responseId);
        
        metric.endTime = Date.now();
        console.log(`[Langfuse Trace] Voice Turn Metrics:`, {
          traceId: metric.traceId || `trace_voice_${responseId}`,
          responseId,
          sessionId,
          turnId,
          personaId,
          metrics: {
            timeToFirstAudioMs: metric.firstAudioTime ? (metric.firstAudioTime - metric.startTime) : null,
            totalSynthesisDurationMs: metric.endTime - metric.startTime,
            chunksCount: metric.chunksCount,
            cancelled: metric.cancelled
          }
        });
      }
    })();

    return responseId;
  }

  public async cancel(responseId: string): Promise<void> {
    this.activeCancellations.add(responseId);
    const controller = this.activeControllers.get(responseId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(responseId);
    }
    await this.ttsProvider.cancel(responseId);
    this.lock.release(responseId);
    
    // Find metric and mark cancelled
    const m = this.metrics.find(x => x.responseId === responseId);
    if (m) m.cancelled = true;
  }
}
