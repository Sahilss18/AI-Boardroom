import { pool } from '../packages/database/src/connection.js';

async function runCrossTalkTest() {
  console.log('Starting Voice Cross-Talk E2E Test...');

  // 1. Create a session via HTTP POST
  const sessionRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 1,
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

  // Seed deterministic questions
  await pool.query(
    `INSERT INTO latent_questions (session_id, persona_id, question, normalized_question, intent, entities_json, priority, status, satisfaction_score, source, question_id, metadata_json)
     VALUES (?, 2, 'Why did you choose MySQL?', 'why did you choose mysql', 'rationalize_db_choice', '[]', 0.9, 'UNANSWERED', 0.0, 'test_seed', 'q_mysql', '{}')`,
    [sessionId]
  );

  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  // @ts-ignore
  const client = new WebSocket(wsUrl);

  const internalMessagesReceived: any[] = [];
  const voiceAiAudioChunks: any[] = [];
  let orchestratorDecision: any = null;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    // Start voice session
    client.send(JSON.stringify({ type: 'voice.session.start', payload: {} }));

    // Send high energy speech frames to start user speaking
    setTimeout(() => {
      console.log('Sending user speech...');
      const highEnergyFrame = Buffer.alloc(640);
      for (let i = 0; i < 320; i++) {
        const t = i / 16000;
        const val = Math.sin(2 * Math.PI * 150 * t) * 15000;
        highEnergyFrame.writeInt16LE(Math.round(val), i * 2);
      }
      for (let f = 0; f < 15; f++) {
        client.send(highEnergyFrame);
      }
    }, 500);

    // End user speech
    setTimeout(() => {
      console.log('Sending silence...');
      const silence = Buffer.alloc(640);
      for (let f = 0; f < 50; f++) {
        client.send(silence);
      }
    }, 1000);
  };

  client.onmessage = async (event) => {
    const dataStr = event.data.toString();
    if (!dataStr.trim().startsWith('{')) return;
    const parsed = JSON.parse(dataStr);
    
    if (parsed.type === 'AGENT_INTERNAL_MESSAGE') {
      internalMessagesReceived.push(parsed.payload);
      console.log(`<<< Internal Deliberation Message: ${parsed.payload.fromPersonaId} -> ${parsed.payload.toPersonaId}: "${parsed.payload.content}"`);
    }

    if (parsed.type === 'ORCHESTRATOR_DECISION') {
      orchestratorDecision = parsed.payload;
    }

    if (parsed.type === 'voice.ai.audio.chunk') {
      voiceAiAudioChunks.push(parsed.payload);
    }

    if (parsed.type === 'voice.ai.response.completed') {
      // Completed, verify constraints
      client.close();
    }
  };

  client.onclose = async () => {
    console.log('\n--- Cross-Talk Test Results ---');
    console.log('AGENT_INTERNAL_MESSAGE events received:', internalMessagesReceived.length);
    console.log('Selected Speaker Persona:', orchestratorDecision?.selectedPersonaId);
    console.log('voice.ai.audio.chunk chunks received:', voiceAiAudioChunks.length);

    // Check database to ensure internal messages did not enter user transcript
    const [turns] = await pool.query(
      'SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY sequence_number ASC',
      [sessionId]
    ) as any[];

    console.log('Conversation turns in DB:', turns.length);

    const hasInternalMessageInTranscript = turns.some((t: any) => 
      t.text.includes('explanation of their technical decisions') || 
      t.text.includes('hosting costs and budget')
    );

    console.log('Internal messages in user transcript DB:', hasInternalMessageInTranscript);

    // Assertions
    const assertionsPass = 
      internalMessagesReceived.length > 0 &&
      voiceAiAudioChunks.length > 0 &&
      !hasInternalMessageInTranscript;

    if (assertionsPass) {
      console.log('PASS: Cross-talk and internal deliberation bus isolation verified successfully!');
      await pool.end();
      process.exit(0);
    } else {
      console.error('FAIL: Cross-talk test assertions failed.');
      await pool.end();
      process.exit(1);
    }
  };
}

runCrossTalkTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
