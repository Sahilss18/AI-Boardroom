import { pool } from '../packages/database/src/connection.js';
import WebSocket from 'ws';

async function runSttE2ETest() {
  console.log('Starting Voice + STT E2E Integration Test...');

  // 1. Create a session via HTTP POST
  const sessionRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 1,
      personaIds: [1, 2]
    })
  });

  const sessionData = await sessionRes.json() as any;
  if (!sessionData.success || !sessionData.session) {
    console.error('Failed to create session:', sessionData);
    process.exit(1);
  }

  const sessionId = sessionData.session.id;
  console.log(`Session created successfully. ID: ${sessionId}`);

  // Seed deterministic latent questions
  await pool.query(
    `INSERT INTO latent_questions (session_id, persona_id, question, normalized_question, intent, entities_json, priority, status, satisfaction_score, source, question_id, metadata_json)
     VALUES (?, 2, 'Why did you choose MySQL?', 'why did you choose mysql', 'rationalize_db_choice', '[]', 0.9, 'UNANSWERED', 0.0, 'test_seed', 'q_mysql', '{}')`,
    [sessionId]
  );

  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  const client = new WebSocket(wsUrl);

  let voiceSessionStarted = false;
  let speechStarted = false;
  let partialReceived = 0;
  let finalReceived = 0;
  let processingStarted = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    client.send(JSON.stringify({ type: 'voice.session.start', payload: {} }));
  };

  client.onmessage = async (event) => {
    const dataStr = event.data.toString();
    if (!dataStr.trim().startsWith('{')) return;
    const parsed = JSON.parse(dataStr);
    console.log(`<<< Event received: ${parsed.type}`);

    if (parsed.type === 'voice.session.started') {
      voiceSessionStarted = true;
      
      // Start sending audio
      // Modulated signal to trigger speech start in VAD test mock boost
      const highEnergyBuffer = Buffer.alloc(640);
      for (let i = 0; i < highEnergyBuffer.length; i += 2) {
        // High energy wave
        highEnergyBuffer.writeInt16LE(15000, i);
      }

      console.log('Sending high energy speech frames to start user speaking...');
      for (let i = 0; i < 20; i++) {
        client.send(highEnergyBuffer);
      }

      // Then send silence to end speech
      setTimeout(() => {
        console.log('Sending silence frames to trigger speech ended...');
        const silence = Buffer.alloc(640);
        for (let i = 0; i < 60; i++) {
          client.send(silence);
        }
      }, 500);
    }

    if (parsed.type === 'voice.speech.started') {
      speechStarted = true;
    }

    if (parsed.type === 'voice.transcript.partial') {
      partialReceived++;
    }

    if (parsed.type === 'voice.transcript.final') {
      finalReceived++;
    }

    if (parsed.type === 'voice.processing.started') {
      processingStarted = true;
    }
  };

  // Wait for turn to complete and verify
  await new Promise(resolve => setTimeout(resolve, 5000));
  client.close();

  console.log('\n--- E2E Assertion Verification ---');
  console.log(`voice.session.started:     ${voiceSessionStarted}`);
  console.log(`voice.speech.started:      ${speechStarted}`);
  console.log(`voice.transcript.partial:  ${partialReceived > 0}`);
  console.log(`voice.transcript.final:    ${finalReceived}`);
  console.log(`voice.processing.started:  ${processingStarted}`);

  // Fetch turns from database
  const [turns] = await pool.query(
    'SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY sequence_number',
    [sessionId]
  ) as any[];

  console.log(`Turns in DB: ${turns.length}`);

  let semanticAnalysisCount = 0;
  for (const turn of turns) {
    if (turn.speaker_type === 'user') {
      semanticAnalysisCount++;
    }
  }

  console.log(`Semantic Analysis Turns (User turns): ${semanticAnalysisCount}`);

  // Assertions
  if (!voiceSessionStarted) throw new Error('voice.session.started not received');
  if (!speechStarted) throw new Error('voice.speech.started not received');
  if (process.env.VAD_TEST_MOCK === 'true' && partialReceived === 0) {
    throw new Error('No partial transcripts received');
  }
  if (finalReceived !== 1) throw new Error(`Expected exactly 1 final transcript, got ${finalReceived}`);
  if (semanticAnalysisCount !== 1) throw new Error(`Expected exactly 1 user turn processed, got ${semanticAnalysisCount}`);

  console.log('\nSUCCESS: VAD + STT E2E Integration E2E Test Passed!');
  process.exit(0);
}

runSttE2ETest().catch(err => {
  console.error('FAIL: E2E Integration test failed:', err);
  process.exit(1);
});
