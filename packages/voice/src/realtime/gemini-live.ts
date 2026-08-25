import { EventEmitter } from 'events';
import WebSocket from 'ws';

export class GeminiLiveBridge extends EventEmitter {
  private socket: WebSocket | null = null;
  private apiKey: string;
  private isConnected: boolean = false;
  private responseId: string = '';
  private sequenceNumber: number = 0;
  private activeSystemInstruction: string = '';

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  public connect(systemInstruction: string = '') {
    this.activeSystemInstruction = systemInstruction || 
      'You are a helpful boardroom panelist. Respond expressively, concisely, and accurately in audio form.';
    
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
    
    console.log('GeminiLiveBridge: Connecting to Gemini Live API WebSocket...');
    this.socket = new WebSocket(wsUrl);

    this.socket.on('open', () => {
      console.log('GeminiLiveBridge: WebSocket connection opened.');
      this.isConnected = true;
      this.sendSetupMessage();
    });

    this.socket.on('message', (data: any) => {
      this.handleMessage(data);
    });

    this.socket.on('close', (code: number, reason: string) => {
      console.log(`GeminiLiveBridge: WebSocket connection closed: code=${code}, reason=${reason}`);
      this.isConnected = false;
      this.emit('close');
    });

    this.socket.on('error', (err: any) => {
      console.error('GeminiLiveBridge: WebSocket error:', err);
      this.emit('error', err);
    });
  }

  private sendSetupMessage() {
    if (!this.socket || this.socket.readyState !== 1) return; // 1 is OPEN

    const setupMsg = {
      setup: {
        model: 'models/gemini-2.0-flash-exp',
        generationConfig: {
          responseModalities: ['audio'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Puck' // Kore, Puck, Charon, Fenrir, Aoede
              }
            }
          }
        },
        systemInstruction: {
          parts: [
            {
              text: this.activeSystemInstruction
            }
          ]
        }
      }
    };

    console.log('GeminiLiveBridge: Sending setup message...');
    this.socket.send(JSON.stringify(setupMsg));
  }

  private handleMessage(data: any) {
    try {
      const msgStr = typeof data === 'string' ? data : data.toString();
      const parsed = JSON.parse(msgStr);

      if (parsed.serverContent) {
        const { modelTurn, turnComplete, interrupted } = parsed.serverContent;

        if (interrupted) {
          console.log('GeminiLiveBridge: Interrupted by user.');
          this.emit('interrupted');
          return;
        }

        if (modelTurn && modelTurn.parts) {
          // Initialize responseId and sequenceNumber for new response
          if (!this.responseId) {
            this.responseId = `res_live_${Date.now()}`;
            this.sequenceNumber = 0;
            this.emit('response.started', { responseId: this.responseId });
          }

          for (const part of modelTurn.parts) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
              const audioBase64 = part.inlineData.data;
              const buffer = Buffer.from(audioBase64, 'base64');
              
              this.sequenceNumber++;
              this.emit('audio.chunk', {
                responseId: this.responseId,
                sequenceNumber: this.sequenceNumber,
                isFinal: false,
                audio: buffer,
                sampleRate: 24000 // Gemini Live standard output is 24kHz PCM
              });
            }

            if (part.text) {
              this.emit('transcript.partial', { text: part.text });
            }
          }
        }

        if (turnComplete) {
          console.log('GeminiLiveBridge: Turn completed.');
          if (this.responseId) {
            this.emit('audio.chunk', {
              responseId: this.responseId,
              sequenceNumber: this.sequenceNumber + 1,
              isFinal: true,
              audio: Buffer.alloc(0),
              sampleRate: 24000
            });
            this.emit('response.completed', { responseId: this.responseId });
            this.responseId = '';
          }
        }
      }
    } catch (err) {
      console.error('GeminiLiveBridge: Error parsing message:', err);
    }
  }

  public sendAudioChunk(pcm16Buffer: Buffer) {
    if (!this.socket || this.socket.readyState !== 1) {
      console.warn('GeminiLiveBridge: Cannot send audio chunk, WebSocket is not open.');
      return;
    }

    const payload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: pcm16Buffer.toString('base64')
          }
        ]
      }
    };

    this.socket.send(JSON.stringify(payload));
  }

  public close() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (err) {}
      this.socket = null;
    }
    this.isConnected = false;
  }
}
