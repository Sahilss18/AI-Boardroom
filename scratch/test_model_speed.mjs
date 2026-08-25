import 'dotenv/config';

const key = process.env.XAI_API_KEY;

async function testModel(model) {
  const start = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Respond with JSON only: {"status": "success", "message": "hello"}' }],
        response_format: { type: 'json_object' }
      })
    });
    const data = await res.json();
    const elapsed = Date.now() - start;
    console.log(`[${model}] (${elapsed}ms):`, data.choices?.[0]?.message?.content?.slice(0, 100) || data);
  } catch (err) {
    console.error(`[${model}] ERROR:`, err.message);
  }
}

async function run() {
  await testModel('openai/gpt-oss-20b');
  await testModel('qwen/qwen3.6-27b');
}

run();
