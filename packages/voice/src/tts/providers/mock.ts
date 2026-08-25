import { StreamingTTS, TTSAudioChunk, TTSOptions } from '../../types.js';

export class MockStreamingTTS implements StreamingTTS {
  private activeCancellations: Set<string> = new Set();

  public async *synthesize(
    text: string,
    options: TTSOptions
  ): AsyncIterable<TTSAudioChunk> {
    const { responseId } = options;
    this.activeCancellations.delete(responseId);

    // Segment text by sentence punctuation (. ! ?)
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

    for (let i = 0; i < sentences.length; i++) {
      if (this.activeCancellations.has(responseId) || options.abortSignal?.aborted) {
        console.log(`MockStreamingTTS: synthesis cancelled for responseId ${responseId}`);
        break;
      }

      // Simulate a small network / synthesis processing delay (150ms)
      const signal = options.abortSignal;
      if (signal) {
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              signal.removeEventListener('abort', onAbort);
              resolve();
            }, 150);
            const onAbort = () => {
              clearTimeout(timeout);
              reject(new Error('AbortError'));
            };
            signal.addEventListener('abort', onAbort);
          });
        } catch (e) {
          break;
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      const sentence = sentences[i];
      // Generate a 400ms PCM16 16kHz mono sine wave at 440Hz (A4) so user can actually hear it
      const sampleRate = 16000;
      const duration = 0.4; // 400ms
      const numSamples = sampleRate * duration;
      const audioBuffer = Buffer.alloc(numSamples * 2); // 16-bit samples

      // Tone frequency varies slightly per sentence for distinction
      const frequency = 350 + (i * 50); 
      for (let j = 0; j < numSamples; j++) {
        const sample = Math.sin(2 * Math.PI * frequency * (j / sampleRate));
        const val = Math.round(sample * 16384); // Modulate amplitude to be soft
        audioBuffer.writeInt16LE(val, j * 2);
      }

      yield {
        responseId,
        sequenceNumber: i,
        audio: audioBuffer,
        sampleRate,
        channels: 1,
        encoding: 'pcm16',
        isFinal: i === sentences.length - 1
      };
    }
  }

  public async cancel(responseId: string): Promise<void> {
    this.activeCancellations.add(responseId);
  }

  public async close(): Promise<void> {
    this.activeCancellations.clear();
  }
}
