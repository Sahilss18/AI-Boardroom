import { pool } from './packages/database/src/connection.js';

async function diagnose() {
  const [sessions] = await pool.query('SELECT id, current_turn FROM sessions ORDER BY id DESC LIMIT 1') as any[];
  if (sessions.length === 0) {
    console.log('No sessions found.');
    await pool.end();
    return;
  }
  const sessionId = sessions[0].id;
  console.log(`Latest Session ID: ${sessionId}, Turn: ${sessions[0].current_turn}`);

  const [questions] = await pool.query('SELECT id, persona_id, question, status, satisfaction_score, canonical_question_id FROM latent_questions WHERE session_id = ?', [sessionId]) as any[];
  console.log('\n--- Latent Questions ---');
  for (const q of questions) {
    console.log(`ID: ${q.id} | Persona: ${q.persona_id} | Status: ${q.status} | Score: ${q.satisfaction_score} | Canonical: ${q.canonical_question_id} | Q: "${q.question}"`);
  }

  const [proposals] = await pool.query('SELECT id, persona_id, action, content, status, reason, evidence_status FROM agent_proposals WHERE session_id = ?', [sessionId]) as any[];
  console.log('\n--- Proposals ---');
  for (const p of proposals) {
    console.log(`ID: ${p.id} | Persona: ${p.persona_id} | Status: ${p.status} | Reason: ${p.reason} | Content: "${p.content}"`);
  }

  await pool.end();
}

diagnose();
