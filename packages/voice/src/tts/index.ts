import { StreamingTTS } from '../types.js';
import { MockStreamingTTS } from './providers/mock.js';

export function segmentText(text: string): string[] {
  // Split text by sentence punctuation (. ! ?) followed by whitespace
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

export function createStreamingTTS(provider: string): StreamingTTS {
  if (provider === 'mock' || !provider) {
    return new MockStreamingTTS();
  }
  // Default fallback is mock
  return new MockStreamingTTS();
}

export { MockStreamingTTS };
