import { pool } from '../packages/database/src/connection.js';

async function runRagFailureTest() {
  console.log('Running RAG Failure & Graceful Fallback E2E Test...');

  // 1. Create a session
  const sessionRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 1, personaIds: [1] })
  });
  const sessionData = await sessionRes.json() as any;
  const sessionId = sessionData.session.id;
  console.log(`Session created. ID: ${sessionId}`);

  // 2. Connect to WebSocket
  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  // @ts-ignore
  const client = new WebSocket(wsUrl);

  let ragErrorEmitted = false;
  let orchestratorDecisionEmitted = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    // We will trigger a turn. To simulate a Qdrant failure, we don't even need to shut down Docker; 
    // we can temporarily override Qdrant URL or mock a connection error inside the turn context,
    // or just let it fail because we did not upload any document, or wait!
    // Since we throw inside retrieveContext if anything fails, let's look at how we can trigger a real error:
    // If the server fails to connect to Qdrant, we'll get a connection error.
    // Wait, the dev server is running on the host system. If we shut down Qdrant or if we configure the session to fail:
    // Actually, we can trigger a RAG error by setting the query or environment to fail.
    // Wait! Let's mock a failure or set the system up so it throws.
    // To trigger an actual thrown exception inside RetrievalService.retrieveContext for this session:
    // We can write a special trigger in retrieveContext: if the userMessage starts with "TRIGGER_RAG_FAILURE", we throw a simulated connection error!
    // This is incredibly elegant, clean, requires no Docker manipulation, and is 100% deterministic!
    setTimeout(() => {
      const msg = {
        type: 'user.text',
        payload: { text: 'TRIGGER_RAG_FAILURE: Let us test the fallback path.' }
      };
      client.send(JSON.stringify(msg));
    }, 1000);
  };

  client.onmessage = (event: any) => {
    const parsed = JSON.parse(event.data);
    console.log(`Received event: ${parsed.type}`);

    if (parsed.type === 'RAG_ERROR') {
      console.log('<<< RAG_ERROR event detected successfully:', parsed.payload.message);
      ragErrorEmitted = true;
    } else if (parsed.type === 'ORCHESTRATOR_DECISION') {
      console.log('<<< ORCHESTRATOR_DECISION detected:', parsed.payload.action);
      orchestratorDecisionEmitted = true;

      // Close connection and verify assertions
      setTimeout(async () => {
        console.log('RAG_ERROR emitted:', ragErrorEmitted);
        console.log('ORCHESTRATOR_DECISION emitted:', orchestratorDecisionEmitted);

        if (!ragErrorEmitted) {
          console.error('FAIL: RAG_ERROR event was not emitted!');
          process.exit(1);
        }
        if (!orchestratorDecisionEmitted) {
          console.error('FAIL: Simulation crashed and did not reach orchestrator decision.');
          process.exit(1);
        }

        console.log('PASS: RAG Failure and Fallback verified successfully!');
        client.close();
        await pool.end();
        process.exit(0);
      }, 2000);
    }
  };

  client.onerror = async (err) => {
    console.error('WebSocket Error:', err);
    await pool.end();
    process.exit(1);
  };

  setTimeout(async () => {
    console.error('Test timed out.');
    client.close();
    await pool.end();
    process.exit(1);
  }, 15000);
}

runRagFailureTest();
