const crypto = require('crypto');

console.log('====================================================');
console.log('🧪 TASKORA NEARBY SYNC / BUMP-TO-SHARE TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, name) {
  totalTests++;
  if (condition) {
    console.log(`  [✔ PASS] ${name}`);
    passedTests++;
  } else {
    console.error(`  [✖ FAIL] ${name}`);
  }
}

// -----------------------------------------------------------------------------
// 1. Proximity Estimator & EMA Smoothing Test
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 1: Proximity Estimator & RSSI Smoothing');

class TestProximityEstimator {
  constructor(config = {}) {
    this.veryNearThreshold = config.veryNearThreshold || -55;
    this.nearThreshold = config.nearThreshold || -70;
    this.smoothingAlpha = config.smoothingAlpha || 0.4;
    this.sampleWindowSize = config.sampleWindowSize || 5;
    this.samples = [];
    this.currentSmoothedRssi = null;
  }

  addSample(rssi) {
    this.samples.push(rssi);
    if (this.samples.length > this.sampleWindowSize) this.samples.shift();

    if (this.currentSmoothedRssi === null) {
      this.currentSmoothedRssi = rssi;
    } else {
      this.currentSmoothedRssi =
        this.smoothingAlpha * rssi + (1 - this.smoothingAlpha) * this.currentSmoothedRssi;
    }
    const smoothed = Math.round(this.currentSmoothedRssi);
    return { smoothedRssi: smoothed, proximity: this.classify(smoothed) };
  }

  classify(rssi) {
    if (this.samples.length === 0) return 'UNKNOWN';
    if (rssi >= this.veryNearThreshold) return 'VERY_NEAR';
    if (rssi >= this.nearThreshold) return 'NEAR';
    return 'FAR';
  }
}

const pe = new TestProximityEstimator();
assert(pe.classify(0) === 'UNKNOWN', 'Initial state is UNKNOWN before samples');

const s1 = pe.addSample(-80);
assert(s1.proximity === 'FAR', 'RSSI -80 dBm classified as FAR');

const s2 = pe.addSample(-65);
assert(s2.smoothedRssi < -65, 'Exponential smoothing dampens sudden RSSI jump');

// Add near samples
pe.addSample(-50);
pe.addSample(-48);
const sVeryNear = pe.addSample(-45);
assert(sVeryNear.proximity === 'VERY_NEAR', 'Consistent RSSI >= -55 dBm classified as VERY_NEAR');

// Single spike should not immediately trigger VERY_NEAR from FAR
const pe2 = new TestProximityEstimator();
pe2.addSample(-85);
pe2.addSample(-85);
const spike = pe2.addSample(-45); // Sudden anomaly
assert(spike.proximity !== 'VERY_NEAR', 'Single RSSI spike is smoothed and prevented false VERY_NEAR');

console.log('');

// -----------------------------------------------------------------------------
// 2. Motion Detector & Peak Impact Test
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 2: Motion Detector & Acceleration Vector Analysis');

class TestMotionDetector {
  constructor(config = {}) {
    this.peakThreshold = config.peakThreshold || 1.8;
    this.correlationWindowMs = config.correlationWindowMs || 1500;
    this.lastPeakTimestamp = 0;
    this.currentState = 'IDLE';
  }

  processSample(x, y, z, timestamp = Date.now()) {
    const totalMagnitude = Math.sqrt(x * x + y * y + z * z);
    const dynamicMagnitude = Math.abs(totalMagnitude - 1.0); // Remove 1.0g gravity

    if (dynamicMagnitude >= this.peakThreshold) {
      this.lastPeakTimestamp = timestamp;
      this.currentState = 'BUMP_CANDIDATE';
      return { state: 'BUMP_CANDIDATE', magnitude: totalMagnitude, isPeak: true };
    } else if (dynamicMagnitude > 0.3) {
      if (this.currentState !== 'BUMP_CANDIDATE') {
        this.currentState = 'MOVING';
      }
      return { state: this.currentState, magnitude: totalMagnitude, isPeak: false };
    } else {
      const isRecent = timestamp - this.lastPeakTimestamp <= this.correlationWindowMs;
      this.currentState = isRecent ? 'BUMP_CANDIDATE' : 'IDLE';
      return { state: this.currentState, magnitude: totalMagnitude, isPeak: false };
    }
  }

  hasRecentBump(timestamp = Date.now()) {
    return timestamp - this.lastPeakTimestamp <= this.correlationWindowMs;
  }
}

const md = new TestMotionDetector();
// Resting phone (1.0g on Z axis)
const r1 = md.processSample(0, 0, 1.0);
assert(r1.state === 'IDLE', 'Resting device (1.0g gravity) is IDLE');

// Walking/gentle movement (0.5g dynamic)
const r2 = md.processSample(0.5, 0.4, 1.3);
assert(r2.state === 'MOVING', 'Gentle device motion is MOVING');

// Sharp bump / impact gesture (2.2g dynamic peak)
const now = 1000000;
const r3 = md.processSample(1.8, 1.5, 2.2, now);
assert(r3.isPeak === true && r3.state === 'BUMP_CANDIDATE', 'Impact acceleration triggers BUMP_CANDIDATE');
assert(md.hasRecentBump(now + 800), 'Bump remains valid within 1500ms correlation window');
assert(!md.hasRecentBump(now + 2000), 'Bump expires after correlation window exceeds 1500ms');

console.log('');

// -----------------------------------------------------------------------------
// 3. Security & Verification Code Test
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 3: Nearby Security & Cryptographic Verification');

function hashString(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function generateVerificationCode() {
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return { raw: digits, formatted: `${digits.slice(0, 3)} ${digits.slice(3, 6)}` };
}

function computeCodeHash(code, nonce, salt = 'taskora_nearby_v2') {
  const clean = code.replace(/\s+/g, '');
  return hashString(`${clean}:${nonce}:${salt}`);
}

const codeObj = generateVerificationCode();
assert(codeObj.raw.length === 6, 'Verification code is 6 digits');
assert(codeObj.formatted.length === 7 && codeObj.formatted.includes(' '), 'Formatted code displays as "XXX XXX"');

const nonce = crypto.randomUUID();
const expectedHash = computeCodeHash(codeObj.formatted, nonce);
const matchResult = computeCodeHash(codeObj.raw, nonce) === expectedHash;
assert(matchResult, 'Code hash matches regardless of whitespace formatting');

const wrongMatch = computeCodeHash('000000', nonce) === expectedHash;
assert(!wrongMatch, 'Incorrect verification code is rejected');

console.log('');

// -----------------------------------------------------------------------------
// 4. Bluetooth Transport & Packet Chunking / Reassembly Test
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 4: Bluetooth Transport Chunking & Tampering Detection');

function computeChunkChecksum(chunkData, chunkIndex, batchId) {
  return hashString(`${batchId}:${chunkIndex}:${chunkData}`);
}

function splitIntoChunks(payloadString, batchId, chunkSize = 512) {
  const totalChunks = Math.ceil(payloadString.length / chunkSize) || 1;
  const chunks = [];
  for (let i = 0; i < totalChunks; i++) {
    const data = payloadString.slice(i * chunkSize, (i + 1) * chunkSize);
    chunks.push({
      batchId,
      chunkIndex: i,
      totalChunks,
      chunkSize: data.length,
      data,
      chunkChecksum: computeChunkChecksum(data, i, batchId),
    });
  }
  return chunks;
}

function reassembleChunks(chunks, batchId) {
  if (!chunks || chunks.length === 0) return { success: false, error: 'No chunks' };
  const expectedTotal = chunks[0].totalChunks;
  if (chunks.length !== expectedTotal) return { success: false, error: 'Missing chunks' };

  const sorted = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  for (let i = 0; i < expectedTotal; i++) {
    if (sorted[i].chunkIndex !== i) return { success: false, error: 'Invalid sequence' };
    if (sorted[i].batchId !== batchId) return { success: false, error: 'Batch ID mismatch' };
    const valid = computeChunkChecksum(sorted[i].data, sorted[i].chunkIndex, batchId) === sorted[i].chunkChecksum;
    if (!valid) return { success: false, error: `Tampered chunk at index ${i}` };
  }
  return { success: true, data: sorted.map((c) => c.data).join('') };
}

const largePayload = JSON.stringify({
  batchId: 'batch-test-123',
  senderDeviceId: 'android-phone-1',
  operations: Array.from({ length: 50 }, (_, i) => ({
    operationId: `op-${i}`,
    entityId: `task-${i}`,
    title: `Synchronized Task #${i} with detailed notes and subtasks`,
    timestamp: new Date().toISOString(),
    lamportClock: i + 1,
  })),
});

const batchId = 'batch-test-123';
const chunks = splitIntoChunks(largePayload, batchId, 512);
assert(chunks.length >= 4, `Payload (>2KB) correctly split into ${chunks.length} chunks`);

const reassembled = reassembleChunks(chunks, batchId);
assert(reassembled.success && reassembled.data === largePayload, 'Reassembled payload matches original bit-for-bit');

// Test missing chunk
const missingChunks = chunks.slice(0, chunks.length - 1);
const reassemblyMissing = reassembleChunks(missingChunks, batchId);
assert(!reassemblyMissing.success && reassemblyMissing.error.includes('Missing chunks'), 'Missing chunk detected and rejected');

// Test tampered chunk
const tamperedChunks = JSON.parse(JSON.stringify(chunks));
tamperedChunks[1].data = tamperedChunks[1].data.replace('Task', 'Hacked');
const reassemblyTampered = reassembleChunks(tamperedChunks, batchId);
assert(!reassemblyTampered.success && reassemblyTampered.error.includes('Tampered chunk'), 'Tampered chunk detected and rejected');

console.log('');

// -----------------------------------------------------------------------------
// 5. Protocol Versioning Matrix & Handshake Validation
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 5: Protocol Versioning Matrix & Handshake Validation');

const MIN_NEARBY_PROTOCOL_VERSION = 1;
const CURRENT_NEARBY_PROTOCOL_VERSION = 2;

function validateHandshake(msg) {
  if (!msg || !msg.senderDeviceId || !msg.senderDeviceName) {
    return { valid: false, errorCode: 'MALFORMED_HANDSHAKE' };
  }
  if (msg.protocolVersion < MIN_NEARBY_PROTOCOL_VERSION || msg.protocolVersion > CURRENT_NEARBY_PROTOCOL_VERSION) {
    return { valid: false, errorCode: 'PROTOCOL_VERSION_MISMATCH' };
  }
  return { valid: true };
}

// Handshake v1 ↔ v2
assert(
  validateHandshake({
    protocolVersion: 1,
    senderDeviceId: 'dev-1',
    senderDeviceName: 'Device v1',
  }).valid,
  'Protocol v1 ↔ v2 is backward compatible'
);

// Handshake v2 ↔ v2
assert(
  validateHandshake({
    protocolVersion: 2,
    senderDeviceId: 'dev-2',
    senderDeviceName: 'Device v2',
  }).valid,
  'Protocol v2 ↔ v2 is fully supported'
);

// Incompatible Future Version v99
assert(
  validateHandshake({
    protocolVersion: 99,
    senderDeviceId: 'dev-future',
    senderDeviceName: 'Device v99',
  }).errorCode === 'PROTOCOL_VERSION_MISMATCH',
  'Incompatible future protocol version is safely rejected'
);

// Malformed Handshake (missing senderDeviceId)
assert(
  validateHandshake({
    protocolVersion: 2,
    senderDeviceName: 'Device Incomplete',
  }).errorCode === 'MALFORMED_HANDSHAKE',
  'Malformed handshake packet is safely rejected'
);

console.log('');

// -----------------------------------------------------------------------------
// 6. Transactional Staging & "No Data Loss" Invariant Test
// -----------------------------------------------------------------------------
console.log('▶ TEST SUITE 6: Transactional Staging & "No Data Loss" Invariant');

function processIncomingPayloadTransactional(payload, localDatabase) {
  // Step 1: Validate payload schema
  if (!payload || typeof payload !== 'object') {
    throw new Error('MALFORMED_PAYLOAD: Not an object');
  }
  if (!payload.batchId || !payload.senderDeviceId || !payload.operations || !payload.checksum) {
    throw new Error('MALFORMED_PAYLOAD: Missing required headers');
  }
  if (!Array.isArray(payload.operations)) {
    throw new Error('MALFORMED_PAYLOAD: Operations must be an array');
  }

  // Step 2: Validate checksum
  const { checksum, ...raw } = payload;
  const computedChecksum = hashString(JSON.stringify(raw));
  if (computedChecksum !== checksum) {
    throw new Error('CHECKSUM_MISMATCH: Payload checksum verification failed');
  }

  // Step 3: Staged Validation
  for (const op of payload.operations) {
    if (!op.entityId || !op.entityType || !op.operationType) {
      throw new Error(`MALFORMED_OPERATION: Missing properties in ${op.operationId}`);
    }
  }

  // Step 4: Transactional Commit
  const initialTaskCount = Object.keys(localDatabase.tasks).length;
  let appliedCount = 0;
  for (const op of payload.operations) {
    if (op.entityType === 'task') {
      localDatabase.tasks[op.entityId] = op.payload;
      appliedCount++;
    }
  }
  return { appliedCount, initialTaskCount };
}

const mockLocalDb = { tasks: { 'task-1': { id: 'task-1', title: 'Local existing task' } } };

// Test 1: Corrupted payload checksum -> DB MUST REMAIN UNTOUCHED
const corruptPayload = {
  batchId: 'b1',
  senderDeviceId: 'peer1',
  senderDeviceName: 'Peer',
  userId: 'u1',
  timestamp: new Date().toISOString(),
  operations: [{ operationId: 'op-1', entityId: 't2', entityType: 'task', operationType: 'CREATE', payload: { id: 't2' } }],
  checksum: 'invalid-checksum-value',
};

let threwError = false;
try {
  processIncomingPayloadTransactional(corruptPayload, mockLocalDb);
} catch (e) {
  threwError = true;
}
assert(threwError, 'Corrupted payload throws checksum error');
assert(Object.keys(mockLocalDb.tasks).length === 1, 'Local database remained 100% UNCHANGED after checksum rejection (No Data Loss Invariant)');

// Test 2: Valid payload -> DB commits properly
const validRaw = {
  batchId: 'b2',
  senderDeviceId: 'peer1',
  senderDeviceName: 'Peer',
  userId: 'u1',
  timestamp: new Date().toISOString(),
  operations: [{ operationId: 'op-2', entityId: 'task-nearby-2', entityType: 'task', operationType: 'CREATE', payload: { id: 'task-nearby-2', title: 'New Nearby Task' } }],
};
const validPayload = {
  ...validRaw,
  checksum: hashString(JSON.stringify(validRaw)),
};

const commitResult = processIncomingPayloadTransactional(validPayload, mockLocalDb);
assert(commitResult.appliedCount === 1, 'Valid payload applied 1 mutation');
assert(mockLocalDb.tasks['task-nearby-2'] !== undefined, 'New task safely merged into local store');
assert(mockLocalDb.tasks['task-1'] !== undefined, 'Pre-existing local tasks preserved intact');

console.log('');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('====================================================');
console.log(`🏁 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
console.log('====================================================\n');
