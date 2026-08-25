import { pool } from '../packages/database/src/connection.js';

const USER_TURNS = [
  "Hello, I am excited to interview today for the Lead Systems Engineer role.",
  "I have over 8 years of experience building scalable backend architectures.",
  "In my last project, I built a microservices application using Node.js, Fastify and MySQL.",
  "We selected MySQL because our data was relational and required ACID transactions.",
  "To handle caching, we set up Redis clusters with a custom eviction policy.",
  "For scalability, we load-tested the services at 100k concurrent users.",
  "We used load testing tools like autocannon to benchmark and optimize bottleneck endpoints.",
  "My greatest professional accomplishment was design and migration of our core payment flow with zero downtime.",
  "I also manage a team of 6 engineers and resolve internal team conflicts by facilitating open discussions.",
  "We eventually scaled the microservices successfully across Kubernetes pods."
];

async function runLongTest() {
  console.log('Starting 10-Turn Multi-Agent Simulation Test...');

  // 1. Create a session via HTTP POST
  const sessionRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 1, // Mock Interview
      personaIds: [1, 2] // HR Manager + Senior CTO
    })
  });

  const sessionData = await sessionRes.json() as any;
  if (!sessionData.success || !sessionData.session) {
    console.log('Failed to create session:', sessionData);
    process.exit(1);
  }

  const sessionId = sessionData.session.id;
  console.log(`Session created successfully. ID: ${sessionId}`);

  // Seed deterministic latent questions to ensure consistency
  console.log('Seeding deterministic latent questions for session...');
  await pool.query(
    `INSERT INTO latent_questions (session_id, persona_id, question, normalized_question, intent, entities_json, priority, status, satisfaction_score, source, question_id, metadata_json)
     VALUES 
     (?, 1, 'Tell me about a time you handled a conflict within a development team.', 'tell me about a time you handled a conflict within a development team.', 'explore_background', '[]', 0.8, 'UNANSWERED', 0.0, 'test_seed', 'q_conflict', '{}'),
     (?, 1, 'Why are you interested in joining our organization at this stage of your career?', 'why are you interested in joining our organization at this stage of your career?', 'explore_background', '[]', 0.7, 'UNANSWERED', 0.0, 'test_seed', 'q_career', '{}'),
     (?, 1, 'What do you believe is your greatest professional accomplishment?', 'what do you believe is your greatest professional accomplishment?', 'explore_background', '[]', 0.85, 'UNANSWERED', 0.0, 'test_seed', 'q_accomplishment', '{}'),
     (?, 2, 'Why did you choose MySQL as the core persistent store for this architecture?', 'why did you choose mysql as the core persistent store for this architecture?', 'rationalize_db_choice', '["MySQL"]', 0.95, 'UNANSWERED', 0.0, 'test_seed', 'q_mysql', '{}'),
     (?, 2, 'How would you handle caching invalidation and Redis connection pooling under high load?', 'how would you handle caching invalidation and redis connection pooling under high load?', 'rationalize_cache_choice', '["Redis"]', 0.8, 'UNANSWERED', 0.0, 'test_seed', 'q_redis', '{}'),
     (?, 2, 'How did you load-test and validate system scalability targets?', 'how did you load-test and validate system scalability targets?', 'verify_scalability', '["scalability", "load testing"]', 0.85, 'UNANSWERED', 0.0, 'test_seed', 'q_scalability', '{}')`,
    [sessionId, sessionId, sessionId, sessionId, sessionId, sessionId]
  );
  console.log('Latent questions successfully seeded.');

  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  // @ts-ignore - Native WebSocket is globally available in Node 22+
  const client = new WebSocket(wsUrl);

  let currentTurnIndex = 0;

  function sendNextUserTurn() {
    if (currentTurnIndex >= USER_TURNS.length) {
      // Completed all 10 turns, generate report!
      generateFinalReport().catch(err => {
        console.error('Error generating report:', err);
        process.exit(1);
      });
      return;
    }

    const text = USER_TURNS[currentTurnIndex];
    console.log(`\n--- Sending Turn ${currentTurnIndex + 1}/${USER_TURNS.length}: "${text}" ---`);
    client.send(JSON.stringify({
      type: 'user.text',
      payload: { text }
    }));
    currentTurnIndex++;
  }

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    sendNextUserTurn();
  };

  client.onmessage = async (event: any) => {
    const parsed = JSON.parse(event.data);

    if (parsed.type === 'RESPONSE_GENERATION_COMPLETED') {
      console.log(`Agent ${parsed.payload.personaId} Output: "${parsed.payload.text}"`);
      // Schedule next user turn after a short delay
      setTimeout(sendNextUserTurn, 1500);
    } else if (parsed.type === 'ORCHESTRATOR_DECISION') {
      console.log(`<<< ORCHESTRATOR_DECISION: ${parsed.payload.action} (selected speaker: ${parsed.payload.selectedPersonaId})`);
      if (parsed.payload.action === 'WAIT') {
        // If orchestrator decided to wait, move to next turn immediately
        setTimeout(sendNextUserTurn, 1000);
      }
    } else if (parsed.type === 'QUESTION_REJECTED') {
      console.log(`<<< QUESTION_REJECTED: Persona ${parsed.payload.personaId} rejected. Reason: ${parsed.payload.reason}`);
    } else if (parsed.type === 'QUESTION_SATISFIED') {
      console.log(`<<< QUESTION_SATISFIED: Question ID ${parsed.payload.questionId} satisfied.`);
    }
  };

  client.onerror = async (err) => {
    console.error('WebSocket Error:', err);
    await pool.end();
    process.exit(1);
  };

  async function generateFinalReport() {
    console.log('\n============================================================');
    console.log('GENERATING FINAL REPORT FOR 10-TURN SIMULATION');
    console.log('============================================================');

    const [questions] = await pool.query(
      `SELECT * FROM latent_questions WHERE session_id = ?`,
      [sessionId]
    ) as any[];

    const created = questions.length;
    const asked = questions.filter(q => q.status === 'ASKED' || q.status === 'SATISFIED').length;
    const satisfied = questions.filter(q => q.status === 'SATISFIED').length;
    const partiallyAnswered = questions.filter(q => q.status === 'PARTIALLY_ANSWERED').length;

    const [proposals] = await pool.query(
      `SELECT * FROM agent_proposals WHERE session_id = ?`,
      [sessionId]
    ) as any[];

    const rejectedDuplicates = proposals.filter(
      p => p.status === 'rejected' && (p.reason.includes('already SATISFIED') || p.reason.includes('duplicate') || p.reason.includes('active duplicate'))
    ).length;

    // Check for violations (selected proposals that were duplicates or repeats)
    const [turns] = await pool.query(
      `SELECT * FROM conversation_turns WHERE session_id = ? AND speaker_type = 'agent' ORDER BY sequence_number ASC`,
      [sessionId]
    ) as any[];

    let violations = 0;
    const askedTexts = new Set<string>();
    
    for (const t of turns) {
      const textNorm = t.text.toLowerCase().trim().replace(/[?.!,]/g, '');
      if (askedTexts.has(textNorm)) {
        console.error(`VIOLATION DETECTED: Agent repeated question/utterance: "${t.text}"`);
        violations++;
      }
      askedTexts.add(textNorm);
    }

    console.log(`Questions created:                 ${created}`);
    console.log(`Questions asked:                   ${asked}`);
    console.log(`Questions satisfied:               ${satisfied}`);
    console.log(`Questions partially answered:      ${partiallyAnswered}`);
    console.log(`Questions rejected as duplicates:  ${rejectedDuplicates}`);
    console.log(`Repeated-question violations:      ${violations}`);
    console.log('============================================================');

    client.close();
    await pool.end();

    if (violations > 0) {
      console.error('FAIL: Repeated-question violations must be 0.');
      process.exit(1);
    }

    console.log('PASS: 10-turn multi-agent simulation completed with ZERO violations!');
    process.exit(0);
  }

  // Safety Timeout
  setTimeout(async () => {
    console.error('Test timed out.');
    client.close();
    await pool.end();
    process.exit(1);
  }, 95000);
}

runLongTest();
