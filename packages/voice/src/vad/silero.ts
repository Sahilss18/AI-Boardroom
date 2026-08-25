import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import * as ort from 'onnxruntime-node';
import { AudioFrame, VADResult, VoiceActivityDetector } from '../types.js';

const InferenceSession = (ort as any).InferenceSession || (ort as any).default?.InferenceSession;
const Tensor = (ort as any).Tensor || (ort as any).default?.Tensor;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SILERO_MODEL_URL = 'https://raw.githubusercontent.com/snakers4/silero-vad/master/src/silero_vad/data/silero_vad.onnx';
const MODEL_DIR = path.resolve(__dirname, '../../resources');
const MODEL_PATH = path.join(MODEL_DIR, 'silero_vad.onnx');

async function ensureModelDownloaded(): Promise<string> {
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }
  if (fs.existsSync(MODEL_PATH)) {
    return MODEL_PATH;
  }
  console.log(`Downloading Silero VAD model from ${SILERO_MODEL_URL}...`);
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(MODEL_PATH);
    https.get(SILERO_MODEL_URL, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download Silero model: HTTP status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Model cached at ${MODEL_PATH}`);
        resolve(MODEL_PATH);
      });
    }).on('error', (err) => {
      fs.unlink(MODEL_PATH, () => {});
      reject(err);
    });
  });
}

let sharedSession: any = null;
let sharedSessionPromise: Promise<any> | null = null;

async function getSharedSession(): Promise<any> {
  if (sharedSession) return sharedSession;
  if (sharedSessionPromise) return sharedSessionPromise;
  
  sharedSessionPromise = (async () => {
    const modelPath = await ensureModelDownloaded();
    sharedSession = await InferenceSession.create(modelPath);
    return sharedSession;
  })();
  
  return sharedSessionPromise;
}

export class SileroVoiceActivityDetector implements VoiceActivityDetector {
  private session: any = null;
  private state: any = null;
  private speechThreshold: number;
  private minSilenceDurationMs: number;
  private minSpeechDurationMs: number;

  private isSpeaking: boolean = false;
  private sampleBuffer: number[] = [];
  private continuousSpeechDurationMs: number = 0;
  private continuousSilenceDurationMs: number = 0;

  private rmsSpeechThreshold: number;
  private rmsSilenceThreshold: number;

  constructor() {
    this.speechThreshold = parseFloat(process.env.VAD_SPEECH_THRESHOLD || '0.5');
    this.minSilenceDurationMs = parseInt(process.env.VAD_SPEECH_END_SILENCE_DURATION_MS || '600', 10);
    this.minSpeechDurationMs = parseInt(process.env.VAD_SPEECH_START_MIN_DURATION_MS || '100', 10);
    // RMS thresholds for fallback detection when Silero underestimates quiet mics
    this.rmsSpeechThreshold = parseFloat(process.env.VAD_RMS_SPEECH_THRESHOLD || '0.004');
    this.rmsSilenceThreshold = parseFloat(process.env.VAD_RMS_SILENCE_THRESHOLD || '0.002');
  }

  private async initSession(): Promise<any> {
    if (this.session) return this.session;
    this.session = await getSharedSession();
    this.resetStates();
    return this.session;
  }

  private resetStates() {
    this.state = new Tensor('float32', new Float32Array(2 * 1 * 128), [2, 1, 128]);
    this.sampleBuffer = [];
  }

  public async process(frame: AudioFrame): Promise<VADResult> {
    const session = await this.initSession();

    // Malformed and sample rate checks
    if (!frame.data || frame.data.length % 2 !== 0) {
      throw new Error('Malformed audio: frame data size is incorrect.');
    }
    if (frame.sampleRate !== 16000 && frame.sampleRate !== 8000) {
      throw new Error(`Silero VAD unsupported sample rate: ${frame.sampleRate} Hz.`);
    }

    // Convert PCM16 buffer to Float32 array
    const buffer = frame.data;
    let samples: Int16Array;
    if (buffer.byteOffset % 2 === 0) {
      samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
    } else {
      const aligned = Buffer.from(buffer);
      samples = new Int16Array(aligned.buffer, aligned.byteOffset, aligned.byteLength / 2);
    }
    for (let i = 0; i < samples.length; i++) {
      this.sampleBuffer.push(samples[i] / 32768.0);
    }

    let speechStarted = false;
    let speechEnded = false;
    let lastProb = 0;

    // Silero strictly requires chunks of 512, 1024, or 1536 samples at 16kHz
    // We process in 512-sample chunks (32ms at 16kHz)
    while (this.sampleBuffer.length >= 512) {
      const chunk = new Float32Array(this.sampleBuffer.slice(0, 512));
      this.sampleBuffer = this.sampleBuffer.slice(512);

      const inputs = {
        input: new Tensor('float32', chunk, [1, 512]),
        sr: new Tensor('int64', new BigInt64Array([BigInt(frame.sampleRate)]), [1]),
        state: this.state!
      };

      const result = await session.run(inputs);
      let prob = (result.output.data as Float32Array)[0];
      
      // Compute RMS energy for fallback detection
      let sum = 0;
      for (let i = 0; i < chunk.length; i++) {
        sum += chunk[i] * chunk[i];
      }
      const rms = Math.sqrt(sum / chunk.length);

      // RMS-based fallback: override Silero when mic levels are low but above noise floor.
      // This handles microphones where Silero underestimates speech probability.
      if (rms > this.rmsSpeechThreshold) {
        // Above speech threshold → force speech detection
        prob = Math.max(prob, 0.95);
      } else if (rms < this.rmsSilenceThreshold) {
        // Clearly silent → suppress any Silero false positives
        prob = Math.min(prob, 0.1);
      }
      // Between the two thresholds: trust Silero's native probability

      console.log(`[VAD] rms=${rms.toFixed(4)} sileroProb=${(result.output.data as Float32Array)[0].toFixed(3)} finalProb=${prob.toFixed(3)}`);


      lastProb = prob;
      this.state = result.stateN;

      const chunkDurationMs = (512 / frame.sampleRate) * 1000;

      if (prob > this.speechThreshold) {
        this.continuousSilenceDurationMs = 0;
        this.continuousSpeechDurationMs += chunkDurationMs;

        if (!this.isSpeaking && this.continuousSpeechDurationMs >= this.minSpeechDurationMs) {
          this.isSpeaking = true;
          speechStarted = true;
        }
      } else {
        this.continuousSpeechDurationMs = 0;
        this.continuousSilenceDurationMs += chunkDurationMs;

        if (this.isSpeaking && this.continuousSilenceDurationMs >= this.minSilenceDurationMs) {
          this.isSpeaking = false;
          speechEnded = true;
        }
      }
    }

    return {
      isSpeech: this.isSpeaking,
      speechStarted,
      speechEnded,
      confidence: lastProb
    };
  }

  public reset(): void {
    this.resetStates();
    this.isSpeaking = false;
    this.continuousSpeechDurationMs = 0;
    this.continuousSilenceDurationMs = 0;
  }
}
