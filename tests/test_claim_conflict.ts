import { ConsistencyEngine } from '../packages/intelligence/src/consistency-engine.js';
import { Claim, Conflict, AgentProposal } from '@reflection-ai/shared';

async function runClaimConflictTest() {
  console.log('Running Claim Graph & Conflict Scoping Unit Tests...');

  // 1. Mock claims in the graph
  const claims: Claim[] = [
    {
      id: 1,
      sessionId: 101,
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
      id: 2,
      sessionId: 101,
      turnId: 1,
      subject: 'candidate',
      predicate: 'statement',
      object: 'PostgreSQL',
      confidence: 0.95,
      sourceType: 'USER_SPEECH',
      sourceId: 'turn_1',
      evidenceStatus: 'CONTRADICTED'
    }
  ];

  // 2. Mock conflicts
  const conflicts: Conflict[] = [
    {
      id: 1,
      sessionId: 101,
      claimAId: 1,
      claimBId: 2,
      contradictionType: 'value_mismatch',
      severity: 'HIGH',
      confidence: 0.95,
      status: 'active',
      resolution: 'The candidate claimed they chose PostgreSQL, but the system architecture specifies MySQL was used as the core database.'
    }
  ];

  // 3. Test proposals
  const proposals: AgentProposal[] = [
    {
      sessionId: 101,
      personaId: 2,
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
    {
      sessionId: 101,
      personaId: 1,
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
    }
  ];

  console.log('\nEvaluating proposals against claim conflicts...');
  const evaluated = ConsistencyEngine.evaluateProposals(proposals, conflicts, claims);

  console.log('Evaluated proposals outcome:');
  console.log(JSON.stringify(evaluated, null, 2));

  // Assertions
  const propDb = evaluated.find(p => p.content.includes('PostgreSQL'));
  const propBehavioral = evaluated.find(p => p.content.includes('conflict'));

  if (!propDb || propDb.evidenceStatus !== 'CONTRADICTED') {
    console.error('FAIL: Database choice proposal was not marked as CONTRADICTED!');
    process.exit(1);
  }

  if (!propBehavioral || propBehavioral.evidenceStatus !== 'UNRELATED') {
    console.error('FAIL: Unrelated behavioral proposal was not marked as UNRELATED!');
    process.exit(1);
  }

  console.log('PASS: Claim Graph & Conflict Scoping verified successfully!');
  process.exit(0);
}

runClaimConflictTest();
