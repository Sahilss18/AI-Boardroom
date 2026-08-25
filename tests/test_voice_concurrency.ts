import WebSocket from 'ws';
import { performance } from 'perf_hooks';

const CONCURRENCY_LIMIT = 10;
const TEST_DURATION_MS = 20000;

interface SessionMetric {
  sessionId: number;
  connectTime: number;
  firstPartialTime: number | null;
  finalTime: number | null;
  errors: string[];
}

async function runSession(index: number): Promise<SessionMetric> {
  const metric: SessionMetric = {
    sessionId: 0,
    connectTime: 0,
    firstPartialTime: null,
    finalTime: null,
    errors: []
  };

  try {
    const start = performance.now();
    // 1. Create session via HTTP
    const res = await fetch('http://localhost:3000/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId: 1, personaIds: [1, 2] })
    });
    const data = await res.json() as any;
    if (!data.success || !data.session) {
      throw new Error(`Failed to create session: ${JSON.stringify(data)}`);
    }

    const sessionId = data.session.id;
    metric.sessionId = sessionId;

    const wsUrl = `ws://localhost:3000/ws/sessions/${sessionId}`;
    const ws = new WebSocket(wsUrl);

    return new Promise((resolve) => {
      ws.onopen = () => {
        metric.connectTime = performance.now() - start;
        ws.send(JSON.stringify({ type: 'voice.session.start', payload: {} }));
      };

      ws.onmessage = (event) => {
        const dataStr = event.data.toString();
        if (!dataStr.trim().startsWith('{')) return;
        const parsed = JSON.parse(dataStr);
        const elapsed = performance.now() - start;

        if (parsed.type === 'voice.session.started') {
          // Send high energy PCM speech frames
          const highEnergyBuffer = Buffer.alloc(640);
          for (let i = 0; i < highEnergyBuffer.length; i += 2) {
            highEnergyBuffer.writeInt16LE(15000, i);
          }
          for (let i = 0; i < 20; i++) {
            ws.send(highEnergyBuffer);
          }
          
          setTimeout(() => {
            const silence = Buffer.alloc(640);
            for (let i = 0; i < 60; i++) {
              ws.send(silence);
            }
          }, 400);
        }

        if (parsed.type === 'voice.transcript.partial' && metric.firstPartialTime === null) {
          metric.firstPartialTime = elapsed;
        }

        if (parsed.type === 'voice.transcript.final') {
          metric.finalTime = elapsed;
          ws.close();
          resolve(metric);
        }
      };

      ws.onerror = (err) => {
        metric.errors.push(err.message);
        ws.close();
        resolve(metric);
      };

      // Safety timeout
      setTimeout(() => {
        ws.close();
        resolve(metric);
      }, TEST_DURATION_MS);
    });
  } catch (err: any) {
    metric.errors.push(err.message);
    return metric;
  }
}

async function runConcurrencyTest() {
  console.log(`Launching Voice Concurrency Performance Test with ${CONCURRENCY_LIMIT} simultaneous sessions...`);
  
  const startMemory = process.memoryUsage().heapUsed;
  const startTime = performance.now();

  const promises: Promise<SessionMetric>[] = [];
  for (let i = 0; i < CONCURRENCY_LIMIT; i++) {
    promises.push(runSession(i));
  }

  const results = await Promise.all(promises);
  
  const endMemory = process.memoryUsage().heapUsed;
  const duration = performance.now() - startTime;

  console.log('\n============================================================');
  console.log('CONCURRENCY METRICS SUMMARY');
  console.log('============================================================');
  console.log(`Active Parallel Connections:    ${results.length}`);
  console.log(`Total Execution Time (ms):       ${duration.toFixed(2)}`);
  console.log(`Memory Usage Delta (MB):        ${((endMemory - startMemory) / 1024 / 1024).toFixed(2)}`);
  
  let successfulSessions = 0;
  let totalConnectTime = 0;
  let totalFirstPartialTime = 0;
  let totalFinalTime = 0;

  results.forEach(res => {
    if (res.errors.length === 0 && res.finalTime !== null) {
      successfulSessions++;
      totalConnectTime += res.connectTime;
      if (res.firstPartialTime) totalFirstPartialTime += res.firstPartialTime;
      if (res.finalTime) totalFinalTime += res.finalTime;
    } else {
      console.log(`Session ${res.sessionId} experienced errors:`, res.errors);
    }
  });

  console.log(`Successful turns completed:     ${successfulSessions}/${CONCURRENCY_LIMIT}`);
  if (successfulSessions > 0) {
    console.log(`Avg Connection Setup Latency:   ${(totalConnectTime / successfulSessions).toFixed(2)} ms`);
    console.log(`Avg Time to First Partial:      ${(totalFirstPartialTime / successfulSessions).toFixed(2)} ms`);
    console.log(`Avg Turn Finalization Latency:   ${(totalFinalTime / successfulSessions).toFixed(2)} ms`);
  }

  if (successfulSessions === CONCURRENCY_LIMIT) {
    console.log('\nSUCCESS: 10-session concurrency performance test completed without errors!');
    process.exit(0);
  } else {
    console.error('\nFAIL: One or more sessions failed concurrency assertions.');
    process.exit(1);
  }
}

runConcurrencyTest().catch(err => {
  console.error('FAIL: Concurrency runner caught error:', err);
  process.exit(1);
});
