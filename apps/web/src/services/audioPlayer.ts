export interface PlaybackChunk {
  responseId: string;
  sequenceNumber: number;
  audioData: Float32Array;
  isFinal: boolean;
  sampleRate: number;
}

export class VoiceAudioPlayer {
  private audioContext: AudioContext | null = null;
  private activeResponseId: string | null = null;
  private queue: PlaybackChunk[] = [];
  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlaybackTime: number = 0;
  private state: 'EMPTY' | 'BUFFERING' | 'PLAYING' | 'STOPPING' | 'CANCELLED' = 'EMPTY';
  private expectedSequenceNumber: number = 0;

  constructor() {
    this.audioContext = null;
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public start() {
    this.initAudioContext();
    this.state = 'PLAYING';
    this.processQueue();
  }

  public enqueue(responseId: string, sequenceNumber: number, pcm16Buffer: ArrayBuffer, isFinal: boolean, sampleRate: number = 16000) {
    this.initAudioContext();

    // Sequence validation & stale audio protection
    if (this.activeResponseId && responseId !== this.activeResponseId) {
      this.flush();
      this.activeResponseId = responseId;
      this.expectedSequenceNumber = 0;
    } else if (!this.activeResponseId) {
      this.activeResponseId = responseId;
      this.expectedSequenceNumber = 0;
    }

    if (sequenceNumber < this.expectedSequenceNumber) {
      console.warn(`VoiceAudioPlayer: Rejecting out-of-order chunk seq=${sequenceNumber}, expected=${this.expectedSequenceNumber}`);
      return;
    }

    // Convert PCM16 arraybuffer to Float32 samples
    const pcm16 = new Int16Array(pcm16Buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768.0;
    }

    // Check for duplicates
    if (this.queue.some(c => c.sequenceNumber === sequenceNumber)) {
      return;
    }

    this.queue.push({
      responseId,
      sequenceNumber,
      audioData: float32,
      isFinal,
      sampleRate
    });

    this.queue.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    if (this.state === 'EMPTY' || this.state === 'BUFFERING') {
      if (this.queue.length >= 1 || isFinal) {
        this.state = 'PLAYING';
        this.processQueue();
      } else {
        this.state = 'BUFFERING';
      }
    } else if (this.state === 'PLAYING') {
      this.processQueue();
    }
  }

  private processQueue() {
    if (!this.audioContext || this.state !== 'PLAYING') return;

    while (this.queue.length > 0) {
      const nextChunk = this.queue[0];
      
      if (nextChunk.sequenceNumber !== this.expectedSequenceNumber) {
        this.state = 'BUFFERING';
        break;
      }

      this.queue.shift();
      this.expectedSequenceNumber++;

      this.playAudioData(nextChunk.audioData, nextChunk.sampleRate);

      if (nextChunk.isFinal && this.queue.length === 0) {
        this.state = 'EMPTY';
      }
    }
  }

  private playAudioData(float32: Float32Array, sampleRate: number) {
    if (!this.audioContext) return;

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const startTime = Math.max(now, this.nextPlaybackTime);
    
    source.start(startTime);
    this.activeSources.push(source);
    
    this.nextPlaybackTime = startTime + audioBuffer.duration;

    source.onended = () => {
      this.activeSources = this.activeSources.filter(s => s !== source);
    };
  }

  public flush() {
    this.activeSources.forEach(source => {
      try {
        source.stop();
      } catch (e) {}
    });
    this.activeSources = [];
    this.queue = [];
    this.nextPlaybackTime = 0;
    this.expectedSequenceNumber = 0;
  }

  public cancel(responseId: string) {
    if (this.activeResponseId === responseId || !responseId) {
      this.flush();
      this.activeResponseId = null;
      this.state = 'CANCELLED';
    }
  }

  public getState() {
    return this.state;
  }
}
