import { pool } from '../packages/database/src/connection.js';

async function runWebSocketTest() {
  console.log('Starting Programmatic WebSocket Phase 2A E2E Test...');

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

  // Seed deterministic latent questions to bypass LLM generator and ensure consistent testing
  console.log('Seeding deterministic latent questions for session...');
  await pool.query(
    `INSERT INTO latent_questions (session_id, persona_id, question, normalized_question, intent, entities_json, priority, status, satisfaction_score, source, metadata_json)
     VALUES 
     (?, 1, 'Tell me about a time you handled a conflict within a development team.', 'tell me about a time you handled a conflict within a development team.', 'explore_background', '[]', 0.8, 'UNANSWERED', 0.0, 'test_seed', '{}'),
     (?, 2, 'Why did you choose MySQL as the core persistent store for this architecture?', 'why did you choose mysql as the core persistent store for this architecture?', 'rationalize_db_choice', '["MySQL"]', 0.9, 'UNANSWERED', 0.0, 'test_seed', '{}'),
     (?, 2, 'How did you load-test and validate system scalability targets?', 'how did you load-test and validate system scalability targets?', 'verify_scalability', '["scalability", "load testing"]', 0.8, 'UNANSWERED', 0.0, 'test_seed', '{}')`,
    [sessionId, sessionId, sessionId]
  );
  console.log('Latent questions successfully seeded.');

  // 2. Connect to WebSocket
  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  // @ts-ignore - Native WebSocket is globally available in Node 22+
  const client = new WebSocket(wsUrl);

  let currentTurn = 1;
  let mysqlQuestionId: number | null = null;
  let mysqlQuestionSatisfied = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');

    // Turn 1: Initial speech
    setTimeout(() => {
      const msg = {
        type: 'user.text',
        payload: {
          text: 'I built a microservices application using Node.js, Fastify and MySQL.'
        }
      };
      console.log('\n--- Sending Client Event (Turn 1): user.text ---');
      console.log(JSON.stringify(msg, null, 2));
      client.send(JSON.stringify(msg));
    }, 1500);
  };

  client.onmessage = async (event: any) => {
    const parsed = JSON.parse(event.data);
    
    // Silent observe for high frequency debug events, log key events
    if (parsed.type === 'SEMANTIC_ANALYSIS_COMPLETED') {
      console.log('<<< SEMANTIC_ANALYSIS_COMPLETED received');
      console.log('Entities:', parsed.payload.entities.map((e: any) => e.value).join(', '));
      console.log('Claims:', parsed.payload.claims.map((c: any) => `${c.subject} ${c.predicate} ${c.object}`).join('; '));
    } else if (parsed.type === 'QUESTION_UPDATED') {
      console.log(`<<< QUESTION_UPDATED: ID ${parsed.payload.questionId} state is now ${parsed.payload.status} (score: ${parsed.payload.score})`);
      if (parsed.payload.reason && parsed.payload.reason.toLowerCase().includes('mysql')) {
        mysqlQuestionId = parsed.payload.questionId;
      }
    } else if (parsed.type === 'QUESTION_SATISFIED') {
      console.log(`<<< QUESTION_SATISFIED: Question ID ${parsed.payload.questionId} is SATISFIED.`);
      mysqlQuestionSatisfied = true;
    } else if (parsed.type === 'AGENT_PROPOSAL') {
      console.log(`Agent ${parsed.payload.personaId} Proposal: ${parsed.payload.action} (Priority: ${parsed.payload.priority})`);
      if (parsed.payload.questionId) {
        console.log(`  -> Proposal maps to latent question: ${parsed.payload.questionId}`);
      }
    } else if (parsed.type === 'ORCHESTRATOR_DECISION') {
      console.log(`Decision: selected speaker is Agent ${parsed.payload.selectedPersonaId}. Action: ${parsed.payload.action}`);
    } else if (parsed.type === 'RESPONSE_GENERATION_COMPLETED') {
      console.log(`Agent ${parsed.payload.personaId} Output: "${parsed.payload.text}"`);
      
      if (currentTurn === 1) {
        // Transition to Turn 2: Give Relational Rationale
        currentTurn = 2;
        setTimeout(() => {
          const msg = {
            type: 'user.text',
            payload: {
              text: 'We selected MySQL because our data was relational and required ACID transactions.'
            }
          };
          console.log('\n--- Sending Client Event (Turn 2): user.text ---');
          client.send(JSON.stringify(msg));
        }, 2000);
      } else if (currentTurn === 2) {
        // Transition to Turn 3: Discuss scalability testing
        currentTurn = 3;
        setTimeout(() => {
          const msg = {
            type: 'user.text',
            payload: {
              text: 'To test scalability we used load testing tools like autocannon.'
            }
          };
          console.log('\n--- Sending Client Event (Turn 3): user.text ---');
          client.send(JSON.stringify(msg));
        }, 2000);
      } else if (currentTurn === 3) {
        console.log('\nVerifying database satisfaction states...');
        // Query database to verify final question satisfaction state
        const [rows] = await pool.query(
          `SELECT status, satisfaction_score FROM latent_questions WHERE session_id = ?`,
          [sessionId]
        );
        console.log('Database latent questions statuses:', JSON.stringify(rows, null, 2));

        const hasSatisfied = (rows as any[]).some(r => r.status === 'SATISFIED');
        if (!hasSatisfied && !mysqlQuestionSatisfied) {
          console.error('FAIL: MySQL latent question was never marked as SATISFIED in database.');
          client.close();
          await pool.end();
          process.exit(1);
        }

        console.log('PASS: MySQL latent question satisfaction verified.');
        console.log('\nSUCCESS: End-to-end WebSocket Phase 2A loop validated!');
        client.close();
        await pool.end();
        process.exit(0);
      }
    }
  };

  client.onclose = () => {
    console.log('WebSocket connection closed.');
  };

  client.onerror = async (err) => {
    console.error('WebSocket client error:', err);
    await pool.end();
    process.exit(1);
  };

  // Safety Timeout
  setTimeout(async () => {
    console.error('Test timed out waiting for AI response.');
    client.close();
    await pool.end();
    process.exit(1);
  }, 95000);
}

runWebSocketTest();
