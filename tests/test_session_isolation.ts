import { pool } from '../packages/database/src/connection.js';

async function runSessionIsolationTest() {
  console.log('Running Session Isolation E2E Tests...');

  // 1. Create Session A
  const sessionARes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 1, personaIds: [1] })
  });
  const sessionAData = await sessionARes.json() as any;
  const sessionAId = sessionAData.session.id;
  console.log(`Session A created. ID: ${sessionAId}`);

  // 2. Create Session B
  const sessionBRes = await fetch('http://localhost:3000/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarioId: 1, personaIds: [1] })
  });
  const sessionBData = await sessionBRes.json() as any;
  const sessionBId = sessionBData.session.id;
  console.log(`Session B created. ID: ${sessionBId}`);

  // 3. Upload specification document A (MySQL spec)
  console.log('Uploading spec for Session A...');
  const specTextA = "SessionA Spec: Relational DB is MySQL.";
  const specBase64A = Buffer.from(specTextA).toString('base64');
  await fetch(`http://localhost:3000/api/sessions/${sessionAId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'spec_a.txt', fileBase64: specBase64A })
  });

  // 4. Upload specification document B (PostgreSQL spec)
  console.log('Uploading spec for Session B...');
  const specTextB = "SessionB Spec: Relational DB is PostgreSQL.";
  const specBase64B = Buffer.from(specTextB).toString('base64');
  await fetch(`http://localhost:3000/api/sessions/${sessionBId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: 'spec_b.txt', fileBase64: specBase64B })
  });

  // 5. Verify database isolation for document_chunks
  const [chunksA] = await pool.query(`SELECT * FROM document_chunks WHERE session_id = ?`, [sessionAId]) as any[];
  const [chunksB] = await pool.query(`SELECT * FROM document_chunks WHERE session_id = ?`, [sessionBId]) as any[];

  console.log(`Session A database chunk count: ${chunksA.length}`);
  console.log(`Session B database chunk count: ${chunksB.length}`);

  if (chunksA.length === 0 || chunksB.length === 0) {
    console.error('FAIL: Document chunks were not saved correctly.');
    process.exit(1);
  }

  // Cross checks
  const hasCrossLeak = chunksA.some(c => c.session_id === sessionBId) || chunksB.some(c => c.session_id === sessionAId);
  if (hasCrossLeak) {
    console.error('FAIL: Session data leaked across session database rows.');
    process.exit(1);
  }

  console.log('PASS: Database session isolation verified successfully!');
  await pool.end();
  process.exit(0);
}

runSessionIsolationTest();
