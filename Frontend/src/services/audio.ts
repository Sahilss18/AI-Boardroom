/**
 * Audio Engine:
 * - 16kHz Mono PCM Microphone Capture
 * - Linear PCM Audio Queue Playback with smooth crossfades
 * - Barge-In Interruption Flushing
 * - Real-time Audio Visualizer Analyser Node
 */

export class AudioManager {
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private onAudioChunk?: (pcm16Buffer: ArrayBuffer) => void;
  private onVolumeChange?: (volume: number) => void;

  // Playback Queue
  private playbackContext: AudioContext | null = null;
  private playbackAnalyser: AnalyserNode | null = null;
  private nextPlayTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  constructor() {}

  // 1. Microphone Capture
  public async startRecording(
    onAudioChunk: (pcm16Buffer: ArrayBuffer) => void,
    onVolumeChange?: (volume: number) => void
  ): Promise<boolean> {
    try {
      this.onAudioChunk = onAudioChunk;
      this.onVolumeChange = onVolumeChange;

      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;

      this.micSource = this.audioContext.createMediaStreamSource(this.micStream);
      this.micSource.connect(this.analyserNode);

      // ScriptProcessorNode for raw PCM extraction
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);
      this.analyserNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isRecording) return;
        const inputData = e.inputBuffer.getChannelData(0);

        // Convert Float32Array [-1.0, 1.0] to Int16Array PCM
        const pcm16 = new Int16Array(inputData.length);
        let sumSquares = 0;
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          sumSquares += s * s;
        }

        const rms = Math.sqrt(sumSquares / inputData.length);
        if (this.onVolumeChange) {
          this.onVolumeChange(Math.min(1, rms * 5));
        }

        if (this.onAudioChunk) {
          this.onAudioChunk(pcm16.buffer);
        }
      };

      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('[AudioManager] Failed to access microphone:', err);
      return false;
    }
  }

  public stopRecording() {
    this.isRecording = false;
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.micSource) {
      this.micSource.disconnect();
      this.micSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  // 2. Audio Playback Queue
  public initPlayback() {
    if (!this.playbackContext || this.playbackContext.state === 'closed') {
      this.playbackContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });
      this.playbackAnalyser = this.playbackContext.createAnalyser();
      this.playbackAnalyser.fftSize = 128;
      this.playbackAnalyser.connect(this.playbackContext.destination);
      this.nextPlayTime = this.playbackContext.currentTime;
    }
  }

  public queuePcmAudio(pcmData: ArrayBuffer, sampleRate = 24000) {
    this.initPlayback();
    if (!this.playbackContext) return;

    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }

    const int16Array = new Int16Array(pcmData);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.playbackContext.createBuffer(1, float32Array.length, sampleRate);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.playbackContext.createBufferSource();
    source.buffer = audioBuffer;

    if (this.playbackAnalyser) {
      source.connect(this.playbackAnalyser);
    } else {
      source.connect(this.playbackContext.destination);
    }

    const currentTime = this.playbackContext.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    source.start(startTime);
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.activeSources.push(source);
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
    };
  }

  /**
   * Barge-In: Flushes all currently queued and playing AI speech immediately
   */
  public flushPlayback() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (err) {
        // Source might have already finished
      }
    }
    this.activeSources = [];
    if (this.playbackContext) {
      this.nextPlayTime = this.playbackContext.currentTime;
    }
  }

  public getPlaybackVolume(): number {
    if (!this.playbackAnalyser) return 0;
    const dataArray = new Uint8Array(this.playbackAnalyser.frequencyBinCount);
    this.playbackAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / (dataArray.length * 255);
  }
}

export const audioManager = new AudioManager();
