import { EventEmitter } from 'events';
import { AudioFrame, StreamingSTT } from '../../types.js';

export class WhisperStreamingSTT extends EventEmitter implements StreamingSTT {
  private turnId: string = '';
  private sequenceNumber: number = 0;
  private audioBuffers: Buffer[] = [];
  private accumulatedBytes: number = 0;
  private targetTranscript: string = '';
  private words: string[] = [];
  private isCancelled: boolean = false;
  private isStopped: boolean = false;

  public async start(turnId: string): Promise<void> {
    this.turnId = turnId;
    this.sequenceNumber = 0;
    this.audioBuffers = [];
    this.accumulatedBytes = 0;
    this.isCancelled = false;
    this.isStopped = false;

    // Use deterministic mock transcript or default text
    this.targetTranscript = process.env.MOCK_STT_TRANSCRIPT || 
      'During a team project, we had a disagreement about how to implement one of the major features. We balanced the deadline with code quality and completed the feature on time.';
    
    this.words = this.targetTranscript.split(' ');
  }

  public async pushAudio(frame: AudioFrame): Promise<void> {
    if (this.isCancelled || this.isStopped) return;

    this.sequenceNumber++;
    this.audioBuffers.push(frame.data);
    this.accumulatedBytes += frame.data.length;

    // Only emit simulated partials in mock test mode
    if (process.env.VAD_TEST_MOCK === 'true') {
      const wordsToEmit = Math.min(this.words.length, Math.ceil(this.sequenceNumber * 1.5));
      const partialText = this.words.slice(0, wordsToEmit).join(' ');

      this.emit('partial', {
        turnId: this.turnId,
        text: partialText,
        isFinal: false,
        sequenceNumber: this.sequenceNumber
      });
    }
  }

  public async stop(): Promise<void> {
    if (this.isStopped || this.isCancelled) return;
    this.isStopped = true;

    // In mock test mode, return target transcript directly
    if (process.env.VAD_TEST_MOCK === 'true') {
      this.emit('final', {
        turnId: this.turnId,
        text: this.targetTranscript,
        isFinal: true
      });
      return;
    }

    if (process.env.XAI_API_KEY && this.accumulatedBytes > 0) {
      try {
        const wavBuffer = this.createWavFile();
        const text = await this.transcribeWav(wavBuffer);
        this.emit('final', {
          turnId: this.turnId,
          text,
          isFinal: true
        });
        return;
      } catch (err: any) {
        this.emit('error', err);
        return;
      }
    }

    this.emit('final', {
      turnId: this.turnId,
      text: '',
      isFinal: true
    });
  }

  public async cancel(): Promise<void> {
    this.isCancelled = true;
    this.audioBuffers = [];
    this.accumulatedBytes = 0;
  }

  private createWavFile(): Buffer {
    const rawPcm = Buffer.concat(this.audioBuffers);
    const header = Buffer.alloc(44);
    
    // RIFF identifier
    header.write('RIFF', 0);
    // File length (36 + data size)
    header.writeUInt32LE(36 + rawPcm.length, 4);
    // RIFF type
    header.write('WAVE', 8);
    // Format chunk identifier
    header.write('fmt ', 12);
    // Format chunk length (16)
    header.writeUInt32LE(16, 16);
    // Audio format (1 = PCM)
    header.writeUInt16LE(1, 20);
    // Channels (1 = Mono)
    header.writeUInt16LE(1, 22);
    // Sample rate (16000)
    header.writeUInt32LE(16000, 24);
    // Byte rate (16000 * 1 channel * 2 bytes/sample = 32000)
    header.writeUInt32LE(32000, 28);
    // Block align (1 channel * 2 bytes = 2)
    header.writeUInt16LE(2, 32);
    // Bits per sample (16)
    header.writeUInt16LE(16, 34);
    // Data chunk identifier
    header.write('data', 36);
    // Data chunk length
    header.writeUInt32LE(rawPcm.length, 40);

    return Buffer.concat([header, rawPcm]);
  }

  private async transcribeWav(wavBuffer: Buffer): Promise<string> {
    const boundary = '----WebKitFormBoundarySTT' + Math.random().toString(36).substring(2);
    
    // Build multipart/form-data payload manually to avoid dependencies
    const parts = [
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
      wavBuffer,
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-large-v3\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${process.env.STT_LANGUAGE || 'en'}\r\n`,
      `--${boundary}--\r\n`
    ];

    let bodyLength = 0;
    for (const part of parts) {
      bodyLength += typeof part === 'string' ? Buffer.byteLength(part) : part.length;
    }

    const requestBody = Buffer.concat(
      parts.map(part => typeof part === 'string' ? Buffer.from(part) : part)
    );

    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: requestBody
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Whisper transcription failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.text || '';
  }
}
