# Database and Storage Schema

ReflectionAi uses a hybrid storage structure:
- **MySQL**: The single source of truth for persistent entity representations.
- **Redis**: Fast, in-memory cache for connection channels, locks, and audio frames.
- **Qdrant**: Isolated vector search index.

---

## 1. Relational Schema (MySQL)

Refer to the primary migration file for the full DDL. The key tables and indexes are:

### users
Persistent credentials and identity.
- Indexes: `email` (UNIQUE).

### scenarios
Simulation environments (e.g. Mock Interview, VC Pitch).
- Indexes: `slug` (UNIQUE).

### personas
Agent configurations (objectives, temperament factors like aggressiveness).
- Indexes: `slug` (UNIQUE).

### sessions
Tracks current turn sequence, scenario, and active speaker.
- Indexes: `user_id`, `scenario_id`.

### session_personas
Saves the **private agent state** (`private_state_json`) for each persona in the session.
- Indexes: `session_id`, `persona_id`.

### conversation_turns
Log of dialogue history.
- Indexes: `session_id`, `sequence_number`.

### agent_proposals
Decisions proposed by agents during a turn (WAIT, ASK, RESPOND).
- Indexes: `session_id`, `persona_id`, `turn_id`.

### decisions
The orchestrator's decision of who speaks, actions taken, and rationale.
- Indexes: `session_id`, `turn_id`.

---

## 2. Real-Time State (Redis Keys)

Redis holds ephemeral state to coordinate events and control locks:

| Key Format | Type | Description |
| :--- | :--- | :--- |
| `session:{sessionId}:state` | HASH | Active speaker, current turn number, VAD states. |
| `session:{sessionId}:active-speaker` | STRING | ID of persona currently generating speech. |
| `session:{sessionId}:lock` | STRING | Mutex to avoid simultaneous writes to session status. |
| `session:{sessionId}:events` | STREAM | Stream of real-time server events for the WebSocket gateway. |

---

## 3. Vector Search (Qdrant Payload)

We run a single logical collection: `reflection_documents`.
To guarantee tenant isolation (prevent leakage between sessions), every query **MUST** apply a filter on the payload's `sessionId`:

```json
{
  "filter": {
    "must": [
      { "key": "sessionId", "match": { "value": "SESSION_ID" } }
    ]
  }
}
```

### Payload Structure
```json
{
  "sessionId": "UUID",
  "documentId": "BIGINT",
  "chunkId": "BIGINT",
  "sourceType": "speech | document",
  "pageNumber": 2,
  "slideNumber": null,
  "chunkType": "text | table | chart",
  "content": "Raw chunk text content..."
}
```
