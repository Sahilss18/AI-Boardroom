import { pool } from '../packages/database/src/connection.js';

async function runLifecycleTest() {
  console.log('Starting Programmatic WebSocket Phase 2B Question Lifecycle E2E Test...');

  // 1. Create a session via HTTP POST
  console.log('Creating session via HTTP POST /api/sessions...');
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
     (?, 2, 'Why did you choose MySQL as the core persistent store for this architecture?', 'why did you choose mysql as the core persistent store for this architecture?', 'rationalize_db_choice', '["MySQL"]', 0.9, 'UNANSWERED', 0.0, 'test_seed', 'q_mysql', '{}'),
     (?, 2, 'How did you load-test and validate system scalability targets?', 'how did you load-test and validate system scalability targets?', 'verify_scalability', '["scalability", "load testing"]', 0.8, 'UNANSWERED', 0.0, 'test_seed', 'q_scalability', '{}')`,
    [sessionId, sessionId, sessionId]
  );
  console.log('Latent questions successfully seeded.');

  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  // @ts-ignore - Native WebSocket is globally available in Node 22+
  const client = new WebSocket(wsUrl);

  let currentTurn = 1;
  let rejectedProposalsCount = 0;
  let mysqlQuestionSatisfied = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    // Turn 1: Introduce MySQL stack
    setTimeout(() => {
      const msg = {
        type: 'user.text',
        payload: { text: 'I built a microservices application using Node.js and MySQL.' }
      };
      console.log('\n--- Sending Client Event (Turn 1): user.text ---');
      client.send(JSON.stringify(msg));
    }, 1000);
  };

  client.onmessage = async (event: any) => {
    const parsed = JSON.parse(event.data);

    if (parsed.type === 'QUESTION_SATISFIED') {
      console.log(`<<< QUESTION_SATISFIED: Question ID ${parsed.payload.questionId} is SATISFIED.`);
      mysqlQuestionSatisfied = true;
    } else if (parsed.type === 'ORCHESTRATOR_DECISION') {
      console.log(`<<< ORCHESTRATOR_DECISION: selected speaker is Agent ${parsed.payload.selectedPersonaId}. Action: ${parsed.payload.action}`);
      if (currentTurn === 4 && parsed.payload.action === 'WAIT') {
        await runAssertions();
      }
    } else if (parsed.type === 'RESPONSE_GENERATION_COMPLETED') {
      console.log(`Agent Output: "${parsed.payload.text}"`);

      if (currentTurn === 1) {
        // Turn 2: Provide MySQL rationale to satisfy the question
        currentTurn = 2;
        setTimeout(() => {
          const msg = {
            type: 'user.text',
            payload: { text: 'We chose MySQL because our data is relational and requires ACID transactions.' }
          };
          console.log('\n--- Sending Client Event (Turn 2): user.text ---');
          client.send(JSON.stringify(msg));
        }, 2000);
      } else if (currentTurn === 2) {
        // Turn 3: Change topic to payments. The MySQL question is satisfied, so it should not be proposed or asked.
        currentTurn = 3;
        setTimeout(() => {
          const msg = {
            type: 'user.text',
            payload: { text: 'We also built a custom payments gateway service.' }
          };
          console.log('\n--- Sending Client Event (Turn 3): user.text ---');
          client.send(JSON.stringify(msg));
        }, 2000);
      } else if (currentTurn === 3) {
        // Turn 4: Try to trigger a similar question about MySQL choice
        currentTurn = 4;
        setTimeout(() => {
          const msg = {
            type: 'user.text',
            payload: { text: 'So MySQL was used, but did I tell you why we selected MySQL?' }
          };
          console.log('\n--- Sending Client Event (Turn 4): user.text ---');
          client.send(JSON.stringify(msg));
        }, 2000);
      } else if (currentTurn === 4) {
        await runAssertions();
      }
    }
  };

  async function runAssertions() {
    // Finish test and perform assertion checks
    console.log('\n--- Verifying Lifecycle State Rules ---');
    
    // Fetch questions from DB
    const [questions] = await pool.query(
      `SELECT question_id, status, satisfaction_score FROM latent_questions WHERE session_id = ?`,
      [sessionId]
    ) as any[];

    console.log('Database latent questions statuses:', JSON.stringify(questions, null, 2));

    const mysqlQ = questions.find((q: any) => q.question_id === 'q_mysql');
    if (!mysqlQ || mysqlQ.status !== 'SATISFIED') {
      console.error('FAIL: MySQL question should be in SATISFIED state.');
      process.exit(1);
    }

    // Fetch proposals from DB
    const [proposals] = await pool.query(
      `SELECT persona_id, action, content, status, reason FROM agent_proposals WHERE session_id = ?`,
      [sessionId]
    ) as any[];
    console.log('Database Proposals:', JSON.stringify(proposals, null, 2));

    // Check if there are any duplicate proposals rejected
    const rejectedDuplicate = proposals.some((p: any) => p.status === 'rejected' && (p.reason.includes('already SATISFIED') || p.reason.includes('duplicate') || p.reason.includes('active duplicate') || p.reason.includes('GLOBAL_QUESTION_ALREADY_SATISFIED') || p.reason.includes('cooldown') || p.reason.includes('recently asked') || p.reason.includes('recently')));
    
    if (!rejectedDuplicate) {
      console.error('FAIL: No duplicate or satisfied question proposal was rejected.');
      process.exit(1);
    }

    console.log('PASS: Proposal Validation Gate successfully caught and rejected duplicate/satisfied question proposals.');
    console.log('SUCCESS: Question Lifecycle Hardening E2E Test Passed!');
    client.close();
    await pool.end();
    process.exit(0);
  }

  client.onerror = async (err) => {
    console.error('WebSocket Error:', err);
    await pool.end();
    process.exit(1);
  };

  // Safety timeout
  setTimeout(async () => {
    console.error('Test timed out.');
    client.close();
    await pool.end();
    process.exit(1);
  }, 40000);
}

runLifecycleTest();
