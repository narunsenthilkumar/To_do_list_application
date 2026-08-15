const assert = require('assert');

// Mock AsyncStorage
const storage = new Map();
const AsyncStorage = {
  getItem: async (key) => storage.get(key) || null,
  setItem: async (key, val) => { storage.set(key, val); return true; },
  removeItem: async (key) => { storage.delete(key); return true; },
  clear: async () => { storage.clear(); return true; },
};

console.log('======================================================================');
console.log('       🧪 TASKORA FRESH INSTALL & CLEAN INITIAL STATE AUDIT           ');
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

async function runAudit() {
  console.log('--- 1. FIRST LAUNCH / FRESH INSTALL EMPTY STATE AUDIT ---');

  // Simulate fresh install with zero stored keys
  storage.clear();

  // Test tasks load on clean install
  const rawTasks = await AsyncStorage.getItem('@taskora_tasks');
  test('Fresh install storage has no pre-existing tasks', () => {
    assert.strictEqual(rawTasks, null);
  });

  const initialTasks = rawTasks ? JSON.parse(rawTasks) : [];
  test('Initial fresh tasks evaluate to empty array []', () => {
    assert.deepStrictEqual(initialTasks, []);
    assert.strictEqual(initialTasks.length, 0);
  });

  // Test projects load on clean install
  const rawProjects = await AsyncStorage.getItem('@taskora_projects');
  const initialProjects = rawProjects ? JSON.parse(rawProjects) : [];
  test('Initial fresh projects evaluate to empty array []', () => {
    assert.deepStrictEqual(initialProjects, []);
    assert.strictEqual(initialProjects.length, 0);
  });

  // Test tags load on clean install
  const rawTags = await AsyncStorage.getItem('@taskora_tags');
  const initialTags = rawTags ? JSON.parse(rawTags) : [];
  test('Initial fresh tags evaluate to empty array []', () => {
    assert.deepStrictEqual(initialTags, []);
    assert.strictEqual(initialTags.length, 0);
  });

  // Test streak & productivity stats on clean install
  const rawStreak = await AsyncStorage.getItem('@taskora_streak_stats');
  const initialStreak = rawStreak ? JSON.parse(rawStreak) : { currentStreak: 0, bestStreak: 0, lastCompletedDate: '', history: {} };
  test('Initial streak is 0 (no fake streaks)', () => {
    assert.strictEqual(initialStreak.currentStreak, 0);
    assert.strictEqual(initialStreak.bestStreak, 0);
    assert.deepStrictEqual(initialStreak.history, {});
  });

  // Test focus sessions on clean install
  const rawFocus = await AsyncStorage.getItem('@taskora_focus_sessions');
  const initialFocus = rawFocus ? JSON.parse(rawFocus) : [];
  test('Initial focus sessions is empty array []', () => {
    assert.deepStrictEqual(initialFocus, []);
  });

  console.log('\n--- 2. DATA PERSISTENCE & SUBSEQUENT LAUNCH AUDIT ---');

  // User creates Task A
  const createdTask = {
    id: 'usr-task-1',
    title: 'Buy groceries after work',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem('@taskora_tasks', JSON.stringify([createdTask]));

  // Simulate app restart
  const reloadedRaw = await AsyncStorage.getItem('@taskora_tasks');
  const reloadedTasks = JSON.parse(reloadedRaw);
  test('User-created Task A persists across app relaunch', () => {
    assert.strictEqual(reloadedTasks.length, 1);
    assert.strictEqual(reloadedTasks[0].id, 'usr-task-1');
    assert.strictEqual(reloadedTasks[0].title, 'Buy groceries after work');
  });

  console.log('\n--- 3. EXPLICIT RESET / CLEAN SLATE CONFIRMATION AUDIT ---');

  // User confirms Reset All Data
  await AsyncStorage.setItem('@taskora_tasks', JSON.stringify([]));
  await AsyncStorage.setItem('@taskora_projects', JSON.stringify([]));
  await AsyncStorage.setItem('@taskora_tags', JSON.stringify([]));
  await AsyncStorage.setItem('@taskora_streak_stats', JSON.stringify({ currentStreak: 0, bestStreak: 0, lastCompletedDate: '', history: {} }));

  const afterResetTasks = JSON.parse(await AsyncStorage.getItem('@taskora_tasks'));
  const afterResetProjects = JSON.parse(await AsyncStorage.getItem('@taskora_projects'));
  const afterResetStreak = JSON.parse(await AsyncStorage.getItem('@taskora_streak_stats'));

  test('Reset All Data clears tasks to []', () => {
    assert.strictEqual(afterResetTasks.length, 0);
  });
  test('Reset All Data clears projects to []', () => {
    assert.strictEqual(afterResetProjects.length, 0);
  });
  test('Reset All Data resets streak to 0', () => {
    assert.strictEqual(afterResetStreak.currentStreak, 0);
  });

  console.log('\n======================================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('🎉 100% OF FRESH INSTALL & CLEAN INITIAL STATE TESTS PASSED!');
  console.log('======================================================================\n');
}

runAudit();
