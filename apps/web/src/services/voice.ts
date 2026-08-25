export class VoiceAudioService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;

  private activeSources: AudioBufferSourceNode[] = [];
  private nextPlaybackTime: number = 0;

  // Client-side VAD state
  private isSpeaking: boolean = false;
  private silenceFrames: number = 0;
  private speechFrames: number = 0;

  // VAD thresholds — noise floor observed at RMS ~0.005, speech at 0.007–0.012
  private readonly RMS_SPEECH_THRESHOLD = 0.007;  // above = active speech (above noise floor)
  private readonly SPEECH_FRAMES_TO_START = 4;    // ~340ms of speech to trigger
  private readonly SILENCE_FRAMES_TO_STOP = 18;   // ~1.5s below speech threshold to end turn
  private lastSpeechStartTime: number = 0;
  private readonly SPEECH_START_COOLDOWN_MS = 2000; // prevent rapid re-triggering

  private onAudioChunkCallback: (pcmData: ArrayBuffer) => void;
  private onSpeechStartCallback: () => void;
  private onSpeechEndCallback: () => void;

  constructor(
    onAudioChunk: (pcmData: ArrayBuffer) => void,
    onSpeechStart: () => void = () => {},
    onSpeechEnd: () => void = () => {}
  ) {
    this.onAudioChunkCallback = onAudioChunk;
    this.onSpeechStartCallback = onSpeechStart;
    this.onSpeechEndCallback = onSpeechEnd;
  }

  public async startRecording(): Promise<void> {
    console.log('VoiceAudioService: Requesting microphone permission...');
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    console.log('VoiceAudioService: Mic acquired. Starting client-side VAD...');
    this.mediaStreamSource = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

    const fromRate = this.audioContext.sampleRate;
    const toRate = 16000;

    // Reset VAD state
    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.speechFrames = 0;

    let chunkCount = 0;

    this.processorNode.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);

      // Compute RMS energy
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);

      // --- Client-side VAD state machine ---
      if (rms > this.RMS_SPEECH_THRESHOLD) {
        // Active speech detected
        this.speechFrames++;
        this.silenceFrames = 0;

        if (!this.isSpeaking && this.speechFrames >= this.SPEECH_FRAMES_TO_START) {
          const now = Date.now();
          // Cooldown: don't re-trigger within 2s of last speech start
          if (now - this.lastSpeechStartTime < this.SPEECH_START_COOLDOWN_MS) {
            // Skip — still in cooldown
          } else {
            this.isSpeaking = true;
            this.speechFrames = 0;
            this.lastSpeechStartTime = now;
            console.log(`[VAD] 🎤 Speech STARTED (rms=${rms.toFixed(4)})`);
            this.onSpeechStartCallback();
          }
        }
      } else {
        // Any frame below speech threshold counts as silence (handles high noise floors)
        this.silenceFrames++;
        this.speechFrames = 0;

        if (this.isSpeaking && this.silenceFrames >= this.SILENCE_FRAMES_TO_STOP) {
          this.isSpeaking = false;
          this.silenceFrames = 0;
          console.log(`[VAD] 🔇 Speech ENDED (rms=${rms.toFixed(4)})`);
          this.onSpeechEndCallback();
        }
      }

      // Always resample and stream audio to server
      const resampled = this.resample(inputData, fromRate, toRate);
      const pcm16 = this.floatTo16BitPCM(resampled);

      chunkCount++;
      if (chunkCount % 50 === 0) {
        console.log(`[MIC] chunk #${chunkCount} rms=${rms.toFixed(4)} speaking=${this.isSpeaking}`);
      }

      this.onAudioChunkCallback(pcm16.buffer);
    };

    this.mediaStreamSource.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
    console.log('VoiceAudioService: Graph connected. Listening for voice...');
  }

  public stopRecording(): void {
    this.isSpeaking = false;
    this.silenceFrames = 0;
    this.speechFrames = 0;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  public playChunk(base64Audio: string): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer, bytes.byteOffset, len / 2);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0;

    const audioBuffer = this.audioContext.createBuffer(1, float32.length, 16000);
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
      this.activeSources = this.activeSources.filter((s) => s !== source);
    };
  }

  public flushPlaybackQueue(): void {
    this.activeSources.forEach((source) => {
      try { source.stop(); } catch (e) { /* already stopped */ }
    });
    this.activeSources = [];
    this.nextPlaybackTime = 0;
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const newLength = Math.round(input.length / ratio);
    const result = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      result[i] = input[Math.min(input.length - 1, Math.round(i * ratio))];
    }
    return result;
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }
}
