# ReflectionAi Implementation Roadmap

This document maps out the phases for completing the interactive multi-agent simulation platform.

## Phase 1: Foundation & WebSocket MVP (Current)
- Monorepo structure setup.
- MySQL migrations and seeds for personas and scenarios.
- AI provider abstraction (Gemini + Groq).
- LangGraph Orchestrator (User state -> Agent parallel evaluations -> Decision Engine -> Selected response).
- Fastify WebSocket server (`/ws/sessions/:sessionId`).
- React Frontend (Dashboard + Simulation Room + Debug Console).

## Phase 2: Latent Question Engine
- Session-start dynamic latent question generator.
- Semantic coverage evaluator (0.0-1.0 unanswered -> satisfied).
- Adaptive follow-up queueing.

## Phase 3: Documents & RAG
- PDF/PPTX file uploader and chunk parser.
- Image parsing with Gemini (diagram elements, charts).
- Qdrant Vector collection setup with mandatory `sessionId` isolation filters.

## Phase 4: Semantic Analysis
- Intent router (technical explanation, self-description, defense, deflection).
- Entity recognizer.
- Claim extractor (Subject -> Predicate -> Object).

## Phase 5: Claim Consistency Engine
- Historic claims vs current statements comparisons.
- Numeric and semantic conflict detector (severity score matrix).
- Natural intervention policies (when to interrupt based on severity).

## Phase 6: Model Context Protocol (MCP)
- Create MCP server offering tools: `reflection_search_documents`, `reflection_search_claims`, `reflection_check_consistency`.
- Connect agent nodes to tool registry.

## Phase 7: Real-Time Audio
- Silero VAD state machine integrated in Redis.
- Local Whisper STT container or Groq STT wrapper.
- Kokoro TTS speech synthesizer with buffer streaming.

## Phase 8: Full Duplex & Barge-In
- Low-latency interruption detection.
- Fast audio buffer flushing and active TTS speaker cancellation.

## Phase 9: Observability
- Integration of Langfuse for complete turn hierarchical traces.
- Real-time logging of decision engine matrices.

## Phase 10: Performance Analytics
- Calculation of communication metrics (words per minute, pauses, confidence scores).
- Grounding checks (supported claims vs contradictions).
- Structured PDF/Interactive performance evaluations dashboard.
