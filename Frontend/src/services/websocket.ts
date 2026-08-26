export interface SimulationEvent<T = any> {
  eventId: string;
  sessionId: number | string;
  turnId?: string;
  timestamp: number;
  source: 'user' | 'agent' | 'orchestrator' | 'system' | 'tool' | 'voice';
  type: string;
  payload: T;
  traceId?: string;
}

export interface UnpackedAudioFrame {
  sequenceNumber: number;
  isFinal: boolean;
  sampleRate: number;
  responseId: string;
  audio: ArrayBuffer;
}

function unpackAudioFrame(arrayBuffer: ArrayBuffer): UnpackedAudioFrame {
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
  private sessionId: string | number;
  private onEventCallback: (event: SimulationEvent) => void;
  private onStateChangeCallback: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
  private onBinaryChunkCallback?: (unpacked: UnpackedAudioFrame) => void;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;
  private isExplicitlyClosed = false;

  constructor(
    sessionId: string | number,
    onEvent: (event: SimulationEvent) => void,
    onStateChange: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void,
    onBinaryChunk?: (unpacked: UnpackedAudioFrame) => void
  ) {
    this.sessionId = sessionId;
    this.onEventCallback = onEvent;
    this.onStateChangeCallback = onStateChange;
    this.onBinaryChunkCallback = onBinaryChunk;
  }

  public connect() {
    this.isExplicitlyClosed = false;
    this.onStateChangeCallback('connecting');
    const wsUrl = `ws://localhost:3000/ws/sessions/${this.sessionId}`;

    try {
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log(`[WebSocket] Connected to session ${this.sessionId}`);
        this.reconnectAttempts = 0;
        this.onStateChangeCallback('connected');
      };

      this.socket.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          if (this.onBinaryChunkCallback) {
            const unpacked = unpackAudioFrame(event.data);
            this.onBinaryChunkCallback(unpacked);
          }
          return;
        }

        try {
          const parsed = JSON.parse(event.data);
          this.onEventCallback(parsed);
        } catch (err) {
          console.warn('[WebSocket] Non-JSON payload received:', event.data);
        }
      };

      this.socket.onerror = (error) => {
        console.warn(`[WebSocket] Error on session ${this.sessionId}:`, error);
        this.onStateChangeCallback('error');
      };

      this.socket.onclose = () => {
        this.onStateChangeCallback('disconnected');
        if (!this.isExplicitlyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
          console.log(`[WebSocket] Disconnected. Reconnecting in ${timeout}ms (attempt ${this.reconnectAttempts})...`);
          this.reconnectTimer = window.setTimeout(() => this.connect(), timeout);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Failed to instantiate WebSocket:', err);
      this.onStateChangeCallback('error');
    }
  }

  public send(event: { type: string; payload?: any }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send, socket is not open');
      return;
    }

    const envelope = {
      eventId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      source: 'user',
      type: event.type,
      payload: event.payload || {},
    };

    this.socket.send(JSON.stringify(envelope));
  }

  public sendBinary(buffer: ArrayBuffer) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(buffer);
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
