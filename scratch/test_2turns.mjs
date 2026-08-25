import { WebSocket } from 'ws';

async function runMultiTurnTest() {
  console.log('[TEST] Creating session...');
  const res = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioId: 1,
      personaIds: [1, 2],
    })
  });
  const sessionData = await res.json();
  const sessionId = sessionData.session?.id || sessionData.id;
  console.log(`[TEST] Created session: ${sessionId}`);

  const ws = new WebSocket(`ws://localhost:3000/ws/sessions/${sessionId}`);

  await new Promise((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });
  console.log('[TEST] Connected to WebSocket.');

  function waitForEvent(eventType, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${eventType}`)), timeoutMs);
      const handler = (data) => {
        try {
          const msg = JSON.parse(data.toString());
          console.log(`[EVENT] ${msg.type} ::`, JSON.stringify(msg.payload).slice(0, 180));
          if (msg.type === eventType) {
            clearTimeout(timer);
            ws.off('message', handler);
            resolve(msg.payload);
          }
        } catch (e) {}
      };
      ws.on('message', handler);
    });
  }

  // TURN 1
  console.log('\n=== SENDING TURN 1 ===');
  ws.send(JSON.stringify({
    type: 'user.text',
    payload: {
      text: "I built a microservices application using Node.js and MySQL that handles 100000 concurrent users."
    }
  }));

  const turn1Response = await waitForEvent('RESPONSE_GENERATION_COMPLETED');
  console.log(`\n✅ TURN 1 AGENT REPLY [Persona ${turn1Response.personaId}]:\n"${turn1Response.text}"\n`);

  // Wait 3s before next turn
  await new Promise(r => setTimeout(r, 3000));

  // TURN 2: Candidate answers with specific load testing details
  console.log('\n=== SENDING TURN 2 ===');
  ws.send(JSON.stringify({
    type: 'user.text',
    payload: {
      text: "We used k6 and Locust distributed across 5 EC2 load generators. We ran ramp-up tests reaching 100k users over 15 minutes, maintaining p99 latency under 120ms with a 0.02% error rate."
    }
  }));

  const turn2Response = await waitForEvent('RESPONSE_GENERATION_COMPLETED');
  console.log(`\n✅ TURN 2 AGENT REPLY [Persona ${turn2Response.personaId}]:\n"${turn2Response.text}"\n`);

  ws.close();
  console.log('=== MULTI-TURN BOARDROOM TEST PASSED ===');
}

runMultiTurnTest().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
