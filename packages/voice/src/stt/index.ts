import { EventEmitter } from 'events';
import { AudioFrame, StreamingSTT } from '../types.js';
import { WhisperStreamingSTT } from './providers/whisper.js';

export class MockStreamingSTT extends EventEmitter implements StreamingSTT {
  private turnId: string = '';
  private sequenceNumber: number = 0;

  public async start(turnId: string): Promise<void> {
    this.turnId = turnId;
    this.sequenceNumber = 0;
  }

  public async pushAudio(frame: AudioFrame): Promise<void> {
    this.sequenceNumber++;
    if (this.sequenceNumber % 10 === 0) {
      this.emit('partial', {
        turnId: this.turnId,
        text: 'I am explaining...',
        isFinal: false,
        sequenceNumber: this.sequenceNumber
      });
    }
  }

  public async stop(): Promise<void> {
    const mockTranscript = process.env.MOCK_STT_TRANSCRIPT || 
      'During a team project, we had a disagreement about how to implement one of the major features. We balanced the deadline with code quality and completed the feature on time.';

    this.emit('final', {
      turnId: this.turnId,
      text: mockTranscript,
      isFinal: true
    });
  }

  public async cancel(): Promise<void> {
    this.emit('partial', {
      turnId: this.turnId,
      text: '[Cancelled]',
      isFinal: false
    });
  }
}

export function createStreamingSTT(provider: string): StreamingSTT {
  const p = provider ? provider.toLowerCase() : 'mock';
  if (p === 'whisper') {
    return new WhisperStreamingSTT();
  }
  return new MockStreamingSTT();
}
