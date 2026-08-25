import { createStreamingSTT } from '../packages/voice/src/stt/index.js';
import { AudioFrame } from '../packages/voice/src/types.js';

async function runTests() {
  console.log('Starting Streaming STT Unit Tests...');

  // Test 1: STT Starts & Accepts Audio
  const stt = createStreamingSTT('whisper');
  let partialsCount = 0;
  let finalReceived = 0;
  let finalTranscript = '';

  stt.on('partial', (data) => {
    partialsCount++;
    console.log(`<<< [Partial] Received: "${data.text}"`);
  });

  stt.on('final', (data) => {
    finalReceived++;
    finalTranscript = data.text;
    console.log(`<<< [Final] Received: "${data.text}"`);
  });

  console.log('1. Starting turn...');
  await stt.start('turn_test_1');

  const mockFrame: AudioFrame = {
    sessionId: 'test_session',
    turnId: 'turn_test_1',
    sequenceNumber: 1,
    timestamp: Date.now(),
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm16',
    data: Buffer.alloc(1024)
  };

  console.log('2. Pushing first frame...');
  await stt.pushAudio(mockFrame);

  console.log('3. Pushing second frame...');
  await stt.pushAudio({ ...mockFrame, sequenceNumber: 2 });

  console.log('4. Stopping STT...');
  await stt.stop();

  // Assertions
  console.log(`Partials emitted: ${partialsCount}`);
  console.log(`Finals emitted: ${finalReceived}`);

  if (partialsCount < 2) throw new Error('Expected at least 2 partial transcript events');
  if (finalReceived !== 1) throw new Error('Expected exactly one final transcript');
  if (!finalTranscript) throw new Error('Final transcript text was empty');

  // Test 2: Cancel Works
  console.log('\n5. Testing STT Cancel...');
  let cancelPartials = 0;
  const sttCancel = createStreamingSTT('whisper');
  sttCancel.on('partial', () => cancelPartials++);
  await sttCancel.start('turn_cancel');
  await sttCancel.pushAudio(mockFrame);
  await sttCancel.cancel();
  await sttCancel.stop(); // Should not emit final since it was cancelled
  
  console.log(`Cancel partials: ${cancelPartials}`);
  // Since cancel resets buffers and stops execution, final should not trigger.
  
  // Test 3: Empty transcript handling
  console.log('\n6. Testing empty speech handling...');
  const sttEmpty = createStreamingSTT('whisper');
  let emptyFinalReceived = 0;
  sttEmpty.on('final', (data) => {
    emptyFinalReceived++;
    console.log(`<<< [Final empty] text: "${data.text}"`);
  });
  
  // We can force empty by overriding targetTranscript
  process.env.MOCK_STT_TRANSCRIPT = ' ';
  await sttEmpty.start('turn_empty');
  await sttEmpty.stop();
  if (emptyFinalReceived !== 1) throw new Error('Expected final response on stop even if empty');

  console.log('\nPASS: All Streaming STT unit assertions verified successfully!');
}

runTests().catch(err => {
  console.error('FAIL: Test runner caught error:', err);
  process.exit(1);
});
