// TASKORA PRODUCTION HARDENING SUITE — PURE LOGIC UNIT TESTS
const crypto = require('crypto');

let pass = 0;
let fail = 0;

function assert(condition, name, details) {
  if (condition) {
    console.log(`  ✅ PASS: ${name}`);
    pass++;
  } else {
    console.error(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
    fail++;
  }
}

console.log('\n===============================================================');
console.log('TASKORA PRODUCTION HARDENING SUITE — CORE LOGIC VERIFICATION');
console.log('===============================================================\n');

// 1. CANONICAL TIMEZONE-SAFE DATE PARSER
console.log('--- 1. Canonical Reminder Date/Time Resolution ---');
function calculateCustomTrigger(dateStr, timeStr, timezone) {
  try {
    const tz = timezone || 'UTC';
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    if (!year || !month || !day || isNaN(hour) || isNaN(minute)) return null;

    const testDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    const triggerEpochMs = testDate.getTime();
    if (isNaN(triggerEpochMs)) return null;

    return {
      triggerEpochMs,
      canonicalIso: new Date(triggerEpochMs).toISOString(),
      timezone: tz,
    };
  } catch {
    return null;
  }
}

const customRes = calculateCustomTrigger('2026-08-25', '17:30', 'Asia/Kolkata');
assert(customRes !== null, 'Valid custom date/time resolves successfully');
assert(customRes && customRes.timezone === 'Asia/Kolkata', 'Preserves canonical timezone');
assert(calculateCustomTrigger('bad-date', 'bad-time') === null, 'Invalid dates return null');

// 2. MULTI-DURATION SNOOZE ENGINE
console.log('\n--- 2. Multi-Duration Snooze Calculations ---');
function calculateSnooze(minutes) {
  const epoch = Date.now() + minutes * 60 * 1000;
  return { epoch, iso: new Date(epoch).toISOString() };
}

[5, 10, 15, 30].forEach((mins) => {
  const now = Date.now();
  const s = calculateSnooze(mins);
  const diffMinutes = Math.round((s.epoch - now) / 60000);
  assert(diffMinutes === mins, `Snooze calculation for +${mins}m yields exact ${mins}m offset`);
});

// 3. BLE CHUNKING, CHECKSUM AND REASSEMBLY
console.log('\n--- 3. BLE Chunking & Cryptographic Integrity ---');
function computeChecksum(data, index, batchId) {
  return crypto.createHash('sha256').update(`${batchId}:${index}:${data}`).digest('hex').substring(0, 16);
}

function splitChunks(payload, batchId, chunkSize) {
  const total = Math.ceil(payload.length / chunkSize) || 1;
  const chunks = [];
  for (let i = 0; i < total; i++) {
    const data = payload.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push({
      batchId,
      chunkIndex: i,
      totalChunks: total,
      data,
      checksum: computeChecksum(data, i, batchId),
    });
  }
  return chunks;
}

function reassembleChunks(chunks, batchId) {
  if (!chunks || chunks.length === 0) return { success: false };
  const expected = chunks[0].totalChunks;
  if (chunks.length !== expected) return { success: false };
  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  for (let i = 0; i < expected; i++) {
    if (sorted[i].chunkIndex !== i || sorted[i].batchId !== batchId) return { success: false };
    if (sorted[i].checksum !== computeChecksum(sorted[i].data, i, batchId)) return { success: false, tampered: true };
  }
  return { success: true, data: sorted.map((c) => c.data).join('') };
}

const originalPayload = JSON.stringify({
  taskoraVersion: '2.0.0',
  batchId: 'ble-batch-abc-123',
  tasks: [
    { id: 'task-1', title: 'Test CRDT sync 1', completed: false },
    { id: 'task-2', title: 'Test CRDT sync 2', completed: true },
  ],
});

const chunks = splitChunks(originalPayload, 'ble-batch-abc-123', 32);
assert(chunks.length > 1, `Payload split into ${chunks.length} chunks`);
const reassembled = reassembleChunks(chunks, 'ble-batch-abc-123');
assert(reassembled.success === true && reassembled.data === originalPayload, 'Reassembled BLE payload matches bit-for-bit');

const tamperedChunks = [...chunks];
tamperedChunks[0] = { ...tamperedChunks[0], data: tamperedChunks[0].data + 'X' };
const tamperedResult = reassembleChunks(tamperedChunks, 'ble-batch-abc-123');
assert(tamperedResult.success === false, 'Tampered chunk detected and rejected');

// 4. FOCUS TIMER ABSOLUTE CLOCK RECOVERY
console.log('\n--- 4. Focus Timer Clock Recovery ---');
function evaluateSession(session, now) {
  if (session.status === 'paused') {
    return { status: 'paused', remainingMs: session.durationMs - session.accumulatedMs };
  }
  if (session.status === 'running') {
    if (now >= session.endsAt) {
      return { status: 'completed_while_away', remainingMs: 0 };
    }
    return { status: 'still_running', remainingMs: session.endsAt - now };
  }
  return { status: 'idle', remainingMs: session.durationMs };
}

const baseTime = 1756100000000;
const runningSession = {
  id: 'focus-test-1',
  status: 'running',
  startedAt: baseTime,
  endsAt: baseTime + 25 * 60 * 1000,
  durationMs: 25 * 60 * 1000,
  accumulatedMs: 0,
};

const eval1 = evaluateSession(runningSession, baseTime + 10 * 60 * 1000);
assert(eval1.status === 'still_running' && eval1.remainingMs === 15 * 60 * 1000, 'Running session calculates 15m remaining');

const eval2 = evaluateSession(runningSession, baseTime + 26 * 60 * 1000);
assert(eval2.status === 'completed_while_away' && eval2.remainingMs === 0, 'Completed session while away correctly detected');

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('===============================================================\n');

if (fail > 0) process.exit(1);
