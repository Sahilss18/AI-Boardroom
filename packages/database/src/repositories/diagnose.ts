import { pool } from 'c:/Users/sahil/OneDrive/Desktop/ReflexAi/packages/database/src/connection.js';

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
  console.log(JSON.stringify(questions, null, 2));

  const [proposals] = await pool.query('SELECT id, persona_id, action, content, status, reason, evidence_status FROM agent_proposals WHERE session_id = ?', [sessionId]) as any[];
  console.log('\n--- Proposals ---');
  console.log(JSON.stringify(proposals, null, 2));

  const [turns] = await pool.query('SELECT * FROM conversation_turns WHERE session_id = ? ORDER BY sequence_number ASC', [sessionId]) as any[];
  console.log('\n--- Conversation Turns ---');
  console.log(JSON.stringify(turns.map((t: any) => ({
    seq: t.sequence_number,
    speaker: t.speaker_type,
    persona: t.persona_id,
    text: t.content || t.message || t.text
  })), null, 2));

  await pool.end();
}

diagnose();
