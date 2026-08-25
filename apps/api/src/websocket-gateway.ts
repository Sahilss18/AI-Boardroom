import { FastifyRequest } from 'fastify';
import { simulationGraph } from '@reflection-ai/orchestration';
import { SimulationEvent } from '@reflection-ai/shared';
import { VoiceActivityDetector, createVoiceActivityDetector, createStreamingSTT, VoiceResponseService, GeminiLiveBridge } from '@reflection-ai/voice';
import { PersonaRepository } from '@reflection-ai/database';

// Registry of active websocket connections mapped by sessionId
const activeConnections: Record<string, Set<any>> = {};

interface SessionVoiceContext {
  state: 'IDLE' | 'LISTENING' | 'USER_SPEAKING' | 'USER_SILENCE' | 'PROCESSING' | 'AI_SPEAKING' | 'INTERRUPTED' | 'ERROR';
  vad: VoiceActivityDetector;
  stt: any;
  responseService: VoiceResponseService;
  currentTurnId: string;
  activeResponseId: string | null;
  processedTurns: Set<string>;
  audioQueueDepth: number;
  audioQueueBytes: number;
  droppedAudioFrames: number;
  voiceConnectionId: string;
  audioStreamId: string;
  lastSequenceNumber: number;
  liveBridge?: GeminiLiveBridge | null;
}

const voiceContexts: Record<string, SessionVoiceContext> = {};

function packAudioFrame(responseId: string, sequenceNumber: number, isFinal: boolean, audio: Buffer, sampleRate: number = 16000): Buffer {
  const header = Buffer.alloc(44);
  header.writeUInt32LE(sequenceNumber, 0);
  header.writeUInt32LE(isFinal ? 1 : 0, 4);
  header.writeUInt32LE(sampleRate, 8);
  const respIdBuf = Buffer.from(responseId, 'utf-8');
  respIdBuf.copy(header, 12, 0, Math.min(respIdBuf.length, 32));
  return Buffer.concat([header, audio]);
}

function getOrCreateVoiceContext(sessionId: string): SessionVoiceContext {
  if (!voiceContexts[sessionId]) {
    voiceContexts[sessionId] = {
      state: 'IDLE',
      vad: createVoiceActivityDetector(),
      stt: createStreamingSTT(process.env.STT_PROVIDER || 'mock'),
      responseService: new VoiceResponseService(),
      currentTurnId: `turn_voice_${Date.now()}`,
      activeResponseId: null,
      processedTurns: new Set<string>(),
      audioQueueDepth: 0,
      audioQueueBytes: 0,
      droppedAudioFrames: 0,
      voiceConnectionId: Math.random().toString(36).substring(2),
      audioStreamId: `stream_${Date.now()}`,
      lastSequenceNumber: 0,
      liveBridge: null
    };

    // Setup STT event listeners
    const ctx = voiceContexts[sessionId];
    ctx.stt.on('partial', (data: any) => {
      if (data.turnId !== ctx.currentTurnId) return;

      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: Date.now(),
        source: 'voice',
        type: 'voice.transcript.partial',
        payload: { text: data.text }
      });
    });

    ctx.stt.on('final', async (data: any) => {
      if (data.turnId !== ctx.currentTurnId) return;

      // Normalization of whitespace and STT artifacts
      const normalizedText = (data.text || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\[Cancelled\]/gi, '');

      if (!normalizedText) {
        ctx.state = 'LISTENING';
        broadcastToSession(sessionId, {
          eventId: Math.random().toString(36).substring(2),
          sessionId,
          turnId: ctx.currentTurnId,
          timestamp: Date.now(),
          source: 'system',
          type: 'voice.transcript.empty',
          payload: {}
        });
        return;
      }

      // Idempotency: exact-once execution check
      const finalTranscriptId = `${sessionId}:${ctx.currentTurnId}:${normalizedText}`;
      if (ctx.processedTurns.has(finalTranscriptId)) {
        console.warn(`Idempotency gate blocked duplicate final turn event: ${finalTranscriptId}`);
        return;
      }
      ctx.processedTurns.add(finalTranscriptId);

      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: Date.now(),
        source: 'voice',
        type: 'voice.transcript.final',
        payload: { text: normalizedText }
      });

      // Integrate final transcript directly into existing semantic & orchestration graph
      try {
        ctx.state = 'PROCESSING';
        const graphResult = await simulationGraph.processUserTurn(
          parseInt(sessionId, 10),
          normalizedText,
          (event: SimulationEvent) => {
            broadcastToSession(sessionId, event);
          }
        );

        if (graphResult.textResponse && graphResult.selectedPersonaId !== null) {
          // Fetch persona voice setting
          const activePersona = await PersonaRepository.getById(graphResult.selectedPersonaId);
          
          const responseId = await ctx.responseService.speak({
            sessionId,
            turnId: ctx.currentTurnId,
            personaId: String(graphResult.selectedPersonaId),
            text: graphResult.textResponse,
            voiceId: activePersona?.voiceId
          });
          
          ctx.activeResponseId = responseId;
        } else {
          ctx.state = 'LISTENING';
        }
      } catch (err: any) {
        ctx.state = 'LISTENING';
        broadcastToSession(sessionId, {
          eventId: Math.random().toString(36).substring(2),
          sessionId,
          turnId: ctx.currentTurnId,
          timestamp: Date.now(),
          source: 'system',
          type: 'voice.error',
          payload: { code: 'VOICE_PIPELINE_ERROR', message: err.message }
        });
      }
    });

    ctx.stt.on('error', (err: any) => {
      console.error('STT Pipeline Error:', err);
      ctx.state = 'LISTENING';
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: Date.now(),
        source: 'system',
        type: 'VOICE_STT_ERROR',
        payload: { error: err.message }
      });
    });

    // Setup VoiceResponseService event forwarders
    ctx.responseService.on('voice.ai.response.started', (data) => {
      ctx.state = 'AI_SPEAKING';
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.response.started',
        payload: { responseId: data.responseId, personaId: Number(data.personaId) }
      });
    });

    ctx.responseService.on('voice.ai.audio.started', (data) => {
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.audio.started',
        payload: { responseId: data.responseId }
      });
    });

    ctx.responseService.on('voice.ai.audio.chunk', (data) => {
      // Stale audio protection: drop chunk if response has changed
      if (ctx.activeResponseId !== data.responseId) return;

      const packed = packAudioFrame(data.responseId, data.sequenceNumber, data.isFinal, data.audio);
      broadcastBinaryToSession(sessionId, packed);

      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.audio.chunk',
        payload: {
          responseId: data.responseId,
          sequenceNumber: data.sequenceNumber,
          isFinal: data.isFinal
        }
      });
    });

    ctx.responseService.on('voice.ai.audio.completed', (data) => {
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.audio.completed',
        payload: { responseId: data.responseId }
      });
    });

    ctx.responseService.on('voice.ai.response.completed', (data) => {
      if ((ctx.state as string) === 'AI_SPEAKING') {
        ctx.state = 'LISTENING';
      }
      ctx.activeResponseId = null;
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.response.completed',
        payload: { responseId: data.responseId }
      });
    });

    ctx.responseService.on('voice.ai.response.interrupted', (data) => {
      ctx.state = 'INTERRUPTED';
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: data.timestamp,
        source: 'system',
        type: 'voice.ai.response.interrupted',
        payload: { responseId: data.responseId }
      });
    });

    ctx.responseService.on('voice.ai.tts.error', (data) => {
      ctx.state = 'LISTENING';
      broadcastToSession(sessionId, {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        turnId: ctx.currentTurnId,
        timestamp: Date.now(),
        source: 'system',
        type: 'voice.ai.tts.error',
        payload: { responseId: data.responseId, error: data.error }
      });
    });
  }
  return voiceContexts[sessionId];
}

async function handleAudioBuffer(
  sessionId: string, 
  buffer: Buffer, 
  socket: any, 
  params: { sequenceNumber?: number; connectionId?: string; streamId?: string } = {}
) {
  const ctx = getOrCreateVoiceContext(sessionId);

  // Connection isolation verification
  if (params.connectionId && params.connectionId !== ctx.voiceConnectionId) {
    return;
  }

  if (process.env.SPEECH_TO_SPEECH === 'true') {
    if (ctx.liveBridge) {
      ctx.liveBridge.sendAudioChunk(buffer);
      if (ctx.state === 'LISTENING') {
        ctx.state = 'USER_SPEAKING';
        broadcastToSession(sessionId, {
          eventId: Math.random().toString(36).substring(2),
          sessionId,
          turnId: ctx.currentTurnId,
          timestamp: Date.now(),
          source: 'voice',
          type: 'voice.speech.started',
          payload: {}
        });
      }
    }
    return;
  }

  // Backpressure evaluation
  const maxQueueDepth = 200;
  const maxQueueBytes = 500 * 1024;
  if (ctx.audioQueueDepth >= maxQueueDepth || ctx.audioQueueBytes >= maxQueueBytes) {
    ctx.droppedAudioFrames++;
    return;
  }

  // Maximum frame size check
  const maxFrameSize = 64 * 1024;
  if (buffer.length > maxFrameSize) return;

  const frame = {
    sessionId,
    turnId: ctx.currentTurnId,
    sequenceNumber: ctx.lastSequenceNumber++,
    timestamp: Date.now(),
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm16',
    data: buffer
  };

  ctx.audioQueueDepth++;
  ctx.audioQueueBytes += buffer.length;

  try {
    // Browser VAD owns speech detection.
    // Server simply streams audio to STT while in USER_SPEAKING state.
    if (ctx.state === 'USER_SPEAKING') {
      await ctx.stt.pushAudio(frame);
    }
  } finally {
    ctx.audioQueueDepth = Math.max(0, ctx.audioQueueDepth - 1);
    ctx.audioQueueBytes = Math.max(0, ctx.audioQueueBytes - buffer.length);
  }
}


export function registerWebSocketConnection(connection: any, request: FastifyRequest) {
  const { sessionId } = request.params as { sessionId: string };
  const socket = connection.socket || connection;

  if (!sessionId) {
    socket.close(4000, 'Session ID is required');
    return;
  }

  console.log(`WebSocket connection opened for session: ${sessionId}`);

  const ctx = getOrCreateVoiceContext(sessionId);
  ctx.voiceConnectionId = Math.random().toString(36).substring(2);
  ctx.lastSequenceNumber = 0;
  ctx.audioQueueDepth = 0;
  ctx.audioQueueBytes = 0;

  if (!activeConnections[sessionId]) {
    activeConnections[sessionId] = new Set();
  }
  activeConnections[sessionId].add(connection);

  // Send initial session.started state event
  const startEvent: SimulationEvent = {
    eventId: Math.random().toString(36).substring(2),
    sessionId,
    timestamp: Date.now(),
    source: 'system',
    type: 'SESSION_STARTED',
    payload: { message: 'Session connection initialized.' },
  };
  socket.send(JSON.stringify(startEvent));

  // Listen to incoming messages
  socket.on('message', async (data: any, isBinary?: boolean) => {
    try {
      const dataStr = data.toString();
      const isJsonText = !isBinary && dataStr.trim().startsWith('{');

      // Check if data is binary audio chunk
      if (!isJsonText) {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
        await handleAudioBuffer(sessionId, buf, socket, {
          connectionId: ctx.voiceConnectionId,
          streamId: ctx.audioStreamId
        });
        return;
      }

      const parsed = JSON.parse(dataStr);
      
      // Handle control frames
      if (parsed.type === 'voice.session.start') {
        ctx.state = 'LISTENING';
        if (process.env.SPEECH_TO_SPEECH === 'true') {
          if (ctx.liveBridge) {
            ctx.liveBridge.close();
          }
          ctx.liveBridge = new GeminiLiveBridge(process.env.GEMINI_API_KEY || '');
          ctx.liveBridge.connect();

          ctx.liveBridge.on('audio.chunk', (data) => {
            const packed = packAudioFrame(data.responseId, data.sequenceNumber, data.isFinal, data.audio);
            broadcastBinaryToSession(sessionId, packed);
            
            broadcastToSession(sessionId, {
              eventId: Math.random().toString(36).substring(2),
              sessionId,
              turnId: ctx.currentTurnId,
              timestamp: Date.now(),
              source: 'system',
              type: 'voice.ai.audio.chunk',
              payload: {
                responseId: data.responseId,
                sequenceNumber: data.sequenceNumber,
                isFinal: data.isFinal,
                sampleRate: data.sampleRate
              }
            });
          });

          ctx.liveBridge.on('response.started', (data) => {
            ctx.state = 'AI_SPEAKING';
            ctx.activeResponseId = data.responseId;
            broadcastToSession(sessionId, {
              eventId: Math.random().toString(36).substring(2),
              sessionId,
              turnId: ctx.currentTurnId,
              timestamp: Date.now(),
              source: 'system',
              type: 'voice.ai.response.started',
              payload: { responseId: data.responseId }
            });
          });

          ctx.liveBridge.on('response.completed', (data) => {
            ctx.state = 'LISTENING';
            ctx.activeResponseId = null;
            broadcastToSession(sessionId, {
              eventId: Math.random().toString(36).substring(2),
              sessionId,
              turnId: ctx.currentTurnId,
              timestamp: Date.now(),
              source: 'system',
              type: 'voice.ai.response.completed',
              payload: { responseId: data.responseId }
            });
          });

          ctx.liveBridge.on('transcript.partial', (data) => {
            broadcastToSession(sessionId, {
              eventId: Math.random().toString(36).substring(2),
              sessionId,
              turnId: ctx.currentTurnId,
              timestamp: Date.now(),
              source: 'voice',
              type: 'voice.transcript.partial',
              payload: { text: data.text }
            });
          });
        }

        broadcastToSession(sessionId, {
          eventId: Math.random().toString(36).substring(2),
          sessionId,
          turnId: ctx.currentTurnId,
          timestamp: Date.now(),
          source: 'system',
          type: 'voice.session.started',
          payload: {}
        });
        return;
      }

      if (parsed.type === 'voice.audio.chunk') {
        const base64Data = parsed.payload?.data || '';
        const sequenceNumber = parsed.payload?.sequenceNumber;
        const streamId = parsed.payload?.streamId;
        if (base64Data) {
          const buf = Buffer.from(base64Data, 'base64');
          await handleAudioBuffer(sessionId, buf, socket, {
            sequenceNumber,
            connectionId: ctx.voiceConnectionId,
            streamId
          });
        }
        return;
      }

      if (parsed.type === 'voice.input.stop') {
        const ctx = getOrCreateVoiceContext(sessionId);
        if (ctx.state === 'USER_SPEAKING') {
          ctx.state = 'PROCESSING';
          broadcastToSession(sessionId, {
            eventId: Math.random().toString(36).substring(2),
            sessionId,
            turnId: ctx.currentTurnId,
            timestamp: Date.now(),
            source: 'system',
            type: 'voice.processing.started',
            payload: {}
          });
          if (process.env.SPEECH_TO_SPEECH !== 'true') {
            await ctx.stt.stop();
          }
        }
        return;
      }

      if (parsed.type === 'voice.session.stop') {
        const ctx = getOrCreateVoiceContext(sessionId);
        ctx.state = 'IDLE';
        ctx.vad.reset();
        await ctx.stt.cancel();
        if (ctx.liveBridge) {
          ctx.liveBridge.close();
          ctx.liveBridge = null;
        }
        return;
      }

      // Browser VAD detected speech start — begin STT buffering
      if (parsed.type === 'voice.speech.started') {
        const ctx = getOrCreateVoiceContext(sessionId);
        if (ctx.state === 'LISTENING' || ctx.state === 'AI_SPEAKING' || ctx.state === 'PROCESSING') {
          // Cancel any lingering STT session from previous turn
          try { await ctx.stt.cancel(); } catch (_) {}

          // Barge-in handling
          if (ctx.state === 'AI_SPEAKING' && ctx.activeResponseId) {
            ctx.responseService.cancel(ctx.activeResponseId);
            ctx.activeResponseId = null;
          }
          ctx.state = 'USER_SPEAKING';
          ctx.currentTurnId = `turn_voice_${Date.now()}`;
          ctx.audioStreamId = `stream_${Date.now()}`;
          await ctx.stt.start(ctx.currentTurnId);
          console.log(`[Gateway] Browser VAD: speech started → STT started for session ${sessionId}`);
          broadcastToSession(sessionId, {
            eventId: Math.random().toString(36).substring(2),
            sessionId,
            turnId: ctx.currentTurnId,
            timestamp: Date.now(),
            source: 'voice',
            type: 'voice.speech.started',
            payload: {}
          });
        }
        return;
      }



      // Validate incoming message format for text fallback
      if (!parsed.type || !parsed.payload) {
        throw new Error('Invalid message format. Type and payload are required.');
      }

      console.log(`Received client event: ${parsed.type} for session ${sessionId}`);

      // Handle user text input
      if (parsed.type === 'user.text') {
        const textInput = parsed.payload.text || '';
        if (!textInput.trim()) return;

        // Execute the State Graph turn cycle
        const graphResult = await simulationGraph.processUserTurn(
          parseInt(sessionId, 10),
          textInput,
          (event: SimulationEvent) => {
            broadcastToSession(sessionId, event);
          }
        );

        if (graphResult.textResponse && ctx.state !== 'IDLE' && graphResult.selectedPersonaId !== null) {
          const activePersona = await PersonaRepository.getById(graphResult.selectedPersonaId);
          const responseId = await ctx.responseService.speak({
            sessionId,
            turnId: ctx.currentTurnId,
            personaId: String(graphResult.selectedPersonaId),
            text: graphResult.textResponse,
            voiceId: activePersona?.voiceId
          });
          ctx.activeResponseId = responseId;
        }
      }
    } catch (err: any) {
      console.error('Error handling websocket message:', err);
      const errorEvent: SimulationEvent = {
        eventId: Math.random().toString(36).substring(2),
        sessionId,
        timestamp: Date.now(),
        source: 'system',
        type: 'ERROR',
        payload: {
          code: 'WEBSOCKET_MESSAGE_ERROR',
          message: err.message,
        },
      };
      socket.send(JSON.stringify(errorEvent));
    }
  });

  // Handle socket termination
  socket.on('close', () => {
    console.log(`WebSocket connection closed for session: ${sessionId}`);
    
    // Resource cleanup on disconnect
    if (ctx.activeResponseId) {
      ctx.responseService.cancel(ctx.activeResponseId);
    }

    if (activeConnections[sessionId]) {
      activeConnections[sessionId].delete(connection);
      if (activeConnections[sessionId].size === 0) {
        delete activeConnections[sessionId];
      }
    }
  });

  socket.on('error', (err: any) => {
    console.error(`WebSocket connection error in session ${sessionId}:`, err);
  });
}

/**
 * Broadcasts an event to all open websockets in a session context.
 */
export function broadcastToSession(sessionId: string, event: SimulationEvent) {
  const connections = activeConnections[sessionId];
  if (!connections || connections.size === 0) return;

  const raw = JSON.stringify(event);
  for (const conn of connections) {
    const sock = conn.socket || conn;
    if (sock.readyState === sock.OPEN) {
      sock.send(raw);
    }
  }
}

/**
 * Broadcasts raw binary frames to all open websockets in a session context.
 */
export function broadcastBinaryToSession(sessionId: string, buffer: Buffer) {
  const connections = activeConnections[sessionId];
  if (!connections || connections.size === 0) return;

  for (const conn of connections) {
    const sock = conn.socket || conn;
    if (sock.readyState === sock.OPEN) {
      sock.send(buffer, { binary: true });
    }
  }
}
