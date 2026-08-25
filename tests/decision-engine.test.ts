import { DecisionEngine } from '../packages/orchestration/src/decision-engine.js';
import { AgentProposal, ConversationTurn, SessionPersona } from '@reflection-ai/shared';

async function runTests() {
  console.log('Running Decision Engine Unit Tests...');

  const engine = new DecisionEngine({
    consecutiveSpeakerPenalty: 0.4,
    secondarySpeakerPenalty: 0.2,
    randomFactor: 0.0 // Set to zero for deterministic assertions
  });

  const sessionPersonas: any[] = [
    { personaId: 1, personaDetails: { name: 'HR Manager' } },
    { personaId: 2, personaDetails: { name: 'Senior CTO' } },
    { personaId: 3, personaDetails: { name: 'Budget CFO' } }
  ];

  // Test Case 1: Simple priority ranking without history (no penalty)
  console.log('\n- Test Case 1: Highest priority should win when no history exists.');
  const proposals1: AgentProposal[] = [
    { sessionId: 1, personaId: 1, turnId: 1, action: 'ASK', content: '', priority: 0.5, confidence: 1.0, status: 'pending' },
    { sessionId: 1, personaId: 2, turnId: 1, action: 'CHALLENGE', content: '', priority: 0.8, confidence: 1.0, status: 'pending' },
    { sessionId: 1, personaId: 3, turnId: 1, action: 'WAIT', content: '', priority: 0.3, confidence: 1.0, status: 'pending' }
  ];

  const decision1 = await engine.selectSpeaker(1, 1, proposals1, sessionPersonas, []);
  if (decision1.selectedPersonaId !== 2) {
    console.error(`FAIL: Expected Persona 2 (CTO) to win, got ${decision1.selectedPersonaId}`);
    process.exit(1);
  }
  console.log('PASS: Persona 2 (CTO) successfully selected.');

  // Test Case 2: Cooldown penalty (CTO spoke last turn)
  console.log('\n- Test Case 2: CTO should be penalized and lose to HR if they spoke on the immediate last turn.');
  const history2: ConversationTurn[] = [
    { id: 1, sessionId: 1, speakerType: 'agent', personaId: 2, text: 'Hello', sequenceNumber: 1, startedAt: new Date(), endedAt: new Date(), createdAt: new Date() }
  ];

  const proposals2: AgentProposal[] = [
    { sessionId: 1, personaId: 1, turnId: 2, action: 'ASK', content: '', priority: 0.5, confidence: 1.0, status: 'pending' }, // Score: 0.5 - 0 = 0.5
    { sessionId: 1, personaId: 2, turnId: 2, action: 'CHALLENGE', content: '', priority: 0.8, confidence: 1.0, status: 'pending' }, // Score: 0.8 - 0.4 = 0.4 (penalized!)
    { sessionId: 1, personaId: 3, turnId: 2, action: 'WAIT', content: '', priority: 0.3, confidence: 1.0, status: 'pending' }
  ];

  const decision2 = await engine.selectSpeaker(1, 2, proposals2, sessionPersonas, history2);
  if (decision2.selectedPersonaId !== 1) {
    console.error(`FAIL: Expected Persona 1 (HR) to win due to CTO penalty. Got: ${decision2.selectedPersonaId}`);
    process.exit(1);
  }
  console.log('PASS: Persona 1 (HR) successfully selected because CTO was cooldown penalized.');

  // Test Case 3: Secondary cooldown penalty (CTO spoke two turns ago, and CFO spoke last turn)
  console.log('\n- Test Case 3: CFO (spoke last turn) and CTO (spoke 2 turns ago) should both be penalized.');
  const history3: ConversationTurn[] = [
    { id: 1, sessionId: 1, speakerType: 'agent', personaId: 2, text: 'Hello', sequenceNumber: 1, startedAt: new Date(), endedAt: new Date(), createdAt: new Date() }, // 2 turns ago
    { id: 2, sessionId: 1, speakerType: 'agent', personaId: 3, text: 'World', sequenceNumber: 2, startedAt: new Date(), endedAt: new Date(), createdAt: new Date() }  // last turn
  ];

  const proposals3: AgentProposal[] = [
    { sessionId: 1, personaId: 1, turnId: 3, action: 'ASK', content: '', priority: 0.5, confidence: 1.0, status: 'pending' }, // Score: 0.5 - 0 = 0.5
    { sessionId: 1, personaId: 2, turnId: 3, action: 'CHALLENGE', content: '', priority: 0.6, confidence: 1.0, status: 'pending' }, // Score: 0.6 - 0.2 = 0.4 (penalized 2 turns ago!)
    { sessionId: 1, personaId: 3, turnId: 3, action: 'RESPOND', content: '', priority: 0.8, confidence: 1.0, status: 'pending' }  // Score: 0.8 - 0.4 = 0.4 (penalized last turn!)
  ];

  const decision3 = await engine.selectSpeaker(1, 3, proposals3, sessionPersonas, history3);
  if (decision3.selectedPersonaId !== 1) {
    console.error(`FAIL: Expected Persona 1 (HR) to win due to double penalties. Got: ${decision3.selectedPersonaId}`);
    process.exit(1);
  }
  console.log('PASS: Persona 1 (HR) successfully selected due to double speaking penalties.');

  console.log('\nAll Decision Engine Unit Tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
