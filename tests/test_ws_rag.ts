import { pool } from '../packages/database/src/connection.js';

async function runRagTest() {
  console.log('Starting Programmatic WebSocket Phase 3 Qdrant RAG E2E Test...');

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

  // 2. Upload a contradictory document to Qdrant via HTTP API
  console.log('Uploading system specification document...');
  const specText = "Official System Architecture Specification: The primary relational database used for storage in this project is PostgreSQL. We do not use MySQL.";
  const specBase64 = Buffer.from(specText).toString('base64');

  const uploadRes = await fetch(`http://localhost:3000/api/sessions/${sessionId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'system_spec.txt',
      fileBase64: specBase64
    })
  });

  const uploadData = await uploadRes.json() as any;
  console.log('Document upload result:', JSON.stringify(uploadData, null, 2));
  if (!uploadData.success) {
    console.error('FAIL: Document upload failed.');
    process.exit(1);
  }

  // 3. Connect to WebSocket
  const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  // @ts-ignore - Native WebSocket is globally available in Node 22+
  const client = new WebSocket(wsUrl);

  let retrievalStartedEmitted = false;
  let retrievalCompletedEmitted = false;
  let contradictionDetectedEmitted = false;

  client.onopen = () => {
    console.log('WebSocket connection opened.');
    // Send Turn: Stating we used MySQL (which contradicts PostgreSQL in the spec)
    setTimeout(() => {
      const msg = {
        type: 'user.text',
        payload: { text: 'We chose MySQL because our data was relational.' }
      };
      console.log('\n--- Sending Client Event (Turn 1): user.text ---');
      client.send(JSON.stringify(msg));
    }, 1000);
  };

  client.onmessage = async (event: any) => {
    const parsed = JSON.parse(event.data);

    if (parsed.type === 'RETRIEVAL_STARTED') {
      console.log('<<< RETRIEVAL_STARTED received.');
      retrievalStartedEmitted = true;
    } else if (parsed.type === 'RETRIEVAL_COMPLETED') {
      console.log(`<<< RETRIEVAL_COMPLETED received. Chunks count: ${parsed.payload.chunksCount}`);
      retrievalCompletedEmitted = true;
    } else if (parsed.type === 'CONTRADICTION_DETECTED') {
      console.log('<<< CONTRADICTION_DETECTED received!');
      console.log('Contradiction Details:', JSON.stringify(parsed.payload, null, 2));
      contradictionDetectedEmitted = true;
    } else if (parsed.type === 'ORCHESTRATOR_DECISION') {
      console.log(`<<< ORCHESTRATOR_DECISION: ${parsed.payload.action}`);
      
      // Once decision completes, we check assertions
      setTimeout(async () => {
        console.log('\n--- Running RAG Assertions ---');

        // Check if proposals in database were updated with CONTRADICTED status
        const [proposals] = await pool.query(
          `SELECT persona_id, action, content, status, evidence_status, evidence_citation FROM agent_proposals WHERE session_id = ?`,
          [sessionId]
        ) as any[];

        console.log('Database proposals evidence statuses:', JSON.stringify(proposals, null, 2));
        
        const hasContradicted = proposals.some(p => p.evidence_status === 'CONTRADICTED');

        console.log('RETRIEVAL_STARTED emitted:', retrievalStartedEmitted);
        console.log('RETRIEVAL_COMPLETED emitted:', retrievalCompletedEmitted);
        console.log('CONTRADICTION_DETECTED emitted:', contradictionDetectedEmitted);
        console.log('Database proposal marked CONTRADICTED:', hasContradicted);

        if (!retrievalStartedEmitted || !retrievalCompletedEmitted) {
          console.error('FAIL: RAG retrieval events were not correctly emitted.');
          process.exit(1);
        }

        if (!contradictionDetectedEmitted) {
          console.error('FAIL: Contradiction was not detected by the engine.');
          process.exit(1);
        }

        if (!hasContradicted) {
          console.error('FAIL: Proposal was not marked as CONTRADICTED in database.');
          process.exit(1);
        }

        console.log('PASS: RAG Ingestion, Retrieval and Contradiction alert flow successfully verified!');
        console.log('SUCCESS: Qdrant RAG Ingestion & Retrieval E2E Test Passed!');
        client.close();
        await pool.end();
        process.exit(0);
      }, 3000);
    }
  };

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

runRagTest();
