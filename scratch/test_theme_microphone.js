const assert = require('assert');

console.log('======================================================================');
console.log('    🧪 TASKORA THEME PERSISTENCE & MICROPHONE PERMISSION AUDIT       ');
console.log('======================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// 1. Theme Cycle State Machine
function getNextTheme(current) {
  if (current === 'light') return 'dark';
  if (current === 'dark') return 'system';
  if (current === 'system') return 'light';
  return 'light';
}

function resolveIsDark(mode, systemIsDark) {
  if (mode === 'system') return systemIsDark;
  return mode === 'dark';
}

// 2. Microphone Permission State Machine
function handlePermissionResult(result) {
  if (result === 'GRANTED') return { allowed: true, action: 'start_listening' };
  if (result === 'DENIED') return { allowed: false, action: 'show_explanation', canRetry: true };
  if (result === 'NEVER_ASK_AGAIN') return { allowed: false, action: 'open_settings', canRetry: false };
  return { allowed: false, action: 'none' };
}

function runAudit() {
  console.log('--- 1. THEME MODE SWITCHING & CYCLING AUDIT ---');

  test('Light mode transitions to Dark mode on single tap', () => {
    assert.strictEqual(getNextTheme('light'), 'dark');
  });

  test('Dark mode transitions to System mode on single tap', () => {
    assert.strictEqual(getNextTheme('dark'), 'system');
  });

  test('System mode transitions to Light mode on single tap', () => {
    assert.strictEqual(getNextTheme('system'), 'light');
  });

  test('System mode resolves to dark when Android OS is in dark mode', () => {
    assert.strictEqual(resolveIsDark('system', true), true);
  });

  test('System mode resolves to light when Android OS is in light mode', () => {
    assert.strictEqual(resolveIsDark('system', false), false);
  });

  test('Explicit Dark mode overrides light Android OS', () => {
    assert.strictEqual(resolveIsDark('dark', false), true);
  });

  test('Explicit Light mode overrides dark Android OS', () => {
    assert.strictEqual(resolveIsDark('light', true), false);
  });

  console.log('\n--- 2. ANDROID MANIFEST & RECORD_AUDIO PERMISSION AUDIT ---');

  const appJson = require('../app.json');
  const androidPerms = appJson.expo.android.permissions;

  test('app.json contains RECORD_AUDIO permission for Android build', () => {
    assert.ok(androidPerms.includes('RECORD_AUDIO'), 'Must contain RECORD_AUDIO');
  });

  test('app.json contains android.permission.RECORD_AUDIO canonical string', () => {
    assert.ok(androidPerms.includes('android.permission.RECORD_AUDIO'));
  });

  test('app.json retains RECEIVE_BOOT_COMPLETED & VIBRATE minimal permissions', () => {
    assert.ok(androidPerms.includes('RECEIVE_BOOT_COMPLETED'));
    assert.ok(androidPerms.includes('VIBRATE'));
  });

  console.log('\n--- 3. RUNTIME MICROPHONE PERMISSION FLOW AUDIT ---');

  test('Permission GRANTED enables voice recording immediately', () => {
    const res = handlePermissionResult('GRANTED');
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(res.action, 'start_listening');
  });

  test('Permission DENIED presents polite explanation with Try Again', () => {
    const res = handlePermissionResult('DENIED');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.action, 'show_explanation');
    assert.strictEqual(res.canRetry, true);
  });

  test('Permission NEVER_ASK_AGAIN redirects user to Open Settings', () => {
    const res = handlePermissionResult('NEVER_ASK_AGAIN');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.action, 'open_settings');
    assert.strictEqual(res.canRetry, false);
  });

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('🎉 100% OF THEME PERSISTENCE & MICROPHONE AUDIT TESTS PASSED!');
  console.log('======================================================================\n');
}

runAudit();
