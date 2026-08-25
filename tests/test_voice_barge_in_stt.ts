import { pool } from '../packages/database/src/connection.js';
import WebSocket from 'ws';

async function runBargeInSttTest() {
  console.log('Starting Voice Barge-In + STT E2E Test...');

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

  let sessionStarted = false;
  let aiResponseStarted = false;
  let aiAudioChunks = 0;
  let ttsCancelled = false;
  let finalTranscriptCount = 0;

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
      sessionStarted = true;
      
      // Send initial silence and then speech to get the AI to talk first
      const highEnergyBuffer = Buffer.alloc(640);
      for (let i = 0; i < highEnergyBuffer.length; i += 2) {
        highEnergyBuffer.writeInt16LE(15000, i);
      }
      for (let i = 0; i < 20; i++) {
        client.send(highEnergyBuffer);
      }
      setTimeout(() => {
        const silence = Buffer.alloc(640);
        for (let i = 0; i < 60; i++) {
          client.send(silence);
        }
      }, 500);
    }

    if (parsed.type === 'voice.ai.response.started') {
      aiResponseStarted = true;
      console.log('AI response started. Triggering user barge-in speech...');
      setTimeout(() => {
        const bargeInSignal = Buffer.alloc(640);
        for (let i = 0; i < bargeInSignal.length; i += 2) {
          bargeInSignal.writeInt16LE(15000, i);
        }
        for (let i = 0; i < 20; i++) {
          client.send(bargeInSignal);
        }

        // Send silence to end barge-in speech
        setTimeout(() => {
          console.log('Sending silence to end barge-in speech...');
          const silence = Buffer.alloc(640);
          for (let i = 0; i < 60; i++) {
            client.send(silence);
          }
        }, 500);
      }, 20);
    }

    if (parsed.type === 'voice.ai.audio.chunk') {
      aiAudioChunks++;
    }

    if (parsed.type === 'voice.ai.response.interrupted') {
      ttsCancelled = true;
      console.log('SUCCESS: Interruption signal received on client!');
    }

    if (parsed.type === 'voice.transcript.final') {
      finalTranscriptCount++;
    }
  };

  // Wait for barge-in and turn resolution
  await new Promise(resolve => setTimeout(resolve, 6000));
  client.close();

  console.log('\n--- Barge-In Test Assertions ---');
  console.log(`sessionStarted:        ${sessionStarted}`);
  console.log(`aiResponseStarted:     ${aiResponseStarted}`);
  console.log(`aiAudioChunks:         ${aiAudioChunks}`);
  console.log(`ttsCancelled:          ${ttsCancelled}`);
  console.log(`finalTranscriptCount:  ${finalTranscriptCount}`);

  // Fetch turns from database
  const [turns] = await pool.query(
    'SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY sequence_number',
    [sessionId]
  ) as any[];

  let userTurns = 0;
  for (const turn of turns) {
    if (turn.speaker_type === 'user') {
      userTurns++;
    }
  }

  console.log(`Total DB Turns:        ${turns.length}`);
  console.log(`User DB Turns:         ${userTurns}`);

  if (!ttsCancelled) throw new Error('Expected AI response to be interrupted');
  if (finalTranscriptCount === 0) throw new Error('Expected final transcripts to be produced');
  if (userTurns === 0) throw new Error('Expected user turns to be written to DB');

  console.log('\nSUCCESS: Barge-in + STT E2E test passed successfully!');
  process.exit(0);
}

runBargeInSttTest().catch(err => {
  console.error('FAIL: Barge-in STT test failed:', err);
  process.exit(1);
});
