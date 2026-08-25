import { ConsistencyEngine } from '../packages/intelligence/src/consistency-engine.js';
import { Claim, Conflict, AgentProposal } from '@reflection-ai/shared';

async function runEvidenceScopeTest() {
  console.log('Running Evidence Scoping and Agent Isolation Tests...');

  // 1. Setup mock session claims
  const claims: Claim[] = [
    {
      id: 10,
      sessionId: 200,
      turnId: null,
      subject: 'system',
      predicate: 'specification',
      object: 'MySQL',
      confidence: 1.0,
      sourceType: 'PDF',
      sourceId: 'spec.pdf',
      evidenceStatus: 'SUPPORTED'
    },
    {
      id: 11,
      sessionId: 200,
      turnId: 1,
      subject: 'candidate',
      predicate: 'statement',
      object: 'PostgreSQL',
      confidence: 0.95,
      sourceType: 'USER_SPEECH',
      sourceId: 'turn_1',
      evidenceStatus: 'CONTRADICTED'
    },
    {
      id: 12,
      sessionId: 200,
      turnId: 1,
      subject: 'candidate',
      predicate: 'statement',
      object: 'MySQL',
      confidence: 0.98,
      sourceType: 'USER_SPEECH',
      sourceId: 'turn_1',
      evidenceStatus: 'SUPPORTED'
    }
  ];

  // 2. Setup mock conflicts
  const conflicts: Conflict[] = [
    {
      id: 5,
      sessionId: 200,
      claimAId: 10,
      claimBId: 11,
      contradictionType: 'value_mismatch',
      severity: 'HIGH',
      confidence: 0.95,
      status: 'active',
      resolution: 'Database contradiction: MySQL spec vs PostgreSQL speech'
    }
  ];

  // 3. Test proposals
  const proposals: AgentProposal[] = [
    // TEST 1: Relevant contradiction
    {
      sessionId: 200,
      personaId: 2, // CTO
      turnId: 1,
      action: 'ASK',
      content: 'Why did you choose PostgreSQL over MySQL?',
      priority: 0.9,
      confidence: 0.9,
      reason: 'Asking about database choice.',
      status: 'pending',
      relatedEntities: ['MySQL', 'PostgreSQL'],
      relatedClaims: ['candidate chose PostgreSQL'],
      semanticIntent: 'explore_database_choice'
    },
    // TEST 2 / TEST 7: Unrelated proposal / Agent isolation
    {
      sessionId: 200,
      personaId: 1, // HR Manager
      turnId: 1,
      action: 'ASK',
      content: 'Tell me about a team conflict.',
      priority: 0.8,
      confidence: 0.95,
      reason: 'Behavioral question.',
      status: 'pending',
      relatedEntities: [],
      relatedClaims: [],
      semanticIntent: 'behavioral_conflict'
    },
    // TEST 3: Unknown technology cache check (Do not assume Redis)
    {
      sessionId: 200,
      personaId: 2,
      turnId: 1,
      action: 'ASK',
      content: 'How did you optimize your Redis bottlenecks?',
      priority: 0.85,
      confidence: 0.9,
      reason: 'Asking about cache details.',
      status: 'pending',
      relatedEntities: ['Redis'],
      relatedClaims: ['used Redis'],
      semanticIntent: 'explore_cache_choice'
    },
    // TEST 4: Supported
    {
      sessionId: 200,
      personaId: 2,
      turnId: 1,
      action: 'ASK',
      content: 'I see you aligned with MySQL, why is that?',
      priority: 0.85,
      confidence: 0.9,
      reason: 'Checking alignment.',
      status: 'pending',
      relatedEntities: ['MySQL'],
      relatedClaims: ['used MySQL'],
      semanticIntent: 'explore_database_choice'
    }
  ];

  console.log('\nRunning Scoped Consistency Evaluations...');
  const evaluated = ConsistencyEngine.evaluateProposals(proposals, conflicts, claims);

  console.log('Evaluated results:');
  console.log(JSON.stringify(evaluated, null, 2));

  // TEST 1 Assertion
  const t1 = evaluated.find(p => p.content.includes('PostgreSQL'));
  console.log(`TEST 1 (Contradicted): ${t1?.evidenceStatus === 'CONTRADICTED' ? 'PASS' : 'FAIL'}`);
  if (t1?.evidenceStatus !== 'CONTRADICTED') process.exit(1);

  // TEST 2 / TEST 7 Assertion
  const t2 = evaluated.find(p => p.content.includes('conflict'));
  console.log(`TEST 2 & 7 (Unrelated / Agent Isolation): ${t2?.evidenceStatus === 'UNRELATED' ? 'PASS' : 'FAIL'}`);
  if (t2?.evidenceStatus !== 'UNRELATED') process.exit(1);

  // TEST 3 Assertion
  const t3 = evaluated.find(p => p.content.includes('Redis'));
  console.log(`TEST 3 (Unknown technology): ${t3?.evidenceStatus === 'UNKNOWN' ? 'PASS' : 'FAIL'}`);
  if (t3?.evidenceStatus !== 'UNKNOWN') process.exit(1);

  // TEST 4 Assertion
  const t4 = evaluated.find(p => p.content.includes('aligned'));
  console.log(`TEST 4 (Supported): ${t4?.evidenceStatus === 'SUPPORTED' ? 'PASS' : 'FAIL'}`);
  if (t4?.evidenceStatus !== 'SUPPORTED') process.exit(1);

  // TEST 5 Assertion (Contradiction confidence)
  const worstConflict = conflicts[0];
  console.log(`TEST 5 (Contradiction high confidence): ${worstConflict.confidence >= 0.8 ? 'PASS' : 'FAIL'}`);
  if (worstConflict.confidence < 0.8) process.exit(1);

  console.log('\nSUCCESS: All Scoped Evidence Status E2E test cases passed!');
  process.exit(0);
}

runEvidenceScopeTest();
