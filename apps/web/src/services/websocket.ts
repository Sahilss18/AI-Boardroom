import type { SimulationEvent } from '@reflection-ai/shared';

function unpackAudioFrame(arrayBuffer: ArrayBuffer) {
  const view = new DataView(arrayBuffer);
  const sequenceNumber = view.getUint32(0, true);
  const isFinal = view.getUint32(4, true) === 1;
  const sampleRate = view.getUint32(8, true);
  
  const decoder = new TextDecoder('utf-8');
  const respIdBytes = new Uint8Array(arrayBuffer, 12, 32);
  let end = respIdBytes.indexOf(0);
  if (end === -1) end = 32;
  const responseId = decoder.decode(respIdBytes.subarray(0, end)).trim();
  
  const audio = arrayBuffer.slice(44);
  
  return { sequenceNumber, isFinal, sampleRate, responseId, audio };
}

export class SimulationWebSocketClient {
  private socket: WebSocket | null = null;
  private sessionId: string;
  private onEventCallback: (event: SimulationEvent) => void;
  private onStateChangeCallback: (state: 'connecting' | 'connected' | 'disconnected') => void;
  private onBinaryChunkCallback?: (responseId: string, sequenceNumber: number, audio: ArrayBuffer, isFinal: boolean, sampleRate: number) => void;

  constructor(
    sessionId: string,
    onEvent: (event: SimulationEvent) => void,
    onStateChange: (state: 'connecting' | 'connected' | 'disconnected') => void,
    onBinaryChunk?: (responseId: string, sequenceNumber: number, audio: ArrayBuffer, isFinal: boolean, sampleRate: number) => void
  ) {
    this.sessionId = sessionId;
    this.onEventCallback = onEvent;
    this.onStateChangeCallback = onStateChange;
    this.onBinaryChunkCallback = onBinaryChunk;
  }

  public connect() {
    this.onStateChangeCallback('connecting');
    const wsUrl = `ws://localhost:3000/ws/sessions/${this.sessionId}`;
    
    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log(`WebSocket connected to session ${this.sessionId}`);
        this.onStateChangeCallback('connected');
      };

      this.socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (this.onBinaryChunkCallback) {
            const unpacked = unpackAudioFrame(event.data);
            this.onBinaryChunkCallback(unpacked.responseId, unpacked.sequenceNumber, unpacked.audio, unpacked.isFinal, unpacked.sampleRate);
          }
          return;
        }

        try {
          const parsedEvent = JSON.parse(event.data) as SimulationEvent;
          this.onEventCallback(parsedEvent);
        } catch (err) {
          console.error('Failed to parse incoming WebSocket event message:', err);
        }
      };

      this.socket.onclose = () => {
        console.log(`WebSocket connection closed for session ${this.sessionId}`);
        this.onStateChangeCallback('disconnected');
      };

      this.socket.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.onStateChangeCallback('disconnected');
      };
    } catch (error) {
      console.error('Failed to instantiate WebSocket:', error);
      this.onStateChangeCallback('disconnected');
    }
  }

  public sendText(text: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket connection is not open.');
    }

    const payload = {
      type: 'user.text',
      payload: { text },
    };

    this.socket.send(JSON.stringify(payload));
  }

  public sendAudioChunk(pcmBuffer: ArrayBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(pcmBuffer);
  }

  public sendControlEvent(type: string, payload: any = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify({ type, payload }));
  }

  public close() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
