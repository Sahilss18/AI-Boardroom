# Cognitive Agent Architecture

ReflectionAi simulation participants are designed as independent stateful agents. They do not have direct control over speech, but rather evaluate the conversation and submit structured proposals to the orchestrator.

---

## 1. Private Agent State

To maintain realistic behavior, agents do not share a single "brain" or context window. Each agent stores private state in `session_personas.private_state_json`:

```typescript
interface AgentPrivateState {
  personaId: string;
  objectives: {
    id: string;
    description: string;
    completed: boolean;
  }[];
  latentQuestions: {
    id: string;
    question: string;
    priority: number;
    status: "unanswered" | "partially_answered" | "satisfied";
  }[];
  concerns: string[];
  lastSpokenTurn?: number;
  speakingCooldown: number; // Penalty counter
}
```

---

## 2. Decision Logic and Proposals

Every time the user finishes a turn, the State Graph invokes all active agents in parallel. Each agent receives:
1. The global conversation summary.
2. The user's latest statement.
3. Relevant RAG elements retrieved for that user turn.

Each agent outputs an `AgentProposal`:

```json
{
  "personaId": "cto",
  "action": "CHALLENGE | RESPOND | ASK | WAIT",
  "content": "Proposed text output if selected...",
  "priority": 0.85,
  "confidence": 0.90,
  "reason": "User scaling explanation conflicts with slide 4 architecture limits."
}
```

---

## 3. Persona Configurations
Default personas configured in the database:
- **HR Manager (Role: HR Evaluator)**: Highly conversational, behavioral questions, low technical depth, strict on communication quality.
- **Senior CTO (Role: Technical Assessor)**: Deeply technical, probes database choices, infrastructure scalability, highly analytical.
- **Skeptical VC (Role: Financial/Business Investor)**: Focuses on unit economics, market size, conversion metrics, defensive strategy.
- **Strict Professor (Role: Conceptual Inspector)**: Probes first principles, theoretical models, exact terminology, high focus on correctness.
