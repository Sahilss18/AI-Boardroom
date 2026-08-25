# ReflectionAi System Architecture

This document describes the high-level system architecture and key design decisions.

## 1. Core Architectural Principle
**Agents do not directly control the user-facing conversation.**

To prevent agent cross-talk, infinite agent loops, excessive API usage, and race conditions, the flow is strictly mediated by the Orchestrator:

```
User Turn (Text/WebSocket)
         │
         ▼
  Semantic Engine (Intent, Entities, Claims)
         │
         ▼
  Parallel Agent Node Execution (HR, CTO, CFO, etc.)
  - Evaluates turn against persona objectives
  - Proposes a response action (e.g. ASK, CHALLENGE, RESPOND, WAIT)
  - Computes confidence & priority
         │
         ▼
  Orchestrator Node (Decision Engine)
  - Ranks proposals based on role match, topic interest, and constraints
  - Applies cooldown penalties (prevents consecutive dominance)
  - Appoints the final active speaker
         │
         ▼
  Response Generation & TTS (Streaming Output)
```

## 2. Directory Layout (Monorepo)
We organize components using a modular workspace layout to isolate packages and run them in parallel:

- **`apps/web`**: React, Vite, Tailwind CSS SPA.
- **`apps/api`**: Fastify WebSocket gateway and HTTP server.
- **`packages/shared`**: Shared event schemas, constants, and type definitions.
- **`packages/database`**: MySQL client, schemas, migrations, and repositories.
- **`packages/ai`**: Abstraction layer for Gemini, Groq, and Ollama providers.
- **`packages/agents`**: Cognitive private agent states, goals, and prompt templates.
- **`packages/orchestration`**: LangGraph graph topology, cooldown trackers, and routing rules.
- **`packages/intelligence`**: Intent analyzer, Claim extraction, and Consistency engine.

## 3. Technology Stack
- **Backend**: Node.js + TypeScript + Fastify
- **State Machine**: LangGraph.js
- **Database**: MySQL 8.0 (persistent truth) + Redis (real-time session/audio buffer)
- **Vector Search**: Qdrant
- **Observability**: Langfuse (hierarchical tracing)
- **AI Reasoning**: Gemini 2.5 Flash (Primary) + Groq Llama-3 (Critic)
