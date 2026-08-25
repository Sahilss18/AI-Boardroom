# Real-time Voice & Interruption Mechanics

To make practice simulations realistic, the voice pipeline must support high-fidelity, bidirectional full-duplex communication with barge-in capabilities.

---

## 1. Bidirectional Audio Pipeline

```
[User Mic] ──> [PCM Chunks] ──> [Silero VAD] ──> [STT Engine] ──> [Orchestration]
                                                                        │
[User Speaker] <── [Audio Nodes] <── [WebSocket Stream] <── [TTS Chunks] ┘
```

- **Audio format**: Single-channel, 16-bit PCM, 16kHz (Standard input for Whisper/Silero).
- **VAD (Voice Activity Detection)**: Processes 30ms or 50ms frames to flag `speech_started` and `speech_ended`.

---

## 2. Barge-In / Interruption Engine

When the user starts speaking while an AI agent's voice is playing:
1. **Silero VAD** detects speech start.
2. **Interruption Controller** is called. It checks:
   - Is AI currently playing audio? (`session:{sessionId}:active-speaker` is not null)
   - Has the user's speech exceeded the minimum noise threshold (e.g. volume > -40dB and duration > 150ms)?
3. If yes, it triggers an **immediate interrupt**:
   - A `USER_INTERRUPTED` event is fired.
   - Outbound TTS generation for the current turn is stopped.
   - The websocket connection sends a `tts.stopped` control flag.
   - The browser flushes the local audio player buffer immediately.
   - The orchestrator node records that the agent was interrupted.

---

## 3. Speaking & Scheduling Weights

To ensure balanced conversation dynamics, the Decision Engine calculates a priority score for each persona proposal:

$$\text{Final Score} = \text{Proposal Priority} - \text{Cooldown Penalty} + \text{Topic Matching Bonus}$$

- **Cooldown Penalty**: Reduces priority score by $0.3$ if the agent spoke on the immediate previous turn, or $0.15$ if they spoke two turns ago.
- **Topic Matching Bonus**: Adds $0.2$ if the semantic engine flags key entities matching the agent's focus area (e.g. CFO gets a bonus if "revenue", "cost", or "pricing" is mentioned).
