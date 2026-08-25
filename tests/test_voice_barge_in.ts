import { pool } from '../packages/database/src/connection.js';

async function runBargeInTest() {
  console.log('Starting Voice Barge-In E2E Test...');

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
    console.log('Failed to create session:', sessionData);
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
  // @ts-ignore
  const client = new WebSocket(wsUrl);

  let receivedVoiceSessionStarted = false;
  let receivedSpeechStarted = false;
  let receivedAiResponseStarted = false;
  let receivedAiResponseInterrupted = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    // Start voice session
    client.send(JSON.stringify({ type: 'voice.session.start', payload: {} }));
  };

  client.onmessage = async (event) => {
    const dataStr = event.data.toString();
    if (!dataStr.trim().startsWith('{')) return;
    const parsed = JSON.parse(dataStr);
    console.log(`<<< Event received: ${parsed.type}`);

    if (parsed.type === 'voice.session.started') {
      receivedVoiceSessionStarted = true;
      
      // Send some silence first
      const silence = Buffer.alloc(640);
      client.send(silence);

      // Trigger user turn using high energy PCM buffer to make VAD transition to USER_SPEAKING
      setTimeout(() => {
        console.log('Sending high energy speech frames to start user speaking...');
        let phase = 0;
        // Send multiple frames to accumulate VAD speech duration
        for (let f = 0; f < 15; f++) {
          const highEnergyFrame = Buffer.alloc(640);
          for (let i = 0; i < 320; i++) {
            const val = Math.sin(phase) * 15000;
            phase += (2 * Math.PI * 150) / 16000;
            highEnergyFrame.writeInt16LE(Math.round(val), i * 2);
          }
          client.send(highEnergyFrame);
        }
      }, 500);
    }

    if (parsed.type === 'voice.speech.started') {
      receivedSpeechStarted = true;
      console.log('VAD Speech Start detected.');
      
      // Stop user speech by sending silence frames
      setTimeout(() => {
        console.log('Sending silence frames to trigger speech ended...');
        const silence = Buffer.alloc(640);
        for (let f = 0; f < 50; f++) {
          client.send(silence);
        }
      }, 500);
    }

    if (parsed.type === 'voice.ai.response.started') {
      receivedAiResponseStarted = true;
      console.log('AI response started. Triggering barge-in interruption...');

      // User interrupts by sending speech frames again
      setTimeout(() => {
        let phase = 0;
        for (let f = 0; f < 15; f++) {
          const highEnergyFrame = Buffer.alloc(640);
          for (let i = 0; i < 320; i++) {
            const val = Math.sin(phase) * 15000;
            phase += (2 * Math.PI * 150) / 16000;
            highEnergyFrame.writeInt16LE(Math.round(val), i * 2);
          }
          client.send(highEnergyFrame);
        }
      }, 100);
    }

    if (parsed.type === 'voice.ai.response.interrupted') {
      receivedAiResponseInterrupted = true;
      console.log('SUCCESS: Barge-in interruption detected on backend.');
      client.close();
    }
  };

  client.onclose = async () => {
    console.log('\n--- Barge-in Test Results ---');
    console.log('voice.session.started:', receivedVoiceSessionStarted);
    console.log('voice.speech.started:', receivedSpeechStarted);
    console.log('voice.ai.response.started:', receivedAiResponseStarted);
    console.log('voice.ai.response.interrupted:', receivedAiResponseInterrupted);

    const assertionsPass = 
      receivedVoiceSessionStarted && 
      receivedSpeechStarted && 
      receivedAiResponseStarted && 
      receivedAiResponseInterrupted;

    if (assertionsPass) {
      console.log('PASS: Barge-in test assertions verified successfully!');
      await pool.end();
      process.exit(0);
    } else {
      console.error('FAIL: Barge-in test failed.');
      await pool.end();
      process.exit(1);
    }
  };
}

runBargeInTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
