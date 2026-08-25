# Real-Time Event Protocol

ReflectionAi uses a unified event broker model. Every event adheres to the `SimulationEvent` structure.

## 1. Canonical Event Schema

Every event (whether client, server, or internal agent-to-agent message) uses the following interface:

```typescript
interface SimulationEvent<T = unknown> {
  eventId: string;     // Unique UUID
  sessionId: string;   // Active session ID
  turnId?: string;     // Contextual turn ID (nullable)
  timestamp: number;   // Epoch ms
  source: "user" | "agent" | "orchestrator" | "system" | "tool" | "voice";
  type: SimulationEventType;
  payload: T;          // Typed data payload
  traceId?: string;    // Langfuse logging trace ID
}
```

---

## 2. Event Types List

Below are the key events transmitted over the WebSocket connection (`/ws/sessions/:sessionId`):

### Client-to-Server
- `audio.start`: Indicates the user's mic stream is opening.
- `audio.chunk`: ArrayBuffer containing raw PCM audio.
- `audio.end`: Microphone channel closing.
- `user.text`: Text backup message sent directly by the user input box.
- `session.pause` / `session.resume` / `session.stop`: State overrides.

### Server-to-Client
- `session.started`: Confirmation of connection and panel loading.
- `session.state`: Syncs active speakers, turn index, and user connection states.
- `transcript.partial`: Incremental Speech-To-Text words (used for quick UI subtitles).
- `transcript.final`: Validated text block ready for engine processing.
- `agent.thinking`: Sends a ping indicating which agents are processing turns.
- `agent.proposal`: Emits internal proposals to the developer debug panel.
- `orchestrator.decision`: Details which agent spoke and why.
- `agent.response.started` / `chunk` / `completed`: Streamed response text chunks.
- `tts.started` / `audio` / `stopped`: Audio output events.
- `contradiction.detected`: Notifies when claims clash (e.g. 5 vs 7 years experience).
- `question.satisfied`: Updates question checklist progress in real-time.
- `error`: Formal error logs with trace IDs.
