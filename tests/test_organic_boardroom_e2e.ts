import { SimulationGraph } from '../packages/orchestration/src/graph.js';
import { LatentQuestion, AgentPrivateState } from '@reflection-ai/shared';
import { LatentQuestionRepository, SessionRepository } from '@reflection-ai/database';

async function runE2ETests() {
  console.log('Starting Phase 5: Organic Boardroom Intelligence E2E Integration Test...');
  
  // Set up mock AI mode so we run deterministically
  process.env.MOCK_AI = 'true';
  process.env.MAX_INTERNAL_MESSAGES_PER_TURN = '3';
  process.env.MAX_INTERNAL_ROUNDS = '1';

  const graph = new SimulationGraph();

  // Create a mock active session in DB or mock existing session id
  const sessionId = 1;

  // Run first turn simulation
  console.log('\n--- TURN 1: Candidate introduces architecture with MySQL database choice ---');
  const turn1Output = await graph.processUserTurn(
    sessionId,
    'We built our microservices application using Node.js, Fastify and MySQL as our relational database because of ACID transaction requirements.',
    (event) => {
      if (event.type === 'AGENT_INTERNAL_MESSAGE') {
        console.log(`[DELIBERATION] ${event.payload.fromPersonaId} -> ${event.payload.toPersonaId}: (${event.payload.messageType}) "${event.payload.content}"`);
      } else if (event.type === 'QUESTION_UPDATED') {
        console.log(`[CONCERN UPDATED] Persona ${event.payload.personaId} Status: ${event.payload.status}, Score: ${event.payload.score}`);
      }
    }
  );

  console.log(`\nDecision: ${turn1Output.decision.action} selected agent ${turn1Output.decision.selectedPersonaId}`);
  console.log(`Reason: ${turn1Output.decision.reason}`);
  console.log(`Response spoken: "${turn1Output.textResponse}"`);

  // Assertions for Turn 1
  const updatedQuestions = await LatentQuestionRepository.getQuestionsForSession(sessionId);
  const mysqlConcern = updatedQuestions.find(q => q.canonicalQuestionId === 'q_database_choice');
  
  if (!mysqlConcern || mysqlConcern.status !== 'SATISFIED') {
    console.error(`FAIL: Expected MySQL concern to be satisfied after turn 1. Status: ${mysqlConcern?.status}`);
    process.exit(1);
  }
  console.log('PASS: MySQL database choice concern successfully satisfied.');

  // Run second turn simulation
  console.log('\n--- TURN 2: CTO asks how we verified scalability ---');
  const turn2Output = await graph.processUserTurn(
    sessionId,
    'We load tested the services using k6 running on a distributed cluster, simulating a ramp-up workload of 100k concurrent users to measure latencies.',
    (event) => {
      if (event.type === 'AGENT_INTERNAL_MESSAGE') {
        console.log(`[DELIBERATION] ${event.payload.fromPersonaId} -> ${event.payload.toPersonaId}: (${event.payload.messageType}) "${event.payload.content}"`);
      } else if (event.type === 'QUESTION_UPDATED') {
        console.log(`[CONCERN UPDATED] Persona ${event.payload.personaId} Status: ${event.payload.status}, Score: ${event.payload.score}`);
      }
    }
  );

  console.log(`\nDecision: ${turn2Output.decision.action} selected agent ${turn2Output.decision.selectedPersonaId}`);
  console.log(`Reason: ${turn2Output.decision.reason}`);
  console.log(`Response spoken: "${turn2Output.textResponse}"`);

  const updatedQuestionsTurn2 = await LatentQuestionRepository.getQuestionsForSession(sessionId);
  const scaleConcern = updatedQuestionsTurn2.find(q => q.canonicalQuestionId === 'q_scalability_load_testing');
  
  if (!scaleConcern || scaleConcern.status !== 'SATISFIED') {
    console.error(`FAIL: Expected Scalability concern to be satisfied after turn 2. Status: ${scaleConcern?.status}`);
    process.exit(1);
  }
  console.log('PASS: Scalability verification concern successfully satisfied.');

  console.log('\nAll Organic Boardroom E2E Integration Tests PASSED successfully!');
}

runE2ETests().catch(err => {
  console.error('E2E Test execution failed:', err);
  process.exit(1);
});
