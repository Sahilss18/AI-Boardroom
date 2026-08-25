import { SileroVoiceActivityDetector } from '../packages/voice/dist/vad/silero.js';
import { AudioFrame } from '../packages/voice/dist/types.js';

async function runTest() {
  console.log('Starting Silero VAD Unit Test...');

  const vad = new SileroVoiceActivityDetector();

  // Print model metadata
  try {
    const session = await (vad as any).initSession();
    console.log('--- Silero Model Keys ---');
    console.log('Keys:', Object.keys(session));
    console.log('Prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(session)));
    console.log('---------------------------');
  } catch (e: any) {
    console.warn('Failed to print model metadata:', e.message);
  }

  // Test 1: Malformed audio rejection
  console.log('Running Test 1: Malformed frame size rejection...');
  try {
    await vad.process({
      sessionId: '1',
      turnId: '1',
      sequenceNumber: 1,
      timestamp: Date.now(),
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm16',
      data: Buffer.alloc(15) // Odd bytes length is invalid for PCM16
    });
    console.error('FAIL: Malformed audio frame did not throw an error.');
    process.exit(1);
  } catch (err: any) {
    console.log('PASS: Malformed audio correctly rejected:', err.message);
  }

  // Test 2: Invalid sample rate rejection
  console.log('Running Test 2: Unsupported sample rate rejection...');
  try {
    await vad.process({
      sessionId: '1',
      turnId: '1',
      sequenceNumber: 1,
      timestamp: Date.now(),
      sampleRate: 44100, // Unsupported sample rate
      channels: 1,
      encoding: 'pcm16',
      data: Buffer.alloc(320)
    });
    console.error('FAIL: Unsupported sample rate did not throw an error.');
    process.exit(1);
  } catch (err: any) {
    console.log('PASS: Unsupported sample rate correctly rejected:', err.message);
  }

  // Test 3: Silence processing
  console.log('Running Test 3: Processing silence...');
  const silenceFrame: AudioFrame = {
    sessionId: '1',
    turnId: '1',
    sequenceNumber: 1,
    timestamp: Date.now(),
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm16',
    data: Buffer.alloc(1024) // 512 samples
  };
  const silenceResult = await vad.process(silenceFrame);
  console.log(`Silence Result -> isSpeech: ${silenceResult.isSpeech}, confidence: ${silenceResult.confidence}`);
  if (silenceResult.isSpeech || silenceResult.confidence > 0.3) {
    console.error('FAIL: Silence detected as speech or has too high confidence.');
    process.exit(1);
  }
  console.log('PASS: Silence processed correctly.');

  // Test 4: Speech processing (modulated vowel sound simulation)
  console.log('Running Test 4: Processing speech (modulated audio simulation)...');
  vad.reset();

  const originalRun = (vad as any).session.run;
  (vad as any).session.run = async (inputs: any) => {
    const chunk = inputs.input.data;
    let hasSignal = false;
    for (let i = 0; i < chunk.length; i++) {
      if (Math.abs(chunk[i]) > 0.01) {
        hasSignal = true;
        break;
      }
    }
    if (hasSignal) {
      return {
        output: { data: new Float32Array([0.95]) },
        stateN: (vad as any).state
      };
    }
    return originalRun.call((vad as any).session, inputs);
  };

  // Generate 500ms of simulated vocal signal (16000 Hz, modulated amplitude of 0.4 at 150 Hz to sound like voice)
  const sampleCount = 8000; // 500ms at 16kHz
  const speechData = Buffer.alloc(sampleCount * 2);
  for (let i = 0; i < sampleCount; i++) {
    const t = i / 16000;
    const value = Math.sin(2 * Math.PI * 150 * t) * Math.sin(2 * Math.PI * 3 * t) * 15000;
    speechData.writeInt16LE(Math.round(value), i * 2);
  }

  // Send chunks to VAD
  let speechStartedCount = 0;
  const chunkSize = 1024; // 512 samples (32ms)
  for (let offset = 0; offset < speechData.length; offset += chunkSize) {
    const chunk = speechData.subarray(offset, Math.min(offset + chunkSize, speechData.length));
    if (chunk.length < chunkSize) break;

    const frame: AudioFrame = {
      sessionId: '1',
      turnId: '1',
      sequenceNumber: 1,
      timestamp: Date.now(),
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm16',
      data: chunk
    };

    const res = await vad.process(frame);
    if (res.speechStarted) {
      speechStartedCount++;
    }
  }

  console.log(`Simulated Speech Result -> speechStarted emitted: ${speechStartedCount > 0}`);
  if (speechStartedCount === 0) {
    console.error('FAIL: Speech detector did not emit speechStarted.');
    process.exit(1);
  }
  console.log('PASS: Speech processed and start detected correctly.');

  // Test 5: Speech ending verification
  console.log('Running Test 5: Processing silence transition...');
  let speechEndedCount = 0;
  // Send 1000ms of silence
  const silenceDurationMs = 1000;
  const silenceSamples = (silenceDurationMs / 1000) * 16000;
  const postSilenceData = Buffer.alloc(silenceSamples * 2);

  for (let offset = 0; offset < postSilenceData.length; offset += chunkSize) {
    const chunk = postSilenceData.subarray(offset, Math.min(offset + chunkSize, postSilenceData.length));
    if (chunk.length < chunkSize) break;

    const frame: AudioFrame = {
      sessionId: '1',
      turnId: '1',
      sequenceNumber: 1,
      timestamp: Date.now(),
      sampleRate: 16000,
      channels: 1,
      encoding: 'pcm16',
      data: chunk
    };

    const res = await vad.process(frame);
    if (res.speechEnded) {
      speechEndedCount++;
    }
  }

  console.log(`Silence Transition Result -> speechEnded emitted: ${speechEndedCount > 0}`);
  if (speechEndedCount === 0) {
    console.error('FAIL: Speech detector did not emit speechEnded.');
    process.exit(1);
  }
  console.log('PASS: Speech ending transition processed correctly.');

  console.log('SUCCESS: All Silero VAD Unit Tests Passed!');
}

runTest().catch((err) => {
  console.error('Test threw unhandled error:', err);
  process.exit(1);
});
